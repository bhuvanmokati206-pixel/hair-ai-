/**
 * Direct-to-Storage Client Uploader
 * 
 * Uploads uncompressed full-resolution photos directly to Supabase Storage
 * via short-lived signed URLs, bypassing Vercel's 4.5MB Serverless Function payload limit.
 * 
 * Fully non-invasive: returns null on any network failure, allowing safe fallback to base64.
 */

export type DirectUploadResult = {
  url: string;
  path: string;
  label: string;
};

export async function uploadPhotoDirect(
  photo: { base64?: string; blob?: Blob; mediaType?: string; label: string },
  visitId?: string
): Promise<DirectUploadResult | null> {
  try {
    const ext = photo.mediaType?.includes("png") ? "png" : "jpg";
    const res = await fetch("/api/storage/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitId: visitId || "scan", angle: photo.label, ext }),
    });

    if (!res.ok) return null;
    const { signedUrl, path } = await res.json();
    if (!signedUrl) return null;

    let body: BodyInit;
    if (photo.blob) {
      body = photo.blob;
    } else if (photo.base64) {
      const clean = photo.base64.includes(";base64,") ? photo.base64.split(";base64,")[1] : photo.base64;
      const byteChars = atob(clean);
      const byteNums = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      body = byteNums;
    } else {
      return null;
    }

    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": photo.mediaType || "image/jpeg" },
      body,
    });

    if (!uploadRes.ok) return null;

    return { url: signedUrl, path, label: photo.label };
  } catch (err) {
    console.warn(`[directUpload] fallback for ${photo.label}:`, err);
    return null;
  }
}

/**
 * Uploads multiple photos concurrently directly to Supabase Storage.
 * Returns array of successful uploads.
 */
export async function uploadPhotosDirectBatch(
  photos: { base64?: string; blob?: Blob; mediaType?: string; label: string }[],
  visitId?: string
): Promise<DirectUploadResult[]> {
  const results = await Promise.all(
    photos.map((p) => uploadPhotoDirect(p, visitId))
  );
  return results.filter((r): r is DirectUploadResult => Boolean(r));
}
