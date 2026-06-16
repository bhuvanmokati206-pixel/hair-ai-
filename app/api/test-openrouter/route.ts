import { NextResponse } from "next/server";

// Sanity checks for the configured AI backends:
//  - /api/test-openrouter        → tests Groq vision (analysis)
//  - /api/test-openrouter?hf=1   → tests Hugging Face text-to-image (previews)
export async function GET(req: Request) {
  const url = new URL(req.url);

  if (url.searchParams.get("hf") === "1") {
    const key = process.env.HF_API_KEY;
    if (!key || key.includes("PASTE")) {
      return NextResponse.json({ error: "HF_API_KEY not set in .env.local" }, { status: 400 });
    }
    const model = process.env.HF_MODEL || "black-forest-labs/FLUX.1-schnell";
    try {
      const res = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "image/png" },
        body: JSON.stringify({ inputs: "professional studio portrait of a male model, short fade haircut" }),
        signal: AbortSignal.timeout(60000),
      });
      if (res.ok) {
        const bytes = (await res.arrayBuffer()).byteLength;
        return NextResponse.json({ ok: true, model, imageBytes: bytes, keyPrefix: key.slice(0, 6) + "..." });
      }
      const body = await res.text();
      return NextResponse.json({ ok: false, status: res.status, model, body: body.slice(0, 400) });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // Default: test Groq vision model
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "GROQ_API_KEY not set in .env.local" }, { status: 400 });
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: "Reply with one word: working" }],
        max_tokens: 10,
      }),
    });
    const body = await res.json();
    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      reply: body.choices?.[0]?.message?.content ?? null,
      keyPrefix: key.slice(0, 10) + "...",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
