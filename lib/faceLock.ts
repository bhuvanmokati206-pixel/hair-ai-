import { Jimp } from "jimp";

// Two-pass separable box blur on the mask's grayscale channel.
// Blurring the mask creates a soft gradient at the hair/face boundary
// instead of a hard cut, so the face-lock blend feathers naturally.
// radius: how many pixels wide the transition zone is (4 = ~8px soft edge).
function blurMaskChannel(
  data: Uint8Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  const n = width * height;
  const temp = new Float32Array(n);
  const out  = new Float32Array(n);

  // Horizontal pass — read red channel (index 0 of each RGBA group)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < width) {
          sum += data[(y * width + nx) * 4];
          count++;
        }
      }
      temp[y * width + x] = sum / count;
    }
  }

  // Vertical pass — read from temp
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < height) {
          sum += temp[ny * width + x];
          count++;
        }
      }
      out[y * width + x] = sum / count;
    }
  }

  return out; // values 0–255 as floats
}

// Blends the original and inpainted images using the hair mask.
//
// Hard interior (mask = white):  100% inpainted  → new hairstyle
// Soft edge (blurred boundary):  gradual mix     → feathered seam
// Hard exterior (mask = black):  100% original   → face/body pixel-locked
//
// featherRadius: box-blur radius on the mask edge in pixels (default 4).
export async function applyFaceLock(
  originalBuffer: Buffer,
  inpaintedBuffer: Buffer,
  maskBuffer: Buffer,
  featherRadius = 4
): Promise<Buffer> {
  const [original, inpainted, mask] = await Promise.all([
    Jimp.read(originalBuffer),
    Jimp.read(inpaintedBuffer),
    Jimp.read(maskBuffer),
  ]);

  const w = original.bitmap.width;
  const h = original.bitmap.height;
  mask.resize({ w, h });
  inpainted.resize({ w, h });

  // Blur the mask to build a soft alpha channel
  const softMask = blurMaskChannel(mask.bitmap.data as unknown as Uint8Array, w, h, featherRadius);

  const origData  = original.bitmap.data  as unknown as Uint8Array;
  const inpData   = inpainted.bitmap.data as unknown as Uint8Array;

  for (let i = 0; i < w * h; i++) {
    const alpha = softMask[i] / 255; // 0.0 (fully original) → 1.0 (fully inpainted)
    const px = i * 4;

    // Alpha-blend each channel: result = original*(1-α) + inpainted*α
    inpData[px]     = Math.round(origData[px]     * (1 - alpha) + inpData[px]     * alpha);
    inpData[px + 1] = Math.round(origData[px + 1] * (1 - alpha) + inpData[px + 1] * alpha);
    inpData[px + 2] = Math.round(origData[px + 2] * (1 - alpha) + inpData[px + 2] * alpha);
    // alpha channel (px+3) left unchanged
  }

  return inpainted.getBuffer("image/jpeg");
}
