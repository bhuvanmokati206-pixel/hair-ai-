// Salon hair-colour palette — the shades the salon offers, with a representative
// hex, whether it needs bleaching from dark hair, how many salon sessions it takes,
// and upkeep. Colour (unlike a haircut shape) is fully specified by a name + hex, so
// no photo dataset is needed — the hex is what makes the AI recolour accurate.
//
// `sessions` = visits to reach it from natural dark Indian hair.
// `needsBleach` drives the honest "requires bleaching" warning in the UI.

export type Upkeep = "low" | "medium" | "high";
export type ColorFamily =
  | "natural" | "brown-warm" | "brown-cool" | "red-copper"
  | "burgundy-plum" | "caramel-honey" | "blonde" | "ash-silver"
  | "fashion" | "highlights";

export type HairColor = {
  name: string;
  hex: string;          // representative shade for the AI + UI swatch
  family: ColorFamily;
  needsBleach: boolean; // from natural dark hair
  sessions: "1" | "2" | "2-3" | "3+";
  upkeep: Upkeep;
};

export const COLOR_PALETTE: HairColor[] = [
  // ── Natural / single-process darks (1 session, low upkeep) ──
  { name: "Natural Black",         hex: "#0f0f10", family: "natural", needsBleach: false, sessions: "1", upkeep: "low" },
  { name: "Soft Black",            hex: "#1a1a1d", family: "natural", needsBleach: false, sessions: "1", upkeep: "low" },
  { name: "Blue Black",            hex: "#0d1522", family: "natural", needsBleach: false, sessions: "1", upkeep: "low" },
  { name: "Darkest Brown",         hex: "#2a1c14", family: "natural", needsBleach: false, sessions: "1", upkeep: "low" },
  { name: "Espresso Brown",        hex: "#3a271b", family: "brown-warm", needsBleach: false, sessions: "1", upkeep: "low" },
  { name: "Dark Chocolate Brown",  hex: "#3f2a1d", family: "brown-warm", needsBleach: false, sessions: "1", upkeep: "low" },
  { name: "Coffee Brown",          hex: "#4b3324", family: "brown-warm", needsBleach: false, sessions: "1", upkeep: "low" },
  { name: "Chestnut Brown",        hex: "#5a3a25", family: "brown-warm", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Mahogany Brown",        hex: "#4e2823", family: "brown-warm", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Golden Brown",          hex: "#6b4423", family: "brown-warm", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Hazelnut Brown",        hex: "#6f4e37", family: "brown-warm", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Caramel Brown",         hex: "#7b4f2c", family: "caramel-honey", needsBleach: false, sessions: "2", upkeep: "medium" },
  { name: "Light Brown",           hex: "#7c5a3a", family: "brown-warm", needsBleach: true,  sessions: "2", upkeep: "medium" },

  // ── Cool / ashy browns (some need lifting) ──
  { name: "Ash Brown",             hex: "#5c554b", family: "brown-cool", needsBleach: true,  sessions: "2", upkeep: "medium" },
  { name: "Mushroom Brown",        hex: "#6b6258", family: "brown-cool", needsBleach: true,  sessions: "2", upkeep: "medium" },
  { name: "Smoky Brown",           hex: "#4a423b", family: "brown-cool", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Cool Chestnut",         hex: "#4d382c", family: "brown-cool", needsBleach: false, sessions: "1", upkeep: "medium" },

  // ── Reds & coppers ──
  { name: "Auburn",                hex: "#6d2f1f", family: "red-copper", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Copper Red",            hex: "#8a3b1e", family: "red-copper", needsBleach: true,  sessions: "2", upkeep: "high" },
  { name: "Ginger Copper",         hex: "#a04a24", family: "red-copper", needsBleach: true,  sessions: "2", upkeep: "high" },
  { name: "Bright Red",            hex: "#9e2b25", family: "red-copper", needsBleach: true,  sessions: "2-3", upkeep: "high" },
  { name: "Cherry Red",            hex: "#7a1f2b", family: "red-copper", needsBleach: true,  sessions: "2-3", upkeep: "high" },
  { name: "Rust",                  hex: "#8b4013", family: "red-copper", needsBleach: true,  sessions: "2", upkeep: "high" },

  // ── Burgundy / plum / wine ──
  { name: "Burgundy",              hex: "#5b1a2b", family: "burgundy-plum", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Wine Red",              hex: "#4e1526", family: "burgundy-plum", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Maroon",                hex: "#4a1420", family: "burgundy-plum", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Plum",                  hex: "#4a2340", family: "burgundy-plum", needsBleach: true,  sessions: "2", upkeep: "high" },
  { name: "Violet Plum",          hex: "#4d2a4d", family: "burgundy-plum", needsBleach: true,  sessions: "2", upkeep: "high" },

  // ── Caramel / honey / bronze (usually need lifting) ──
  { name: "Honey Blonde",          hex: "#b07a3c", family: "caramel-honey", needsBleach: true, sessions: "2-3", upkeep: "high" },
  { name: "Caramel Balayage",      hex: "#a56a34", family: "caramel-honey", needsBleach: true, sessions: "2-3", upkeep: "high" },
  { name: "Bronze",                hex: "#8c5a2b", family: "caramel-honey", needsBleach: true, sessions: "2", upkeep: "high" },
  { name: "Toffee",                hex: "#7d4e2a", family: "caramel-honey", needsBleach: true, sessions: "2", upkeep: "medium" },
  { name: "Golden Bronze",         hex: "#9c6b30", family: "caramel-honey", needsBleach: true, sessions: "2-3", upkeep: "high" },

  // ── Blondes (need bleach, high upkeep) ──
  { name: "Dark Blonde",           hex: "#9a7b4f", family: "blonde", needsBleach: true, sessions: "2-3", upkeep: "high" },
  { name: "Golden Blonde",         hex: "#c79a4b", family: "blonde", needsBleach: true, sessions: "2-3", upkeep: "high" },
  { name: "Sandy Blonde",          hex: "#c2a468", family: "blonde", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Beige Blonde",          hex: "#cbb389", family: "blonde", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Platinum Blonde",       hex: "#e6e1d3", family: "blonde", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Ice Blonde",            hex: "#e8e8e4", family: "blonde", needsBleach: true, sessions: "3+", upkeep: "high" },

  // ── Ash / silver / grey ──
  { name: "Ash Blonde",            hex: "#b8ac97", family: "ash-silver", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Silver",                hex: "#c4c7cc", family: "ash-silver", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Steel Grey",            hex: "#9a9ea3", family: "ash-silver", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Smoky Grey",            hex: "#7f8489", family: "ash-silver", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Salt and Pepper",       hex: "#6b6c70", family: "ash-silver", needsBleach: false, sessions: "1", upkeep: "low" },

  // ── Fashion / vivid (bleach required) ──
  { name: "Midnight Blue",         hex: "#17263f", family: "fashion", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Electric Blue",         hex: "#1f5fa8", family: "fashion", needsBleach: true, sessions: "2-3", upkeep: "high" },
  { name: "Teal",                  hex: "#1c6f6b", family: "fashion", needsBleach: true, sessions: "2-3", upkeep: "high" },
  { name: "Emerald Green",         hex: "#1f6b45", family: "fashion", needsBleach: true, sessions: "2-3", upkeep: "high" },
  { name: "Purple",                hex: "#5a2a7a", family: "fashion", needsBleach: true, sessions: "2-3", upkeep: "high" },
  { name: "Lavender",              hex: "#b3a0d6", family: "fashion", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Rose Gold",             hex: "#c08a7d", family: "fashion", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Pink",                  hex: "#d15b8f", family: "fashion", needsBleach: true, sessions: "3+", upkeep: "high" },
  { name: "Pastel Pink",           hex: "#e5b6c8", family: "fashion", needsBleach: true, sessions: "3+", upkeep: "high" },

  // ── Highlight / technique styles (colour applied in pieces) ──
  { name: "Caramel Highlights",    hex: "#9c6a34", family: "highlights", needsBleach: true, sessions: "2", upkeep: "medium" },
  { name: "Golden Highlights",     hex: "#b98a3e", family: "highlights", needsBleach: true, sessions: "2", upkeep: "medium" },
  { name: "Babylights",            hex: "#c2a066", family: "highlights", needsBleach: true, sessions: "2-3", upkeep: "medium" },
  { name: "Balayage Brown",        hex: "#6f4a2c", family: "highlights", needsBleach: true, sessions: "2", upkeep: "medium" },
  { name: "Ombre Brown to Caramel", hex: "#7a4e2b", family: "highlights", needsBleach: true, sessions: "2-3", upkeep: "high" },
  { name: "Peekaboo Burgundy",     hex: "#5b1a2b", family: "highlights", needsBleach: false, sessions: "1", upkeep: "medium" },
  { name: "Global Brown",          hex: "#4b3324", family: "highlights", needsBleach: false, sessions: "1", upkeep: "low" },
];

const GENERIC = new Set(["hair", "colour", "color", "shade", "tone", "dark", "light"]);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const toks = (s: string) => norm(s).split(" ").filter((t) => t && !GENERIC.has(t));

/**
 * Best palette match for a (possibly model-generated) colour name — used to attach
 * an accurate hex + bleach/session data. Exact name → strongest; else token overlap.
 * Returns null if nothing meaningfully matches.
 */
export function findColor(name: string): HairColor | null {
  if (!name) return null;
  const nName = norm(name);
  const q = toks(name);
  if (q.length === 0) return null;

  let best: HairColor | null = null;
  let bestScore = 0;
  for (const c of COLOR_PALETTE) {
    if (norm(c.name) === nName) return c; // exact
    const cToks = new Set(toks(c.name));
    const matched = q.filter((t) => cToks.has(t)).length;
    if (matched === 0) continue;
    const score = matched / Math.max(q.length, cToks.size); // favour tight matches
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 0.34 ? best : null;
}
