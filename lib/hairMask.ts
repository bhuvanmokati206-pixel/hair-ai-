import Replicate from "replicate";

// schananas/grounded_sam — Grounding DINO + SAM, text-prompted segmentation.
// Confirmed via direct testing: keep negative_mask_prompt minimal ("face").
// A long negative list (face,skin,ears,neck,background,clothing...) causes
// the model to over-subtract and the hair mask comes back nearly blank.
const MASK_MODEL_VERSION =
  "schananas/grounded_sam:ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c";

export type HairMaskResult = {
  maskBase64: string;
  maskMediaType: "image/jpeg";
};

// Returns a black/white mask (white = hair) for the given face photo.
// adjustmentFactor: negative erodes the mask inward (shrinks it, safer —
// leaves a thin margin of real hair pixels untouched), positive dilates it
// (grows it, catches more flyaways but risks eating into skin/forehead).
export async function getHairMask(
  replicate: Replicate,
  photoBase64: string,
  photoMediaType: string,
  adjustmentFactor = 0
): Promise<HairMaskResult> {
  const output = (await replicate.run(MASK_MODEL_VERSION, {
    input: {
      image: `data:${photoMediaType};base64,${photoBase64}`,
      mask_prompt: "hair",
      negative_mask_prompt: "face",
      adjustment_factor: adjustmentFactor,
    },
  })) as string[];

  // Output order: [annotated_mask, neg_annotated_mask, mask, inverted_mask]
  const maskUrl = output?.[2];
  if (!maskUrl) {
    throw new Error("Hair mask generation failed — no mask URL returned.");
  }

  const res = await fetch(maskUrl);
  if (!res.ok) {
    throw new Error("Failed to fetch generated hair mask.");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { maskBase64: buffer.toString("base64"), maskMediaType: "image/jpeg" };
}
