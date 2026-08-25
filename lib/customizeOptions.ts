// Placeholder preview thumbnails — swap for licensed/generated photos later.
function thumb(seed: string): string {
  return `https://picsum.photos/seed/${seed}/200/240`;
}

export type Option = { id: string; label: string; thumb?: string };

export const TOP_STYLES: Option[] = [
  { id: "textured-crop", label: "Textured Crop", thumb: thumb("top-textured-crop") },
  { id: "quiff", label: "Quiff", thumb: thumb("top-quiff") },
  { id: "pompadour", label: "Pompadour", thumb: thumb("top-pompadour") },
  { id: "messy", label: "Messy", thumb: thumb("top-messy") },
  { id: "curly", label: "Curly", thumb: thumb("top-curly") },
  { id: "fringe", label: "Fringe", thumb: thumb("top-fringe") },
  { id: "buzz-cut", label: "Buzz Cut", thumb: thumb("top-buzz-cut") },
  { id: "crew-cut", label: "Crew Cut", thumb: thumb("top-crew-cut") },
  { id: "french-crop", label: "French Crop", thumb: thumb("top-french-crop") },
  { id: "wolf-cut", label: "Wolf Cut", thumb: thumb("top-wolf-cut") },
];

export const LENGTHS = ["Very Short", "Short", "Medium", "Long", "Very Long"];

export const FADE_STYLES: Option[] = [
  { id: "no-fade", label: "No Fade", thumb: thumb("side-no-fade") },
  { id: "low-fade", label: "Low Fade", thumb: thumb("side-low-fade") },
  { id: "mid-fade", label: "Mid Fade", thumb: thumb("side-mid-fade") },
  { id: "high-fade", label: "High Fade", thumb: thumb("side-high-fade") },
  { id: "deep-fade", label: "Deep Fade", thumb: thumb("side-deep-fade") },
  { id: "drop-fade", label: "Drop Fade", thumb: thumb("side-drop-fade") },
  { id: "skin-fade", label: "Skin Fade", thumb: thumb("side-skin-fade") },
  { id: "burst-fade", label: "Burst Fade", thumb: thumb("side-burst-fade") },
  { id: "temple-fade", label: "Temple Fade", thumb: thumb("side-temple-fade") },
  { id: "taper-fade", label: "Taper Fade", thumb: thumb("side-taper-fade") },
];

export const FADE_HEIGHTS = ["Low", "Medium", "High"];

export const BACK_STYLES: Option[] = [
  { id: "normal", label: "Normal", thumb: thumb("back-normal") },
  { id: "tapered", label: "Tapered", thumb: thumb("back-tapered") },
  { id: "v-cut", label: "V-Cut", thumb: thumb("back-v-cut") },
  { id: "u-cut", label: "U-Cut", thumb: thumb("back-u-cut") },
  { id: "rounded", label: "Rounded", thumb: thumb("back-rounded") },
  { id: "mullet", label: "Mullet", thumb: thumb("back-mullet") },
  { id: "modern-mullet", label: "Modern Mullet", thumb: thumb("back-modern-mullet") },
  { id: "burst-fade-back", label: "Burst Fade Back", thumb: thumb("back-burst-fade") },
  { id: "disconnected", label: "Disconnected Back", thumb: thumb("back-disconnected") },
];

export const HAIR_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "black", label: "Black", hex: "#0A0A0A" },
  { id: "dark-brown", label: "Dark Brown", hex: "#3B2417" },
  { id: "brown", label: "Brown", hex: "#6B4226" },
  { id: "light-brown", label: "Light Brown", hex: "#9C6B3F" },
  { id: "blonde", label: "Blonde", hex: "#D9B26A" },
  { id: "platinum", label: "Platinum", hex: "#E8E2D5" },
  { id: "silver", label: "Silver", hex: "#C0C0C8" },
  { id: "blue", label: "Blue", hex: "#1E5FBF" },
  { id: "red", label: "Red", hex: "#A4231F" },
  { id: "purple", label: "Purple", hex: "#8B5CF6" },
];

export const TEXTURES = ["Straight", "Wavy", "Curly", "Coily"];
export const VOLUMES = ["Low", "Medium", "High"];
export const SHINES = ["Matte", "Natural", "Glossy"];
export const HAIRLINES = ["Natural", "Sharp", "Line-Up"];

export const ANGLES = ["front", "left", "right", "back"] as const;
export type Angle = typeof ANGLES[number];

export type CustomizeState = {
  topStyle: string;
  length: number; // index into LENGTHS
  fadeStyle: string;
  fadeHeight: number; // index into FADE_HEIGHTS
  backStyle: string;
  color: string;
  texture: string;
  volume: string;
  shine: string;
  hairline: string;
};

export const DEFAULT_CUSTOMIZE_STATE: CustomizeState = {
  topStyle: "quiff",
  length: 2,
  fadeStyle: "mid-fade",
  fadeHeight: 1,
  backStyle: "mullet",
  color: "brown",
  texture: "Wavy",
  volume: "Medium",
  shine: "Natural",
  hairline: "Natural",
};

export function describeCustomization(s: CustomizeState): string {
  const top = TOP_STYLES.find((t) => t.id === s.topStyle)?.label ?? s.topStyle;
  const fade = FADE_STYLES.find((f) => f.id === s.fadeStyle)?.label ?? s.fadeStyle;
  const back = BACK_STYLES.find((b) => b.id === s.backStyle)?.label ?? s.backStyle;
  const color = HAIR_COLORS.find((c) => c.id === s.color)?.label ?? s.color;
  return [
    `${top} hairstyle`,
    `${LENGTHS[s.length]} length`,
    `${fade} on the sides at ${FADE_HEIGHTS[s.fadeHeight]} height`,
    `${back} back style`,
    `${color} hair color`,
    `${s.texture} texture`,
    `${s.volume} volume`,
    `${s.shine} finish`,
    `${s.hairline} hairline`,
  ].join(", ");
}
