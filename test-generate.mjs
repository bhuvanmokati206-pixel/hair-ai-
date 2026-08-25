/**
 * Batch hairstyle generation test
 *
 * 1. Save one of your customer photos as test-photo.jpg in this folder
 * 2. Make sure npm run dev is running
 * 3. Run: node test-generate.mjs
 *
 * This will generate all 5 hairstyles and save them as PNG files.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PHOTO_PATH = "./test-photo.jpg";
const BASE_URL = "http://localhost:3000";

const HAIRSTYLES = [
  {
    name: "Modern Textured Quiff",
    prompt: "mid fade on sides, 3-4 inches textured quiff on top, natural wavy texture",
  },
  {
    name: "French Crop with Low Fade",
    prompt: "french crop with straight fringe, low skin fade on sides, clean finish",
  },
  {
    name: "Side Part Taper Fade",
    prompt: "deep side part, longer wavy hair on top combed to side, taper fade on sides",
  },
  {
    name: "Slick Back Undercut",
    prompt: "undercut with buzzed sides, thick hair slicked straight back on top",
  },
  {
    name: "Messy Textured Crop",
    prompt: "layered textured crop, matte finish, tousled messy look on top, faded sides",
  },
];

async function loadPhoto() {
  if (!existsSync(PHOTO_PATH)) {
    console.error(`❌ Photo not found at ${PHOTO_PATH}`);
    console.error("   Save your customer photo as test-photo.jpg in the hair-ai folder");
    process.exit(1);
  }
  const buffer = readFileSync(PHOTO_PATH);
  return buffer.toString("base64");
}

async function generateStyle(base64, styleName, prompt) {
  const res = await fetch(`${BASE_URL}/api/generate-hairstyle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: base64,
      styleName: `${styleName}: ${prompt}`,
      hairColor: "natural jet black",
      hairTexture: "wavy",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Generation failed");
  return data.imageUrl;
}

async function downloadImage(url, filename) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(filename, buffer);
  return filename;
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  HAIR AI — Batch Hairstyle Generation Test");
  console.log("═══════════════════════════════════════════════\n");

  console.log("📸 Loading customer photo…");
  const base64 = await loadPhoto();
  console.log(`✓ Photo loaded (${Math.round(base64.length / 1024)} KB)\n`);

  const results = [];

  for (let i = 0; i < HAIRSTYLES.length; i++) {
    const style = HAIRSTYLES[i];
    process.stdout.write(`⏳ [${i + 1}/${HAIRSTYLES.length}] Generating "${style.name}"… `);

    const start = Date.now();
    try {
      const imageUrl = await generateStyle(base64, style.name, style.prompt);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      // Download the generated image
      const filename = `./generated-${i + 1}-${style.name.toLowerCase().replace(/\s+/g, "-")}.png`;
      await downloadImage(imageUrl, filename);

      console.log(`✓ done in ${elapsed}s → ${filename}`);
      results.push({ style: style.name, file: filename, url: imageUrl, success: true });
    } catch (err) {
      console.log(`❌ failed: ${err.message}`);
      results.push({ style: style.name, success: false, error: err.message });
    }
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  RESULTS");
  console.log("═══════════════════════════════════════════════");

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n✅ Generated: ${succeeded.length}/${HAIRSTYLES.length} styles`);
  succeeded.forEach((r) => console.log(`   • ${r.style} → ${r.file}`));

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length} styles`);
    failed.forEach((r) => console.log(`   • ${r.style}: ${r.error}`));
  }

  // Generate an HTML preview file to view all results in browser
  if (succeeded.length > 0) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hair AI — Generated Hairstyles</title>
  <style>
    body { background: #111; color: #fff; font-family: sans-serif; padding: 2rem; }
    h1 { text-align: center; background: linear-gradient(to right, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
    .card { background: #1f1f1f; border-radius: 1rem; overflow: hidden; border: 1px solid #333; }
    .card img { width: 100%; aspect-ratio: 1; object-fit: cover; }
    .card p { padding: 0.75rem 1rem; font-size: 0.9rem; color: #ccc; text-align: center; }
    .original { border: 2px solid #a855f7; }
    .original p { color: #a855f7; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Hair AI — Generated Hairstyles</h1>
  <div class="grid">
    <div class="card original">
      <img src="./test-photo.jpg" alt="Original">
      <p>Original Photo</p>
    </div>
    ${succeeded.map((r) => `
    <div class="card">
      <img src="${r.url}" alt="${r.style}">
      <p>${r.style}</p>
    </div>`).join("")}
  </div>
</body>
</html>`;

    writeFileSync("./hair-results.html", html);
    console.log("\n🌐 Preview saved → open hair-results.html in your browser");
  }

  console.log("\n═══════════════════════════════════════════════");
}

main().catch(console.error);
