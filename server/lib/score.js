// Matching is pure math — no AI at request time.
// score = 1 - (1/n) * sum( min(1, |x - t| / (0.10 * t)) ) over the attributes
// the user actually specified. Band-style attributes (protein min/max, carb
// preference) contribute 0 inside the band and distance-to-nearest-edge outside.

const CARB_BANDS = {
  low: [0, 35],
  moderate: [35, 75],
  high: [75, Infinity],
};

function bandPenalty(value, min, max) {
  if (value >= min && value <= max) return 0;
  const edge = value < min ? min : max;
  const tolerance = 0.1 * Math.max(edge, 1);
  return Math.min(1, Math.abs(value - edge) / tolerance);
}

function targetPenalty(value, target) {
  const tolerance = 0.1 * Math.max(target, 1);
  return Math.min(1, Math.abs(value - target) / tolerance);
}

export function passesHardFilters(item, filters) {
  if (filters.protein_source && item.protein_source !== filters.protein_source) {
    // "plant" also admits dairy/egg for vegetarians who said plant-based? Keep strict.
    return false;
  }
  if (filters.diet_pattern) {
    const diet = filters.diet_pattern;
    if (diet === "vegetarian" && !item.tags.includes("vegetarian")) return false;
    if (diet === "vegan" && !item.tags.includes("vegan")) return false;
    if (diet === "halal" && !item.tags.includes("halal")) return false;
    if (diet === "keto" && item.estimated_carbs_g > 35) return false;
  }
  if (Array.isArray(filters.exclude_terms) && filters.exclude_terms.length > 0) {
    const haystack = `${item.name} ${item.description} ${item.protein_source}`.toLowerCase();
    for (const term of filters.exclude_terms) {
      const t = String(term).trim().toLowerCase();
      if (t && haystack.includes(t)) return false;
    }
  }
  return true;
}

export function scoreItem(item, filters) {
  const penalties = [];

  const pMin = filters.protein_grams_min;
  const pMax = filters.protein_grams_max;
  if (pMin != null || pMax != null) {
    penalties.push(
      bandPenalty(item.estimated_protein_g, pMin ?? 0, pMax ?? Infinity)
    );
  }

  if (filters.carb_preference && CARB_BANDS[filters.carb_preference]) {
    const [lo, hi] = CARB_BANDS[filters.carb_preference];
    penalties.push(bandPenalty(item.estimated_carbs_g, lo, hi));
  }

  if (filters.calorie_target != null) {
    penalties.push(targetPenalty(item.estimated_calories, filters.calorie_target));
  }

  if (filters.fat_target != null) {
    penalties.push(targetPenalty(item.estimated_fat_g, filters.fat_target));
  }

  if (filters.price_max != null) {
    penalties.push(
      item.price <= filters.price_max
        ? 0
        : Math.min(1, (item.price - filters.price_max) / (0.1 * filters.price_max))
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

export function rankItems(items, filters) {
  return items
    .filter((item) => passesHardFilters(item, filters))
    .map((item) => ({ ...item, match_score: Math.round(scoreItem(item, filters) * 100) }))
    .sort((a, b) => b.match_score - a.match_score);
}
