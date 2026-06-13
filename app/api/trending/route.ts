import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  // Return cached result if fresh
  const { data: cached } = await supabase
    .from("trending_cache")
    .select("styles_json, fetched_at")
    .eq("date", today)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ styles: cached.styles_json });
    }
  }

  // Fetch fresh from Gemini
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Today is ${today}. List the top 8 trending men's hairstyles right now in India and globally for 2025.
For each style return a JSON array with objects: { "name": string, "description": string, "why": string }
Return ONLY the JSON array, no markdown, no extra text.`,
        }],
      }],
      config: { responseMimeType: "application/json", temperature: 0.4 },
    });

    const text = response.text?.trim() ?? "[]";
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const styles = JSON.parse(cleaned);

    // Cache it
    await supabase.from("trending_cache").upsert({
      date: today,
      styles_json: styles,
      fetched_at: new Date().toISOString(),
    });

    return NextResponse.json({ styles });
  } catch (err) {
    console.error("Trending fetch error:", err);
    // Return stale cache if available
    if (cached) return NextResponse.json({ styles: cached.styles_json });
    return NextResponse.json({ styles: [] });
  }
}
