/**
 * Run: node test-api.mjs
 * Make sure `npm run dev` is running first on port 3000.
 *
 * Uses a free sample portrait photo to test the full Claude hair analysis pipeline.
 */

import https from "https";

// Free-use portrait photo from Unsplash (man with visible hair)
const SAMPLE_IMAGE_URL =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80";

async function fetchImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      res.on("error", reject);
    });
  });
}

async function main() {
  console.log("⏳ Fetching sample portrait image…");
  const base64 = await fetchImageAsBase64(SAMPLE_IMAGE_URL);
  console.log(`✓ Image loaded (${Math.round(base64.length / 1024)} KB base64)\n`);

  const payload = {
    photos: [
      {
        base64,
        mediaType: "image/jpeg",
        label: "front",
      },
    ],
  };

  console.log("📡 Calling /api/analyze-hair (Claude claude-opus-4-8 vision)…\n");

  const res = await fetch("http://localhost:3000/api/analyze-hair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ API error:", data.error);
    process.exit(1);
  }

  const { analysis } = data;

  console.log("═══════════════════════════════════════");
  console.log("✅  HAIR ANALYSIS RESULT");
  console.log("═══════════════════════════════════════");
  console.log(`Hair Length   : ${analysis.hairLength}`);
  console.log(`Hair Density  : ${analysis.hairDensity}`);
  console.log(`Hair Texture  : ${analysis.hairTexture}`);
  console.log(`Hair Color    : ${analysis.hairColor}`);
  console.log(`Face Shape    : ${analysis.faceShape}`);
  console.log(`Current Style : ${analysis.currentStyle}`);
  console.log("");
  console.log(`Feasible Styles (${analysis.feasibleStyles.length}):`);
  analysis.feasibleStyles.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log("");
  console.log(`⭐ Best Match  : ${analysis.bestMatch}`);
  console.log(`   Reason      : ${analysis.bestMatchReason}`);
  console.log("");
  console.log(`💡 Styling Tips: ${analysis.stylingTips}`);
  console.log("═══════════════════════════════════════");
}

main().catch(console.error);
