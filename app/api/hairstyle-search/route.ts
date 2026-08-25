// GET /api/hairstyle-search?q=… — live web image search for hairstyle references.
//
// Needs a search-provider key. Supports SerpAPI (SERPAPI_KEY) — Google Images in
// one REST call, ~100 free/month. Without a key it returns configured:false so
// the UI falls back to the upload path instead of erroring.
//
// Note: results are third-party copyrighted images. Fine as on-screen references
// for a barber/customer to discuss; be mindful about deriving stored outputs.

import { NextRequest, NextResponse } from "next/server";

export type SearchImage = { url: string; thumb: string; source: string };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const key = process.env.SERPAPI_KEY;
  if (!key) {
    // Not an error — the board still works via uploads. Tell the UI to hide search.
    return NextResponse.json({ configured: false, images: [] });
  }

  try {
    // Bias the query toward clean, usable reference shots.
    const query = `${q} hairstyle`;
    const url = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&num=24&api_key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) {
      console.error("[hairstyle-search] provider error:", res.status);
      return NextResponse.json({ configured: true, images: [], error: "Search failed" }, { status: 502 });
    }

    const data = await res.json();
    const images: SearchImage[] = (data.images_results ?? [])
      .filter((r: { original?: string; thumbnail?: string }) => r.original && r.thumbnail)
      .slice(0, 24)
      .map((r: { original: string; thumbnail: string; source?: string }) => ({
        url: r.original,
        thumb: r.thumbnail,
        source: r.source ?? "",
      }));

    return NextResponse.json({ configured: true, images });
  } catch (err) {
    console.error("[hairstyle-search] error:", err);
    return NextResponse.json({ configured: true, images: [], error: "Search failed" }, { status: 500 });
  }
}
