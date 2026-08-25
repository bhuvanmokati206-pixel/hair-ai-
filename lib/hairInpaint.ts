import Replicate from "replicate";

// FLUX Fill Pro: professional inpainting — only modifies pixels where mask is white.
// Black pixels in the mask are preserved exactly as in the original image.
// Cost: ~$0.05/megapixel → ~$0.03 per 768px image call.
const INPAINT_MODEL = "black-forest-labs/flux-fill-pro";

export type InpaintResult = {
  imageBase64: string;
  imageMediaType: "image/jpeg";
};

// Sends the original photo + hair mask + style prompt to FLUX Fill Pro.
// Returns the inpainted image as a base64 buffer.
// The model handles face/body preservation in the black-masked regions;
// applyFaceLock() in faceLock.ts then guarantees it at the pixel level.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function inpaintHair(
  replicate: Replicate,
  photoBase64: string,
  photoMediaType: string,
  maskBase64: string,
  prompt: string
): Promise<InpaintResult> {
  const imageUri = `data:${photoMediaType};base64,${photoBase64}`;
  const maskUri = `data:image/jpeg;base64,${maskBase64}`;

  let output: { url: () => string } | undefined;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      output = await replicate.run(INPAINT_MODEL, {
        input: {
          image: imageUri,
          mask: maskUri,
          prompt,
          steps: 40,
          guidance: 50,          // lower = more natural variation, less plastic look
          output_format: "jpg",
          output_quality: 90,
          prompt_upsampling: false, // upsampling over-stylises hair into wig-like texture
          safety_tolerance: 5,
        },
      }) as { url: () => string };
      break; // success
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429 && attempt < 4) {
        // parse retry_after from error message, fall back to 12s
        const msg = String(err);
        const match = msg.match(/resets in ~?(\d+)s/);
        const waitMs = match ? (parseInt(match[1]) + 2) * 1000 : 12000;
        console.log(`[hairInpaint] 429 rate limit — waiting ${waitMs}ms before retry ${attempt + 1}/4`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }

  const imageUrl = output?.url?.();
  if (!output || !imageUrl) {
    throw new Error("Inpainting failed — no image URL returned after retries.");
  }

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Failed to fetch inpainted image.");
  const buffer = Buffer.from(await res.arrayBuffer());
  return { imageBase64: buffer.toString("base64"), imageMediaType: "image/jpeg" };
}
