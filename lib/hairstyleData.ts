// 7 styles below use real photos from public/styles/<id>/. The rest still use
// picsum.photos placeholders — swap those for real images before shipping for real.

export type HairstyleReview = {
  customerName: string;
  rating: number; // 1-5
  comment: string;
  daysAgo: number;
};

export type HairstyleSpec = {
  faceShapes: string[];
  hairTexture: string;
  maintenance: "Low" | "Medium" | "High";
  length: string;
  stylingTime: string;
};

export type Hairstyle = {
  id: string;
  name: string;
  category: "Men" | "Women" | "Unisex";
  description: string;
  photos: string[];
  specs: HairstyleSpec;
  reviews: HairstyleReview[];
  weeklyTrend: number[]; // last 8 weeks, oldest -> newest
};

function placeholderPhotos(seed: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/480/600`);
}

function realPhotos(id: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `/styles/${id}/${i + 1}.jpg`);
}

export const HAIRSTYLES: Hairstyle[] = [
  {
    id: "textured-crop",
    name: "Textured Crop",
    category: "Men",
    description: "Short, choppy texture on top with a tapered or faded side, low maintenance and easy to style.",
    photos: realPhotos("textured-crop", 3),
    specs: { faceShapes: ["Oval", "Square", "Diamond"], hairTexture: "Straight to wavy", maintenance: "Low", length: "Short", stylingTime: "5 min" },
    reviews: [
      { customerName: "Rahul S.", rating: 5, comment: "Clean look, barely needs styling.", daysAgo: 3 },
      { customerName: "Vikram P.", rating: 4, comment: "Good for office, grows out nicely.", daysAgo: 10 },
    ],
    weeklyTrend: [4, 6, 5, 8, 9, 12, 14, 16],
  },
  {
    id: "french-crop",
    name: "French Crop",
    category: "Men",
    description: "Dense fringe cut straight across the forehead with tight sides — sharp and structured.",
    photos: realPhotos("french-crop", 3),
    specs: { faceShapes: ["Oval", "Round"], hairTexture: "Straight, thick", maintenance: "Medium", length: "Short", stylingTime: "8 min" },
    reviews: [
      { customerName: "Aman K.", rating: 5, comment: "Best cut I've had, very sharp.", daysAgo: 1 },
    ],
    weeklyTrend: [2, 3, 4, 4, 6, 7, 9, 11],
  },
  {
    id: "pompadour",
    name: "Pompadour",
    category: "Men",
    description: "Volume swept up and back from the forehead, sides cut shorter for contrast.",
    photos: realPhotos("pompadour", 3),
    specs: { faceShapes: ["Oval", "Heart"], hairTexture: "Thick, wavy", maintenance: "High", length: "Medium", stylingTime: "12 min" },
    reviews: [
      { customerName: "Dev R.", rating: 4, comment: "Needs daily product but looks premium.", daysAgo: 6 },
    ],
    weeklyTrend: [6, 7, 6, 5, 4, 4, 3, 3],
  },
  {
    id: "slick-back-undercut",
    name: "Slick Back Undercut",
    category: "Men",
    description: "Hair combed straight back with a hard contrast undercut on the sides.",
    photos: realPhotos("slick-back-undercut", 3),
    specs: { faceShapes: ["Oval", "Square"], hairTexture: "Straight, medium", maintenance: "Medium", length: "Medium", stylingTime: "10 min" },
    reviews: [],
    weeklyTrend: [3, 4, 5, 7, 8, 10, 9, 12],
  },
  {
    id: "buzz-cut",
    name: "Buzz Cut",
    category: "Men",
    description: "Uniform short length all over using clippers — the lowest maintenance option.",
    photos: realPhotos("buzz-cut", 3),
    specs: { faceShapes: ["Oval", "Square", "Round"], hairTexture: "Any", maintenance: "Low", length: "Very short", stylingTime: "0 min" },
    reviews: [
      { customerName: "Sanjay M.", rating: 5, comment: "Wash and go, perfect for summer.", daysAgo: 14 },
    ],
    weeklyTrend: [8, 9, 10, 9, 11, 13, 15, 18],
  },
  {
    id: "side-part",
    name: "Classic Side Part",
    category: "Men",
    description: "Hair parted cleanly to one side with a defined line, timeless professional look.",
    photos: realPhotos("side-part", 3),
    specs: { faceShapes: ["Oval", "Diamond"], hairTexture: "Straight", maintenance: "Medium", length: "Medium", stylingTime: "7 min" },
    reviews: [],
    weeklyTrend: [5, 5, 4, 4, 3, 3, 2, 2],
  },
  {
    id: "quiff",
    name: "Modern Quiff",
    category: "Men",
    description: "Volume pushed up and slightly back at the front, tapered sides for a sharp silhouette.",
    photos: placeholderPhotos("quiff", 3),
    specs: { faceShapes: ["Oval", "Heart", "Square"], hairTexture: "Thick, wavy", maintenance: "Medium", length: "Medium", stylingTime: "9 min" },
    reviews: [
      { customerName: "Imran H.", rating: 4, comment: "Stylist nailed the height balance.", daysAgo: 5 },
    ],
    weeklyTrend: [7, 8, 10, 11, 13, 12, 14, 17],
  },
  {
    id: "mullet",
    name: "Modern Mullet",
    category: "Men",
    description: "Short on top and sides, length kept long at the back — bold, trend-driven cut.",
    photos: realPhotos("mullet", 3),
    specs: { faceShapes: ["Oval", "Square"], hairTexture: "Straight to wavy", maintenance: "Medium", length: "Long at back", stylingTime: "8 min" },
    reviews: [],
    weeklyTrend: [1, 2, 3, 5, 6, 8, 10, 13],
  },
  {
    id: "curtain-fringe",
    name: "Curtain Fringe",
    category: "Men",
    description: "Center-parted fringe that falls naturally on both sides framing the face.",
    photos: placeholderPhotos("curtain-fringe", 3),
    specs: { faceShapes: ["Oval", "Round"], hairTexture: "Straight, medium", maintenance: "Medium", length: "Medium", stylingTime: "6 min" },
    reviews: [
      { customerName: "Yusuf A.", rating: 3, comment: "Nice but needs frequent trims to hold shape.", daysAgo: 20 },
    ],
    weeklyTrend: [4, 4, 5, 4, 3, 3, 2, 2],
  },
  {
    id: "high-fade-afro",
    name: "High Fade Afro",
    category: "Men",
    description: "Natural curl volume kept on top with a sharp high fade on the sides.",
    photos: placeholderPhotos("high-fade-afro", 3),
    specs: { faceShapes: ["Oval", "Square", "Round"], hairTexture: "Coily, dense", maintenance: "Medium", length: "Short to medium", stylingTime: "10 min" },
    reviews: [],
    weeklyTrend: [3, 3, 4, 5, 5, 7, 8, 9],
  },
  {
    id: "long-layers",
    name: "Long Layers",
    category: "Women",
    description: "Face-framing layers cut throughout long length for movement and volume.",
    photos: placeholderPhotos("long-layers", 3),
    specs: { faceShapes: ["Oval", "Square", "Heart"], hairTexture: "Any", maintenance: "Medium", length: "Long", stylingTime: "15 min" },
    reviews: [
      { customerName: "Priya N.", rating: 5, comment: "Bounces beautifully, great recommendation.", daysAgo: 4 },
    ],
    weeklyTrend: [9, 10, 11, 10, 12, 14, 15, 16],
  },
  {
    id: "bob-cut",
    name: "Classic Bob",
    category: "Women",
    description: "Chin-to-shoulder length cut blunt or layered, a sharp and easy everyday style.",
    photos: placeholderPhotos("bob-cut", 3),
    specs: { faceShapes: ["Oval", "Round", "Heart"], hairTexture: "Straight to wavy", maintenance: "Low", length: "Short to medium", stylingTime: "8 min" },
    reviews: [
      { customerName: "Anjali T.", rating: 5, comment: "Easiest style I've maintained, love it.", daysAgo: 2 },
    ],
    weeklyTrend: [10, 11, 13, 12, 14, 16, 18, 20],
  },
  {
    id: "pixie-cut",
    name: "Pixie Cut",
    category: "Women",
    description: "Very short cropped cut with textured layers on top — bold and low maintenance.",
    photos: placeholderPhotos("pixie-cut", 3),
    specs: { faceShapes: ["Oval", "Heart", "Diamond"], hairTexture: "Any", maintenance: "Low", length: "Very short", stylingTime: "4 min" },
    reviews: [],
    weeklyTrend: [3, 4, 4, 5, 6, 6, 7, 8],
  },
  {
    id: "beach-waves",
    name: "Beach Waves",
    category: "Women",
    description: "Loose, tousled waves through mid-length to long hair for a relaxed natural look.",
    photos: placeholderPhotos("beach-waves", 3),
    specs: { faceShapes: ["Oval", "Square", "Round"], hairTexture: "Wavy, medium", maintenance: "Medium", length: "Medium to long", stylingTime: "12 min" },
    reviews: [
      { customerName: "Sneha V.", rating: 4, comment: "Great for parties, holds for hours.", daysAgo: 8 },
    ],
    weeklyTrend: [6, 7, 8, 9, 11, 10, 12, 14],
  },
  {
    id: "shag-cut",
    name: "Shag Cut",
    category: "Unisex",
    description: "Heavily layered, choppy cut with a textured fringe — retro-inspired and versatile.",
    photos: placeholderPhotos("shag-cut", 3),
    specs: { faceShapes: ["Oval", "Square", "Heart"], hairTexture: "Wavy to curly", maintenance: "Medium", length: "Medium", stylingTime: "10 min" },
    reviews: [],
    weeklyTrend: [2, 3, 5, 6, 8, 9, 11, 13],
  },

  // ─── Men ───────────────────────────────────────────────────────────────
  {
    id: "crew-cut",
    name: "Crew Cut",
    category: "Men",
    description: "Short, tapered cut left slightly longer at the front, graduating shorter toward the crown — clean, military-inspired and effortless.",
    photos: placeholderPhotos("crew-cut", 3),
    specs: { faceShapes: ["Oval", "Square", "Diamond"], hairTexture: "Straight to wavy", maintenance: "Low", length: "Short", stylingTime: "3 min" },
    reviews: [
      { customerName: "Arjun D.", rating: 5, comment: "Sharp and fuss-free, exactly what I wanted.", daysAgo: 4 },
    ],
    weeklyTrend: [6, 7, 7, 9, 10, 11, 13, 15],
  },
  {
    id: "caesar-cut",
    name: "Caesar Cut",
    category: "Men",
    description: "Short, horizontally straight fringe combed forward with even length all around — a low-effort classic that hides a receding hairline well.",
    photos: placeholderPhotos("caesar-cut", 3),
    specs: { faceShapes: ["Oval", "Oblong", "Heart"], hairTexture: "Straight, thick", maintenance: "Low", length: "Short", stylingTime: "4 min" },
    reviews: [],
    weeklyTrend: [3, 3, 4, 4, 5, 6, 7, 8],
  },
  {
    id: "ivy-league",
    name: "Ivy League",
    category: "Men",
    description: "A grown-out crew cut with enough length on top to comb and part — polished, professional and easy to dress up or down.",
    photos: placeholderPhotos("ivy-league", 3),
    specs: { faceShapes: ["Oval", "Square", "Diamond"], hairTexture: "Straight", maintenance: "Medium", length: "Short", stylingTime: "6 min" },
    reviews: [
      { customerName: "Nikhil B.", rating: 4, comment: "Great smart-casual look, holds a side part well.", daysAgo: 9 },
    ],
    weeklyTrend: [4, 5, 5, 6, 7, 7, 9, 10],
  },
  {
    id: "taper-fade",
    name: "Taper Fade",
    category: "Men",
    description: "Gradual fade at the sideburns and neckline that keeps more length up top — a versatile base that pairs with almost any style.",
    photos: placeholderPhotos("taper-fade", 3),
    specs: { faceShapes: ["Oval", "Square", "Round", "Heart"], hairTexture: "Any", maintenance: "Medium", length: "Short to medium", stylingTime: "7 min" },
    reviews: [
      { customerName: "Rohan G.", rating: 5, comment: "Clean edges, blended perfectly.", daysAgo: 2 },
    ],
    weeklyTrend: [10, 12, 13, 14, 16, 18, 20, 23],
  },
  {
    id: "burst-fade",
    name: "Burst Fade",
    category: "Men",
    description: "A fade that curves around the ear and tapers into the neckline, leaving length at the back — popular with mullets and mohawks.",
    photos: placeholderPhotos("burst-fade", 3),
    specs: { faceShapes: ["Oval", "Square", "Diamond"], hairTexture: "Straight to curly", maintenance: "Medium", length: "Short to medium", stylingTime: "8 min" },
    reviews: [],
    weeklyTrend: [5, 6, 8, 9, 11, 13, 15, 18],
  },
  {
    id: "comb-over-fade",
    name: "Comb Over Fade",
    category: "Men",
    description: "Longer top swept to one side over a faded side — a sharp, modern take on the traditional comb over.",
    photos: placeholderPhotos("comb-over-fade", 3),
    specs: { faceShapes: ["Oval", "Square", "Oblong"], hairTexture: "Straight, medium", maintenance: "Medium", length: "Medium", stylingTime: "9 min" },
    reviews: [
      { customerName: "Faisal K.", rating: 4, comment: "Very corporate, looks premium with a bit of pomade.", daysAgo: 12 },
    ],
    weeklyTrend: [7, 7, 8, 8, 9, 10, 11, 12],
  },
  {
    id: "disconnected-undercut",
    name: "Disconnected Undercut",
    category: "Men",
    description: "Long top with no blend into the shaved sides — a bold, high-contrast look with maximum styling versatility.",
    photos: placeholderPhotos("disconnected-undercut", 3),
    specs: { faceShapes: ["Oval", "Square", "Diamond"], hairTexture: "Straight to wavy", maintenance: "High", length: "Medium to long", stylingTime: "11 min" },
    reviews: [],
    weeklyTrend: [6, 6, 7, 7, 6, 8, 9, 10],
  },
  {
    id: "faux-hawk",
    name: "Faux Hawk",
    category: "Men",
    description: "Hair pushed up to a soft central ridge with tapered sides — the mohawk's wearable, work-friendly cousin.",
    photos: placeholderPhotos("faux-hawk", 3),
    specs: { faceShapes: ["Oval", "Square", "Round"], hairTexture: "Thick, any", maintenance: "Medium", length: "Short to medium", stylingTime: "8 min" },
    reviews: [
      { customerName: "Kabir S.", rating: 4, comment: "Fun without being too extreme.", daysAgo: 7 },
    ],
    weeklyTrend: [4, 5, 5, 6, 6, 7, 8, 9],
  },
  {
    id: "two-block",
    name: "Two Block Cut",
    category: "Men",
    description: "Volume and length kept on top with the under-sides and back clipped short — the signature Korean style, soft and youthful.",
    photos: placeholderPhotos("two-block", 3),
    specs: { faceShapes: ["Oval", "Round", "Heart"], hairTexture: "Straight, medium", maintenance: "Medium", length: "Medium", stylingTime: "9 min" },
    reviews: [
      { customerName: "Jin H.", rating: 5, comment: "K-drama look, everyone asks where I got it.", daysAgo: 3 },
    ],
    weeklyTrend: [8, 10, 12, 14, 15, 17, 19, 22],
  },
  {
    id: "man-bun",
    name: "Man Bun",
    category: "Men",
    description: "Long hair gathered into a bun or top-knot, often over tapered sides — relaxed yet put-together.",
    photos: placeholderPhotos("man-bun", 3),
    specs: { faceShapes: ["Oval", "Square", "Oblong"], hairTexture: "Straight to wavy", maintenance: "Medium", length: "Long", stylingTime: "5 min" },
    reviews: [],
    weeklyTrend: [9, 8, 8, 7, 7, 8, 8, 9],
  },
  {
    id: "bro-flow",
    name: "Bro Flow",
    category: "Men",
    description: "Medium-to-long hair swept straight back and left to fall naturally — an easy, grown-out look with movement.",
    photos: placeholderPhotos("bro-flow", 3),
    specs: { faceShapes: ["Oval", "Square", "Diamond"], hairTexture: "Wavy, medium", maintenance: "Medium", length: "Medium to long", stylingTime: "6 min" },
    reviews: [
      { customerName: "Sameer J.", rating: 4, comment: "Low effort but looks great after a shower shake.", daysAgo: 15 },
    ],
    weeklyTrend: [6, 7, 8, 9, 10, 11, 12, 13],
  },
  {
    id: "edgar-cut",
    name: "Edgar Cut",
    category: "Men",
    description: "A blunt, straight-across fringe over a high skin fade — a bold, geometric statement cut.",
    photos: placeholderPhotos("edgar-cut", 3),
    specs: { faceShapes: ["Oval", "Oblong", "Diamond"], hairTexture: "Straight, thick", maintenance: "Medium", length: "Short", stylingTime: "7 min" },
    reviews: [],
    weeklyTrend: [3, 4, 6, 8, 10, 12, 14, 16],
  },
  {
    id: "360-waves",
    name: "360 Waves",
    category: "Men",
    description: "Short coily hair brushed and trained into a rippling wave pattern across the whole head — a low-cut classic requiring daily brushing.",
    photos: placeholderPhotos("360-waves", 3),
    specs: { faceShapes: ["Oval", "Square", "Round"], hairTexture: "Coily, dense", maintenance: "High", length: "Very short", stylingTime: "10 min" },
    reviews: [
      { customerName: "Malik T.", rating: 5, comment: "Waves came in after a few weeks of brushing, worth it.", daysAgo: 18 },
    ],
    weeklyTrend: [5, 5, 6, 6, 7, 7, 8, 9],
  },

  // ─── Women ─────────────────────────────────────────────────────────────
  {
    id: "long-bob-lob",
    name: "Long Bob (Lob)",
    category: "Women",
    description: "A collarbone-grazing bob — longer and softer than a classic bob, flattering on almost everyone and easy to style straight or wavy.",
    photos: placeholderPhotos("long-bob-lob", 3),
    specs: { faceShapes: ["Oval", "Round", "Square", "Heart"], hairTexture: "Any", maintenance: "Low", length: "Medium", stylingTime: "10 min" },
    reviews: [
      { customerName: "Meera R.", rating: 5, comment: "Perfect length — professional but still fun.", daysAgo: 2 },
    ],
    weeklyTrend: [12, 13, 14, 15, 17, 19, 21, 24],
  },
  {
    id: "layered-bob",
    name: "Layered Bob",
    category: "Women",
    description: "A bob with graduated internal layers for lift and movement — adds body to fine hair and softens rounder faces.",
    photos: placeholderPhotos("layered-bob", 3),
    specs: { faceShapes: ["Oval", "Round", "Heart"], hairTexture: "Straight to wavy", maintenance: "Medium", length: "Short to medium", stylingTime: "12 min" },
    reviews: [],
    weeklyTrend: [8, 9, 10, 11, 12, 13, 15, 16],
  },
  {
    id: "curtain-bangs",
    name: "Curtain Bangs",
    category: "Women",
    description: "Soft, center-parted bangs that sweep outward to frame the face — pairs with any length and grows out gracefully.",
    photos: placeholderPhotos("curtain-bangs", 3),
    specs: { faceShapes: ["Oval", "Round", "Square", "Heart"], hairTexture: "Straight to wavy", maintenance: "Medium", length: "Medium to long", stylingTime: "10 min" },
    reviews: [
      { customerName: "Isha P.", rating: 5, comment: "Instantly softened my face, obsessed.", daysAgo: 5 },
    ],
    weeklyTrend: [14, 15, 16, 18, 20, 22, 24, 27],
  },
  {
    id: "butterfly-cut",
    name: "Butterfly Cut",
    category: "Women",
    description: "Long hair with short, face-framing layers that create a voluminous, wing-like flick — big body without losing length.",
    photos: placeholderPhotos("butterfly-cut", 3),
    specs: { faceShapes: ["Oval", "Oblong", "Diamond"], hairTexture: "Wavy, medium", maintenance: "Medium", length: "Long", stylingTime: "15 min" },
    reviews: [],
    weeklyTrend: [7, 9, 11, 13, 15, 18, 20, 23],
  },
  {
    id: "money-piece",
    name: "Money Piece",
    category: "Women",
    description: "Two brightened, face-framing front sections that lift the complexion — a low-commitment colour accent, not a cut.",
    photos: placeholderPhotos("money-piece", 3),
    specs: { faceShapes: ["Oval", "Round", "Square", "Heart"], hairTexture: "Any", maintenance: "Medium", length: "Medium to long", stylingTime: "8 min" },
    reviews: [
      { customerName: "Tara S.", rating: 4, comment: "Brightens my face without a full colour job.", daysAgo: 11 },
    ],
    weeklyTrend: [6, 7, 8, 8, 9, 10, 11, 12],
  },
  {
    id: "hime-cut",
    name: "Hime Cut",
    category: "Women",
    description: "Straight, cheek-length side sections and a blunt fringe over long straight hair — a striking, geometric Japanese style.",
    photos: placeholderPhotos("hime-cut", 3),
    specs: { faceShapes: ["Oval", "Heart", "Diamond"], hairTexture: "Straight, thick", maintenance: "Medium", length: "Long", stylingTime: "12 min" },
    reviews: [],
    weeklyTrend: [3, 4, 5, 6, 7, 9, 11, 13],
  },
  {
    id: "curly-shag",
    name: "Curly Shag",
    category: "Women",
    description: "A heavily layered shag cut for curls and coils — enhances natural definition and cuts down on frizz-prone bulk.",
    photos: placeholderPhotos("curly-shag", 3),
    specs: { faceShapes: ["Oval", "Square", "Heart"], hairTexture: "Curly to coily", maintenance: "Medium", length: "Medium", stylingTime: "13 min" },
    reviews: [
      { customerName: "Naomi F.", rating: 5, comment: "Finally a cut that works WITH my curls.", daysAgo: 6 },
    ],
    weeklyTrend: [5, 6, 8, 9, 11, 12, 14, 16],
  },
  {
    id: "blunt-cut-long",
    name: "Blunt Cut (Long)",
    category: "Women",
    description: "Long hair cut to one clean, even length with no layers — makes thin hair look denser and reads sleek and modern.",
    photos: placeholderPhotos("blunt-cut-long", 3),
    specs: { faceShapes: ["Oval", "Round", "Heart"], hairTexture: "Straight, fine to medium", maintenance: "Low", length: "Long", stylingTime: "10 min" },
    reviews: [],
    weeklyTrend: [7, 7, 8, 8, 9, 10, 10, 11],
  },
  {
    id: "deva-cut",
    name: "Deva Cut",
    category: "Women",
    description: "A dry-cutting technique for curly hair, shaping each curl individually for balanced, defined volume.",
    photos: placeholderPhotos("deva-cut", 3),
    specs: { faceShapes: ["Oval", "Square", "Heart"], hairTexture: "Curly to coily", maintenance: "Medium", length: "Medium to long", stylingTime: "14 min" },
    reviews: [
      { customerName: "Layla M.", rating: 4, comment: "Curls sit so much more evenly now.", daysAgo: 9 },
    ],
    weeklyTrend: [4, 5, 5, 6, 7, 8, 9, 10],
  },
  {
    id: "feathered-layers",
    name: "Feathered Layers",
    category: "Women",
    description: "Soft, wispy layers feathered back and away from the face for airy movement — a retro look that's back in rotation.",
    photos: placeholderPhotos("feathered-layers", 3),
    specs: { faceShapes: ["Oval", "Round", "Square"], hairTexture: "Straight to wavy", maintenance: "Medium", length: "Medium to long", stylingTime: "12 min" },
    reviews: [],
    weeklyTrend: [5, 6, 7, 8, 9, 11, 12, 14],
  },
  {
    id: "afro",
    name: "Natural Afro",
    category: "Women",
    description: "Coily hair grown out and shaped into a rounded silhouette — celebrates natural texture with a bold, voluminous outline.",
    photos: placeholderPhotos("afro", 3),
    specs: { faceShapes: ["Oval", "Square", "Heart"], hairTexture: "Coily, dense", maintenance: "Medium", length: "Medium", stylingTime: "12 min" },
    reviews: [
      { customerName: "Zara O.", rating: 5, comment: "Love the volume, so easy once picked out.", daysAgo: 4 },
    ],
    weeklyTrend: [8, 8, 9, 10, 11, 12, 13, 15],
  },

  // ─── Unisex ────────────────────────────────────────────────────────────
  {
    id: "wolf-cut",
    name: "Wolf Cut",
    category: "Unisex",
    description: "A mix of shag and mullet — choppy layers up top blending into longer, wispy lengths for an edgy, undone look.",
    photos: placeholderPhotos("wolf-cut", 3),
    specs: { faceShapes: ["Oval", "Square", "Heart", "Diamond"], hairTexture: "Wavy to curly", maintenance: "Medium", length: "Medium", stylingTime: "10 min" },
    reviews: [
      { customerName: "Alex R.", rating: 5, comment: "Trendy and low-effort, gets compliments daily.", daysAgo: 3 },
    ],
    weeklyTrend: [9, 11, 13, 16, 18, 21, 24, 27],
  },
  {
    id: "box-braids",
    name: "Box Braids",
    category: "Unisex",
    description: "Hair sectioned into squares and braided with or without extensions — a durable, protective style that lasts weeks.",
    photos: placeholderPhotos("box-braids", 3),
    specs: { faceShapes: ["Oval", "Square", "Round", "Heart"], hairTexture: "Coily, dense", maintenance: "Low", length: "Long", stylingTime: "180 min" },
    reviews: [
      { customerName: "Amara D.", rating: 5, comment: "Lasted six weeks, barely any daily upkeep.", daysAgo: 20 },
    ],
    weeklyTrend: [10, 10, 11, 12, 12, 13, 14, 15],
  },
  {
    id: "cornrows",
    name: "Cornrows",
    category: "Unisex",
    description: "Hair braided flat to the scalp in continuous rows — a versatile protective style that can form intricate patterns.",
    photos: placeholderPhotos("cornrows", 3),
    specs: { faceShapes: ["Oval", "Square", "Round", "Oblong"], hairTexture: "Coily, dense", maintenance: "Low", length: "Any", stylingTime: "120 min" },
    reviews: [],
    weeklyTrend: [7, 7, 8, 8, 9, 10, 11, 12],
  },
  {
    id: "dreadlocks",
    name: "Dreadlocks",
    category: "Unisex",
    description: "Hair rope-like sections formed by matting and locking over time — a long-term, low-daily-maintenance commitment.",
    photos: placeholderPhotos("dreadlocks", 3),
    specs: { faceShapes: ["Oval", "Square", "Diamond"], hairTexture: "Coily to curly", maintenance: "Medium", length: "Medium to long", stylingTime: "15 min" },
    reviews: [
      { customerName: "Kai N.", rating: 4, comment: "Takes patience to mature but worth it.", daysAgo: 30 },
    ],
    weeklyTrend: [6, 6, 6, 7, 7, 8, 8, 9],
  },
  {
    id: "cropped-taper",
    name: "Cropped Taper",
    category: "Unisex",
    description: "A short, uniform crop with lightly tapered edges — gender-neutral, wash-and-go, and flattering on most face shapes.",
    photos: placeholderPhotos("cropped-taper", 3),
    specs: { faceShapes: ["Oval", "Square", "Round", "Heart"], hairTexture: "Any", maintenance: "Low", length: "Short", stylingTime: "3 min" },
    reviews: [],
    weeklyTrend: [5, 6, 6, 7, 8, 9, 10, 11],
  },
];

export function getHairstyleById(id: string): Hairstyle | undefined {
  return HAIRSTYLES.find((h) => h.id === id);
}
