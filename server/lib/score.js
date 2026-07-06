// Matching is pure math — no AI at request time.
// score = 1 - (1/n) * sum( min(1, |x - t| / (tolerance * t)) ) over the
// attributes the user actually specified. Band-style attributes (protein
// min/max, calorie min/max, carb preference) contribute 0 inside the band and
// distance-to-nearest-edge outside.
//
// The tolerance band defaults to ±10%. When zero dishes land inside it, the
// search handler re-runs the ranking at the wider steps below and flags the
// results so the UI can tell the user their filters were loosened.

export const BASE_TOLERANCE = 0.1;
export const TOLERANCE_STEPS = [0.1, 0.25, 0.5];
// A dish "fits" (sits inside the band) when every specified attribute is
// in-band, i.e. every penalty is 0 and the score is a perfect 100.
export const IN_BAND_SCORE = 100;

const CARB_BANDS = {
  low: [0, 35],
  moderate: [35, 75],
  high: [75, Infinity],
};

// Profile allergies arrive as category words ("shellfish", "nuts") that never
// appear verbatim in menu text, so each exclusion term also matches its
// common concrete forms.
const EXCLUDE_SYNONYMS = {
  shellfish: ["shrimp", "crab", "lobster", "scallop", "oyster", "clam", "mussel"],
  nut: ["peanut", "almond", "cashew", "walnut", "pistachio", "pecan", "hazelnut"],
  peanut: ["peanut butter"],
  dairy: ["cheese", "feta", "paneer", "yogurt", "milk", "butter", "cream", "tzatziki", "queso", "bleu"],
  gluten: ["bread", "bun", "pita", "wrap", "tortilla", "pasta", "noodle", "toast", "dosa", "crepe"],
  egg: ["tamago", "mayo"],
  soy: ["tofu", "edamame", "soba", "tempeh", "miso"],
  sesame: ["tahini"],
};

function expandExcludeTerm(term) {
  const t = String(term).trim().toLowerCase();
  if (!t) return [];
  const singular = t.endsWith("s") ? t.slice(0, -1) : t;
  return [t, ...(EXCLUDE_SYNONYMS[t] ?? EXCLUDE_SYNONYMS[singular] ?? [])];
}

function bandPenalty(value, min, max, tolerance) {
  if (value >= min && value <= max) return 0;
  const edge = value < min ? min : max;
  const t = tolerance * Math.max(edge, 1);
  return Math.min(1, Math.abs(value - edge) / t);
}

function targetPenalty(value, target, tolerance) {
  const t = tolerance * Math.max(target, 1);
  return Math.min(1, Math.abs(value - target) / t);
}

export function passesHardFilters(item, filters) {
  if (filters.protein_source && item.protein_source !== filters.protein_source) {
    return false;
  }
  if (filters.diet_pattern) {
    const diet = filters.diet_pattern;
    if (diet === "vegetarian" && !item.tags.includes("vegetarian")) return false;
    if (diet === "vegan" && !item.tags.includes("vegan")) return false;
    if (diet === "halal" && !item.tags.includes("halal")) return false;
    if (diet === "keto" && item.estimated_carbs_g > 35) return false;
  }
  // Exclusions (typed "no X" terms plus profile allergies/dislikes) are hard
  // filters: they survive tolerance widening and never come back.
  if (Array.isArray(filters.exclude_terms) && filters.exclude_terms.length > 0) {
    const haystack = `${item.name} ${item.description} ${item.protein_source}`.toLowerCase();
    for (const term of filters.exclude_terms) {
      for (const t of expandExcludeTerm(term)) {
        if (haystack.includes(t)) return false;
      }
    }
  }
  return true;
}

export function scoreItem(item, filters, tolerance = BASE_TOLERANCE) {
  const penalties = [];

  const pMin = filters.protein_grams_min;
  const pMax = filters.protein_grams_max;
  if (pMin != null || pMax != null) {
    penalties.push(
      bandPenalty(item.estimated_protein_g, pMin ?? 0, pMax ?? Infinity, tolerance)
    );
  }

  if (filters.carb_preference && CARB_BANDS[filters.carb_preference]) {
    const [lo, hi] = CARB_BANDS[filters.carb_preference];
    penalties.push(bandPenalty(item.estimated_carbs_g, lo, hi, tolerance));
  }

  if (filters.calorie_target != null) {
    penalties.push(targetPenalty(item.estimated_calories, filters.calorie_target, tolerance));
  }

  // Fuzzy terms ("light", "filling") set a ceiling or floor rather than a target.
  const cMin = filters.calorie_min;
  const cMax = filters.calorie_max;
  if (cMin != null || cMax != null) {
    penalties.push(
      bandPenalty(item.estimated_calories, cMin ?? 0, cMax ?? Infinity, tolerance)
    );
  }

  if (filters.fat_target != null) {
    penalties.push(targetPenalty(item.estimated_fat_g, filters.fat_target, tolerance));
  }

  if (filters.price_max != null) {
    penalties.push(
      item.price <= filters.price_max
        ? 0
        : Math.min(1, (item.price - filters.price_max) / (tolerance * filters.price_max))
    );
  }

  if (filters.wants_vegetables === true) {
    penalties.push(item.tags.includes("veggies") ? 0 : 1);
  }

  // No constraints given: everything is an equal, neutral match.
  if (penalties.length === 0) return 0.5;

  const avg = penalties.reduce((a, b) => a + b, 0) / penalties.length;
  return 1 - avg;
}

export function rankItems(items, filters, tolerance = BASE_TOLERANCE) {
  return items
    .filter((item) => passesHardFilters(item, filters))
    .map((item) => ({ ...item, match_score: Math.round(scoreItem(item, filters, tolerance) * 100) }))
    .sort((a, b) => b.match_score - a.match_score);
}

// Empty-state handling: if nothing sits fully inside the ±10% band, widen the
// band step by step. Returns the ranking plus how far it had to widen, and
// marks each dish that would have missed the original request.
export function rankWithWidening(items, filters) {
  const hasSoftConstraints =
    filters.protein_grams_min != null || filters.protein_grams_max != null ||
    filters.carb_preference != null || filters.calorie_target != null ||
    filters.calorie_min != null || filters.calorie_max != null ||
    filters.fat_target != null || filters.price_max != null ||
    filters.wants_vegetables === true;

  const strict = rankItems(items, filters, BASE_TOLERANCE);
  if (!hasSoftConstraints || strict.some((r) => r.match_score >= IN_BAND_SCORE)) {
    return { results: strict, widened: false, tolerance: BASE_TOLERANCE };
  }

  // Nothing fit the original band, so every dish shown is outside the
  // original request — flag them all so the UI can say why they appear.
  for (const tolerance of TOLERANCE_STEPS.slice(1)) {
    const widenedResults = rankItems(items, filters, tolerance);
    const anyInBand = widenedResults.some((r) => r.match_score >= IN_BAND_SCORE);
    if (anyInBand || tolerance === TOLERANCE_STEPS[TOLERANCE_STEPS.length - 1]) {
      return {
        results: widenedResults.map((r) => ({ ...r, outside_original_request: true })),
        widened: true,
        tolerance,
      };
    }
  }
  // Unreachable (last step always returns), but keep a safe fallback.
  return { results: strict, widened: false, tolerance: BASE_TOLERANCE };
}
