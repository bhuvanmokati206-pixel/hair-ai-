import { Jimp } from "jimp";

export type GridPhoto = { base64: string; mediaType?: string };

// Combines up to 4 photos into a single 2x2 grid image.
// This runs entirely locally with Jimp — NO API call, NO cost.
// Purpose: send ONE combined image to a single-image vision model instead of
// 4 separate calls, cutting analysis cost to a quarter.
export async function buildPhotoGrid(
  photos: GridPhoto[],
  tileSize = 768
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const cols = 2;
  const W = tileSize * cols;
  const H = tileSize * cols;

  // Black canvas (cheap; black borders read fine for a vision model)
  const canvas = new Jimp({ width: W, height: H, color: 0x000000ff });

  const count = Math.min(photos.length, 4);
  for (let i = 0; i < count; i++) {
    const buf = Buffer.from(photos[i].base64, "base64");
    const tile = await Jimp.read(buf);

    // Fit the photo INSIDE the tile preserving its aspect ratio, then centre it on
    // the black tile. Squishing every photo to a square (the old behaviour) warped
    // head/hair proportions, so the model misjudged length and texture. Letterboxing
    // keeps proportions true; 768px tiles give it enough detail to read texture.
    const scale = Math.min(tileSize / tile.bitmap.width, tileSize / tile.bitmap.height);
    tile.resize({ w: Math.round(tile.bitmap.width * scale), h: Math.round(tile.bitmap.height * scale) });
    const x = (i % cols) * tileSize + Math.round((tileSize - tile.bitmap.width) / 2);
    const y = Math.floor(i / cols) * tileSize + Math.round((tileSize - tile.bitmap.height) / 2);
    canvas.composite(tile, x, y);
  }

  const out = await canvas.getBuffer("image/jpeg");
  return { base64: out.toString("base64"), mediaType: "image/jpeg" };
}
