import { HAIRSTYLES, type Hairstyle } from "./hairstyleData";
import type { HairAnalysis } from "@/components/HairAIAutomation";

export type HairTypeCategory = "all" | "my_type" | "straight" | "wavy" | "curly" | "coily" | "thick" | "fine";

export type CustomerHairTypeProfile = {
  primaryType: "straight" | "wavy" | "curly" | "coily";
  typeLabel: string;
  typeNumber: string; // "Type 1" | "Type 2" | "Type 3" | "Type 4"
  density: "fine" | "medium" | "thick";
  densityLabel: string;
  rawTexture: string;
  rawDensity: string;
  hairBehaviorNotes: string;
  recommendedProductType: string;
};

/**
 * Analyzes raw vision analysis output to extract standard Hair Type (Type 1-4)
 * and Density profile with trichological precision.
 */
export function extractCustomerHairTypeProfile(analysis?: HairAnalysis | null): CustomerHairTypeProfile {
  const rawTex = (analysis?.hairTexture || "").toLowerCase();
  const rawDen = (analysis?.hairDensity || "").toLowerCase();

  let primaryType: "straight" | "wavy" | "curly" | "coily" = "straight";
  let typeLabel = "Straight";
  let typeNumber = "Type 1";
  let hairBehaviorNotes = "Tends to lie flat, shows fade transitions crisply, requires lightweight styling clay or sea-salt spray to retain volume without looking weighed down.";
  let recommendedProductType = "Matte styling clay, texture dust, or lightweight sea-salt spray";

  if (rawTex.includes("coily") || rawTex.includes("afro") || rawTex.includes("kinky")) {
    primaryType = "coily";
    typeLabel = "Coily / Afro-Textured";
    typeNumber = "Type 4";
    hairBehaviorNotes = "Has strong structural memory and volume; thrives with moisture-rich creams, sponge-twist styling, and sharp razor-edge perimeter fades.";
    recommendedProductType = "Leave-in conditioner, twist sponge styling butter, nourishing scalp oil";
  } else if (rawTex.includes("curly") || rawTex.includes("ringlet") || rawTex.includes("spiral")) {
    primaryType = "curly";
    typeLabel = "Curly";
    typeNumber = "Type 3";
    hairBehaviorNotes = "Natural spring factor and defined pattern; requires debulked weight on the sides so top curls bounce cleanly without pyramid shape.";
    recommendedProductType = "Curl-defining cream, curl mousse, hydrating leave-in mist";
  } else if (rawTex.includes("wavy") || rawTex.includes("wave")) {
    primaryType = "wavy";
    typeLabel = "Wavy";
    typeNumber = "Type 2";
    hairBehaviorNotes = "Naturally textured with organic body and movement; effortlessly carries textured crops, messy fringes, and layered tapers with minimal product.";
    recommendedProductType = "Sea salt spray, matte paste, lightweight texturizing cream";
  } else {
    primaryType = "straight";
    typeLabel = "Straight";
    typeNumber = "Type 1";
    hairBehaviorNotes = "Sleek and direct strand alignment; suits structured crops, side parts, pompadours, and taper fades where precision lines stand out.";
    recommendedProductType = "Matte clay, medium-hold pomade, volumizing root powder";
  }

  let density: "fine" | "medium" | "thick" = "medium";
  let densityLabel = "Medium Density";

  if (rawDen.includes("thin") || rawDen.includes("fine") || rawDen.includes("sparse")) {
    density = "fine";
    densityLabel = "Fine / Thin Density";
  } else if (rawDen.includes("thick") || rawDen.includes("dense") || rawDen.includes("heavy") || rawDen.includes("coarse")) {
    density = "thick";
    densityLabel = "Thick / High Density";
  }

  return {
    primaryType,
    typeLabel,
    typeNumber,
    density,
    densityLabel,
    rawTexture: analysis?.hairTexture || "Normal",
    rawDensity: analysis?.hairDensity || "Medium",
    hairBehaviorNotes,
    recommendedProductType,
  };
}

export type EnrichedExploreStyle = Hairstyle & {
  hairTypeMatchScore: number;
  isNativeToCustomerType: boolean;
  nativeHairTypes: ("straight" | "wavy" | "curly" | "coily")[];
  targetDensities: ("fine" | "medium" | "thick")[];
  hairTypeInsight: string;
  recommendedStylingForCustomer: string;
  lengthFeasibilityStatus: "ideal" | "grow_needed";
};

// Maps all 44 styles to their native hair type affinity and specialized styling insights
const STYLE_HAIR_TYPE_MAP: Record<
  string,
  {
    types: ("straight" | "wavy" | "curly" | "coily")[];
    densities: ("fine" | "medium" | "thick")[];
    insightByHairType: Record<string, string>;
    stylingProduct: string;
  }
> = {
  "textured-crop": {
    types: ["wavy", "straight"],
    densities: ["medium", "thick"],
    insightByHairType: {
      wavy: "Your natural wave pattern effortlessly creates the jagged, textured top with zero blow-drying needed.",
      straight: "Straight hair needs point-cutting and matte texturizing powder to hold the separated choppy pieces.",
      curly: "Reduces bulk on top, giving controlled, short textured ringlets with sharp taper fade.",
      coily: "A sponge-twisting pass gives high-definition micro-coils on top with super clean sides.",
    },
    stylingProduct: "Texture dust / Matte styling clay",
  },
  "french-crop": {
    types: ["straight", "wavy"],
    densities: ["medium", "thick"],
    insightByHairType: {
      straight: "Straight hair lets the blunt front fringe fall perfectly straight across the forehead without cowlicks.",
      wavy: "Wavy texture softens the blunt fringe into an organic, effortless Parisian fringe.",
      curly: "Requires light flat-ironing if a straight fringe is desired, otherwise curls form a wavy cluster fringe.",
      coily: "Creates a crisp geometric horizontal fringe line with sharp contrasting temple fades.",
    },
    stylingProduct: "Matte paste / Light cream",
  },
  "pompadour": {
    types: ["straight", "wavy"],
    densities: ["thick", "medium"],
    insightByHairType: {
      straight: "Holds height and high-gloss slicked direction cleanly with pomade and round-brushing.",
      wavy: "Gives a relaxed, textured rockabilly quiff with natural undulating volume on top.",
      curly: "Needs stretching with a blow dryer to relax curls into a swept-up voluminous pomp.",
      coily: "Requires intense moisture and heat stretch; works best adapted as a pompadour fade.",
    },
    stylingProduct: "High-hold pomade / Blow dry root lift spray",
  },
  "slick-back-undercut": {
    types: ["straight", "wavy"],
    densities: ["medium", "thick"],
    insightByHairType: {
      straight: "Streams straight back with razor-sharp contrast against disconnected shaved sides.",
      wavy: "Waves create effortless dimensional ridges when swept back without looking overly stiff.",
      curly: "Requires heavier wax or pomade to lock down curl bounce when combing straight back.",
      coily: "Best styled with edge control gel and du-rag compression for wave compression.",
    },
    stylingProduct: "Classic water-based pomade",
  },
  "buzz-cut": {
    types: ["straight", "wavy", "curly", "coily"],
    densities: ["fine", "medium", "thick"],
    insightByHairType: {
      straight: "Clean, minimalist, showing exact scalp symmetry and hairline structure.",
      wavy: "Zero maintenance; reveals hair follicle health and clean hairline.",
      curly: "Very clean look, highlights face features with zero curl maintenance.",
      coily: "Ideal for 360 wave brushing or sharp clipper grade-1 edge up.",
    },
    stylingProduct: "Scalp moisturizer / Sunscreen oil",
  },
  "side-part": {
    types: ["straight", "wavy"],
    densities: ["fine", "medium", "thick"],
    insightByHairType: {
      straight: "Parts with surgical precision; timeless executive silhouette for straight textures.",
      wavy: "Soft, modern side part where waves give natural lift at the parting line.",
      curly: "Requires parting while damp; curls sweep across creating rich volume on the parted side.",
      coily: "A hard part line carved with clippers is recommended for maximum definition.",
    },
    stylingProduct: "Medium hold styling cream / Grooming spray",
  },
  "quiff": {
    types: ["straight", "wavy"],
    densities: ["medium", "thick"],
    insightByHairType: {
      straight: "Requires round-brush blow drying upward to lock in the forward-to-back lift.",
      wavy: "Waves naturally lift up and back, creating an effortlessly textured messy quiff.",
      curly: "Natural spring creates high-volume quiff with zero backcombing required.",
      coily: "Afro-textured sponge quiff brings high structural height with tight tapered sides.",
    },
    stylingProduct: "Volumizing mousse / Texture paste",
  },
  "curtain-fringe": {
    types: ["straight", "wavy"],
    densities: ["fine", "medium"],
    insightByHairType: {
      straight: "Falls into the classic 90s Leonardo DiCaprio drape framing the cheekbones.",
      wavy: "Waves fan outward naturally, giving the dreamiest flow and movement.",
      curly: "Curls frame the temple with ringlets; requires leave-in conditioner to prevent frizz.",
      coily: "Requires two-strand twists or braid-out to create parted curtain flow.",
    },
    stylingProduct: "Lightweight leave-in spray / Sea salt mist",
  },
  "high-fade-afro": {
    types: ["coily", "curly"],
    densities: ["thick", "medium"],
    insightByHairType: {
      coily: "Perfection: natural high density holds a pristine sculptured crown with tight skin fade.",
      curly: "Tight curls form a spongy, voluminous dome balanced by sharp faded temples.",
      wavy: "Wavy hair lacks the structural rigidity for an afro shape; adapts as a high-top textured drop.",
      straight: "Straight hair cannot hold this silhouette without perming.",
    },
    stylingProduct: "Shea butter curl cream / Twist sponge",
  },
  "wolf-cut": {
    types: ["wavy", "curly"],
    densities: ["thick", "medium"],
    insightByHairType: {
      wavy: "The holy grail cut for wavy hair: shaggy perimeter with disconnected layers that bounce.",
      curly: "Curls explode with layered definition without turning into an unmanageable triangle.",
      straight: "Straight hair needs internal razoring and texturizing spray to prevent falling limp.",
      coily: "Creates a gorgeous textured halo with graduated layers framing the jaw.",
    },
    stylingProduct: "Texturizing sea salt spray / Curl cream",
  },
  "french-bob": {
    types: ["straight", "wavy"],
    densities: ["medium", "fine", "thick"],
    insightByHairType: {
      straight: "Sharp, chin-grazing Parisian blunt lines that accentuate the jawline.",
      wavy: "Delightful tousled texture with airy movement at the cheekbones.",
      curly: "Voluminous, romantic rounded bob with bouncy curls hugging the jaw.",
      coily: "Full, sculpted bob with rich texture and strong silhouette presence.",
    },
    stylingProduct: "Finishing serum / Texture paste",
  },
  "butterfly-cut": {
    types: ["wavy", "straight"],
    densities: ["thick", "medium"],
    insightByHairType: {
      wavy: "Dynamic wing-like layers catch the breeze, giving blowout bounce with zero heat styling.",
      straight: "Creates optical volume and sweeping layers on long, heavy straight strands.",
      curly: "Removes interior weight so long curls do not weigh down at the scalp.",
      coily: "Provides beautiful cascading tier volume throughout mid-lengths.",
    },
    stylingProduct: "Volumizing spray / Smoothing oil",
  },
};

/**
 * Enriches each hairstyle in the catalog with Hair-Type suitability scoring,
 * native texture affinities, and tailored stylist advice for this specific customer.
 */
export function getHairstylesClassifiedByHairType(
  analysis: HairAnalysis | null,
  categoryFilter: HairTypeCategory = "all"
): EnrichedExploreStyle[] {
  const customerProfile = extractCustomerHairTypeProfile(analysis);
  const customerGender = (analysis?.gender || "").toLowerCase();

  return HAIRSTYLES.filter((item) => {
    // 1. Gender filtering
    if (customerGender.startsWith("m") && item.category === "Women") return false;
    if (customerGender.startsWith("f") && item.category === "Men") return false;

    // 2. Category / Hair Type Tab Filtering
    if (categoryFilter === "my_type") {
      const map = STYLE_HAIR_TYPE_MAP[item.id];
      const hasNative = map ? map.types.includes(customerProfile.primaryType) : true;
      const rawMatches = (item.specs.hairTexture || "").toLowerCase().includes(customerProfile.primaryType);
      return hasNative || rawMatches;
    }
    if (categoryFilter === "straight") {
      const map = STYLE_HAIR_TYPE_MAP[item.id];
      return map ? map.types.includes("straight") : item.specs.hairTexture.toLowerCase().includes("straight");
    }
    if (categoryFilter === "wavy") {
      const map = STYLE_HAIR_TYPE_MAP[item.id];
      return map ? map.types.includes("wavy") : item.specs.hairTexture.toLowerCase().includes("wavy");
    }
    if (categoryFilter === "curly") {
      const map = STYLE_HAIR_TYPE_MAP[item.id];
      return map ? map.types.includes("curly") : item.specs.hairTexture.toLowerCase().includes("curly");
    }
    if (categoryFilter === "coily") {
      const map = STYLE_HAIR_TYPE_MAP[item.id];
      return map ? map.types.includes("coily") : item.specs.hairTexture.toLowerCase().includes("coily");
    }
    if (categoryFilter === "thick") {
      const map = STYLE_HAIR_TYPE_MAP[item.id];
      return map ? map.densities.includes("thick") : item.specs.hairTexture.toLowerCase().includes("thick");
    }
    if (categoryFilter === "fine") {
      const map = STYLE_HAIR_TYPE_MAP[item.id];
      return map ? map.densities.includes("fine") : item.specs.hairTexture.toLowerCase().includes("fine");
    }
    return true; // "all"
  })
    .map((item) => {
      const map = STYLE_HAIR_TYPE_MAP[item.id];
      const nativeHairTypes = map?.types || (item.specs.hairTexture.toLowerCase().includes("wavy")
        ? ["wavy"]
        : item.specs.hairTexture.toLowerCase().includes("curly")
        ? ["curly"]
        : item.specs.hairTexture.toLowerCase().includes("coily")
        ? ["coily"]
        : ["straight"]);

      const targetDensities = map?.densities || ["medium", "thick"];

      const isNativeToCustomerType = nativeHairTypes.includes(customerProfile.primaryType);
      const isDensityMatch = targetDensities.includes(customerProfile.density);

      // Score heavily calculated based on hair type synergy
      let score = 75;
      if (isNativeToCustomerType) score += 18;
      if (isDensityMatch) score += 7;

      // Face shape synergy bonus
      if (analysis?.faceShape && item.specs.faceShapes.includes(analysis.faceShape)) {
        score += 5;
      }
      score = Math.min(score, 99);

      const hairTypeInsight =
        map?.insightByHairType?.[customerProfile.primaryType] ||
        `Crafted to work with ${customerProfile.typeLabel} hair, providing balanced proportions and natural hold.`;

      const recommendedStylingForCustomer =
        map?.stylingProduct || customerProfile.recommendedProductType;

      return {
        ...item,
        hairTypeMatchScore: score,
        isNativeToCustomerType,
        nativeHairTypes,
        targetDensities,
        hairTypeInsight,
        recommendedStylingForCustomer,
        lengthFeasibilityStatus: "ideal" as const,
      };
    })
    .sort((a, b) => b.hairTypeMatchScore - a.hairTypeMatchScore);
}
