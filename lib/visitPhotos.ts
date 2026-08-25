// Persists visit photos to Supabase Storage and records them in visit_photos.
//
// Generated images arrive from the API routes as base64 data URIs — roughly
// 160 KB raw / 220 KB base64 each. Four angles per visit would put ~880 KB of
// text in one Postgres row, so the bytes go to Storage and only the path is
// stored in the database. WhatsApp media sends also need a real URL, not base64.
//
// Server-side only: uses the service client.

import { getServiceClient } from "./supabase";

export const VISIT_PHOTOS_BUCKET = "visit-photos";

export type PhotoKind = "original" | "generated";
export type PhotoAngle = "front" | "left" | "right" | "back";
export type PhotoService = "haircut" | "beard";

export type VisitPhotoInput = {
  /** Data URI ("data:image/jpeg;base64,…") or a bare base64 string. */
  image: string;
  kind: PhotoKind;
  angle?: PhotoAngle;
  serviceType?: PhotoService;
  styleName?: string;
  /** The single image the 45-day WhatsApp message shows. One per visit. */
  isHero?: boolean;
};

export type SavedVisitPhoto = {
  id: string;
  storagePath: string;
  url: string | null;
  kind: PhotoKind;
  angle: PhotoAngle | null;
  isHero: boolean;
};

// [\s\S] rather than the /s flag — tsconfig targets below es2018.
const DATA_URI = /^data:([^;,]+);base64,([\s\S]*)$/;

function decodeImage(image: string): { buffer: Buffer; contentType: string; ext: string } {
  const match = image.match(DATA_URI);
  const contentType = match?.[1] ?? "image/jpeg";
  const base64 = match?.[2] ?? image;

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) throw new Error("Image decoded to zero bytes");

  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return { buffer, contentType, ext };
}

/**
 * Creates the storage bucket if it does not exist. Safe to call repeatedly —
 * a bucket that already exists is not an error.
 */
export async function ensureBucket(): Promise<void> {
  const db = getServiceClient();
  const { data: buckets, error } = await db.storage.listBuckets();
  if (error) throw error;

  if (buckets?.some((b) => b.name === VISIT_PHOTOS_BUCKET)) return;

  const { error: createErr } = await db.storage.createBucket(VISIT_PHOTOS_BUCKET, {
    public: true, // WhatsApp media templates need a publicly fetchable URL
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (createErr) throw createErr;
}

/** "Textured Crop" -> "textured-crop". Keeps filenames readable and shell-safe. */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "style";
}

/**
 * Filename-safe date-time stamp, e.g. "20260817-143512" (server time).
 * Added to every stored path so re-scanning a customer keeps a dated history
 * instead of overwriting the previous photo. The DB created_at stays authoritative
 * for exact ordering; this is the human-readable date+time on the file itself.
 */
function dateStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Resolves the salon a visit belongs to, so photos land in that salon's folder.
 * Falls back to the salon's uuid if no code has been generated yet.
 */
async function getSalonFolder(visitId: string): Promise<string> {
  const db = getServiceClient();
  const { data } = await db
    .from("visits")
    .select("salon_id, salons(code)")
    .eq("id", visitId)
    .maybeSingle();

  const salon = data?.salons as unknown as { code: string | null } | null;
  return salon?.code || data?.salon_id || "unassigned";
}

/**
 * Uploads one image and inserts its visit_photos row.
 *
 * Path shape:
 *   <SALON-CODE>/<visit-id>/original-front.jpg
 *   <SALON-CODE>/<visit-id>/textured-crop-front.jpg
 *
 * Salon-scoped so each salon's images stay in their own folder, and named after
 * the style rather than a timestamp so a visit folder reads as a before/after
 * set you can eyeball or script against.
 *
 * Each path carries a date-time stamp, so re-scanning a customer keeps every
 * attempt as a dated history instead of overwriting the previous one.
 */
export async function saveVisitPhoto(
  visitId: string,
  input: VisitPhotoInput
): Promise<SavedVisitPhoto> {
  const db = getServiceClient();
  const { buffer, contentType, ext } = decodeImage(input.image);

  const folder = await getSalonFolder(visitId);
  const name = input.kind === "original" ? "original" : slug(input.styleName ?? input.serviceType ?? "generated");
  const angle = input.angle ?? "front";
  const storagePath = `${folder}/${visitId}/${name}-${angle}-${dateStamp()}.${ext}`;

  const { error: uploadErr } = await db.storage
    .from(VISIT_PHOTOS_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (uploadErr) throw uploadErr;

  const { data: pub } = db.storage.from(VISIT_PHOTOS_BUCKET).getPublicUrl(storagePath);
  const url = pub?.publicUrl ?? null;

  const { data, error } = await db
    .from("visit_photos")
    .insert({
      visit_id:     visitId,
      kind:         input.kind,
      angle:        input.angle ?? null,
      service_type: input.serviceType ?? null,
      style_name:   input.styleName ?? null,
      storage_path: storagePath,
      url,
      is_hero:      input.isHero ?? false,
    })
    .select("id, storage_path, url, kind, angle, is_hero")
    .single();

  if (error) {
    // Do not leave an orphaned object behind if the row insert fails.
    await db.storage.from(VISIT_PHOTOS_BUCKET).remove([storagePath]);
    throw error;
  }

  return {
    id:          data.id,
    storagePath: data.storage_path,
    url:         data.url,
    kind:        data.kind,
    angle:       data.angle,
    isHero:      data.is_hero,
  };
}

/**
 * Uploads several images for one visit. Runs sequentially rather than in
 * parallel: a four-angle set is ~4 MB and concurrent uploads of that size
 * regularly time out on slow salon connections.
 *
 * A single failed image does not sink the batch — it is logged and skipped, so
 * a partial set still gets saved.
 */
export async function saveVisitPhotos(
  visitId: string,
  inputs: VisitPhotoInput[]
): Promise<SavedVisitPhoto[]> {
  const saved: SavedVisitPhoto[] = [];
  for (const input of inputs) {
    try {
      saved.push(await saveVisitPhoto(visitId, input));
    } catch (err) {
      console.error(`[visitPhotos] ${input.kind}/${input.angle ?? "-"} failed:`, err);
    }
  }
  return saved;
}

/**
 * Marks one photo as the visit's hero image, clearing any previous one.
 * visit_photos has a partial unique index on (visit_id) where is_hero, so the
 * clear must happen before the set.
 */
export async function setHeroPhoto(visitId: string, photoId: string): Promise<void> {
  const db = getServiceClient();

  const { error: clearErr } = await db
    .from("visit_photos")
    .update({ is_hero: false })
    .eq("visit_id", visitId)
    .eq("is_hero", true);
  if (clearErr) throw clearErr;

  const { error } = await db
    .from("visit_photos")
    .update({ is_hero: true })
    .eq("id", photoId)
    .eq("visit_id", visitId);
  if (error) throw error;
}

/** All photos for a visit, hero first. */
export async function getVisitPhotos(visitId: string) {
  const db = getServiceClient();
  const { data, error } = await db
    .from("visit_photos")
    .select("id, kind, angle, service_type, style_name, storage_path, url, is_hero, created_at")
    .eq("visit_id", visitId)
    .order("is_hero", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * The image the rebooking message should show: the visit's hero, falling back to
 * any generated front view.
 */
export async function getHeroPhotoUrl(visitId: string): Promise<string | null> {
  const photos = await getVisitPhotos(visitId);
  const hero = photos.find((p) => p.is_hero);
  if (hero?.url) return hero.url;

  const front = photos.find((p) => p.kind === "generated" && p.angle === "front");
  return front?.url ?? photos.find((p) => p.kind === "generated")?.url ?? null;
}
