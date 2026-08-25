// Bulk menu import. Paste rate-card text; get back structured services.
//
//   POST /api/salon/menu/import
//   body: { text, gender?, mode?: "ai"|"rules", dryRun?: boolean, replace?: boolean }
//
//   dryRun  → parse only, return a preview (nothing written). Use to let the
//             owner review before committing.
//   replace → deactivate the salon's existing services before inserting.
//
// The "ai" mode uses Groq (openai/gpt-oss-120b) — deliberately NOT Claude — and
// falls back to the deterministic parser if Groq is unavailable.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { aiParseMenuText, parseMenuText } from "@/lib/menuParser";
import { sanitizeService, type MenuServiceRow } from "@/lib/salonMenuDb";

type CleanRow = Omit<MenuServiceRow, "sort_order" | "active">;

export async function POST(req: NextRequest) {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const body = (await req.json()) as {
      text?: string;
      gender?: "women" | "men" | "unisex";
      mode?: "ai" | "rules";
      dryRun?: boolean;
      replace?: boolean;
    };
    const text = (body.text ?? "").trim();
    if (text.length < 5) return NextResponse.json({ error: "Paste your menu text first" }, { status: 400 });

    const gender = body.gender ?? "unisex";
    const { services: parsed, source } =
      body.mode === "rules"
        ? { services: parseMenuText(text, gender), source: "rules" as const }
        : await aiParseMenuText(text, gender);

    // Validate + clean each parsed service; keep the good ones, report the rest.
    const rows: CleanRow[] = [];
    const skipped: string[] = [];
    const seen = new Set<string>();
    for (const s of parsed) {
      const r = sanitizeService(s as Record<string, unknown>, salonId);
      if ("error" in r) { skipped.push(`${(s as { name?: string }).name ?? "?"}: ${r.error}`); continue; }
      if (seen.has(r.row.slug)) continue; // de-dupe within the paste
      seen.add(r.row.slug);
      rows.push(r.row);
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No services could be read from that text", skipped, source }, { status: 422 });
    }

    // Preview only.
    if (body.dryRun) {
      return NextResponse.json({ preview: true, source, count: rows.length, services: rows, skipped });
    }

    const db = getServiceClient();

    if (body.replace) {
      await db.from("menu_services").update({ active: false }).eq("salon_id", salonId);
    }

    // Reuse existing ids for matching slugs so re-imports update in place.
    const { data: existing } = await db
      .from("menu_services")
      .select("id, slug")
      .eq("salon_id", salonId);
    const idBySlug = new Map((existing ?? []).map((e) => [e.slug as string, e.id as string]));

    const payload = rows.map((r, i) => ({
      ...r,
      id: idBySlug.get(r.slug as string) ?? `${salonId}:${r.slug}`,
      salon_id: salonId,
      active: true,
      sort_order: i,
    }));

    const { error } = await db.from("menu_services").upsert(payload, { onConflict: "id" });
    if (error) throw error;

    return NextResponse.json({ ok: true, source, saved: payload.length, skipped });
  } catch (err) {
    console.error("[salon/menu/import] error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
