import Anthropic from "@anthropic-ai/sdk";

// Job A (query parsing) and the explanation call both run on Claude Haiku 4.5 —
// cheap, fast, good enough for structured extraction and two-sentence prose.
// When ANTHROPIC_API_KEY is absent, deterministic fallbacks keep the app usable.

const MODEL = "claude-haiku-4-5";

let client = null;
export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const FILTER_SCHEMA = {
  type: "object",
  properties: {
    protein_grams_min: { type: ["number", "null"], description: "Minimum grams of protein, if stated or implied (e.g. 'high protein' ~ 40)." },
    protein_grams_max: { type: ["number", "null"] },
    carb_preference: { type: ["string", "null"], enum: ["low", "moderate", "high", null] },
    protein_source: { type: ["string", "null"], enum: ["beef", "chicken", "fish", "plant", "egg", "dairy", null] },
    wants_vegetables: { type: ["boolean", "null"], description: "True if the user asked for vegetables, greens, or a salad side." },
    calorie_target: { type: ["number", "null"] },
    fat_target: { type: ["number", "null"] },
    price_max: { type: ["number", "null"], description: "Max price in dollars, if a budget was stated." },
    diet_pattern: { type: ["string", "null"], enum: ["vegetarian", "vegan", "keto", "halal", "kosher", null] },
    exclude_terms: { type: "array", items: { type: "string" }, description: "Foods the user wants to avoid, lowercase single words." }
  },
  required: [
    "protein_grams_min", "protein_grams_max", "carb_preference", "protein_source",
    "wants_vegetables", "calorie_target", "fat_target", "price_max", "diet_pattern", "exclude_terms"
  ],
  additionalProperties: false,
};

export async function parseQuery(text) {
  if (!aiAvailable()) {
    return { filters: fallbackParse(text), source: "fallback" };
  }
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You convert a diner's free-text meal request into a structured filter object. " +
        "Extract only what the user actually said or clearly implied; use null for everything else. " +
        "'High protein' with no number implies protein_grams_min 40. 'Low carb' or 'keto-ish' implies carb_preference low. " +
        "Steak/burger/beef -> beef. Salmon/tuna/seafood -> fish. Tofu/plant-based -> plant.",
      messages: [{ role: "user", content: text }],
      output_config: {
        format: { type: "json_schema", schema: FILTER_SCHEMA },
      },
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return { filters: JSON.parse(textBlock.text), source: "claude" };
  } catch (err) {
    console.error("parse-query: Claude call failed, using fallback parser:", err.message);
    return { filters: fallbackParse(text), source: "fallback" };
  }
}

export async function explainMatch({ item, restaurant, query, filters }) {
  if (aiAvailable()) {
    try {
      const response = await getClient().messages.create({
        model: MODEL,
        max_tokens: 300,
        system:
          "You write a 2-3 sentence explanation of why a specific dish matches a diner's request. " +
          "Be concrete about the numbers (protein, carbs, calories, price) and warm but not salesy. Plain text only.",
        messages: [
          {
            role: "user",
            content:
              `Diner's request: "${query}"\n` +
              `Parsed goals: ${JSON.stringify(filters)}\n` +
              `Dish: ${item.name} at ${restaurant.name} (${restaurant.neighborhood}) — $${item.price.toFixed(2)}, ` +
              `${item.estimated_calories} cal, ${item.estimated_protein_g}g protein, ` +
              `${item.estimated_carbs_g}g carbs, ${item.estimated_fat_g}g fat. ${item.description}`,
          },
        ],
      });
      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock) return { explanation: textBlock.text.trim(), source: "claude" };
    } catch (err) {
      console.error("explain: Claude call failed, using template:", err.message);
    }
  }
  return { explanation: templateExplanation({ item, restaurant, filters }), source: "fallback" };
}

// ---------------------------------------------------------------------------
// Deterministic fallbacks (no API key required)

export function fallbackParse(raw) {
  const text = raw.toLowerCase();
  const filters = {
    protein_grams_min: null,
    protein_grams_max: null,
    carb_preference: null,
    protein_source: null,
    wants_vegetables: null,
    calorie_target: null,
    fat_target: null,
    price_max: null,
    diet_pattern: null,
    exclude_terms: [],
  };

  const proteinRange = text.match(/(\d{2,3})\s*(?:to|-|–)\s*(\d{2,3})\s*g(?:rams)?\s*(?:of\s*)?protein/);
  const proteinSingle = text.match(/(?:at least\s*)?(\d{2,3})\s*(?:\+\s*)?g(?:rams)?\s*(?:of\s*)?protein/);
  if (proteinRange) {
    filters.protein_grams_min = Number(proteinRange[1]);
    filters.protein_grams_max = Number(proteinRange[2]);
  } else if (proteinSingle) {
    filters.protein_grams_min = Number(proteinSingle[1]);
  } else if (/high[\s-]?protein/.test(text)) {
    filters.protein_grams_min = 40;
  }

  const calories = text.match(/(?:under|around|about|max)?\s*(\d{3,4})\s*(?:k?cal|calories)/);
  if (calories) filters.calorie_target = Number(calories[1]);

  // Price needs an explicit money marker ($ or "dollars"/"bucks") so that
  // "around 600 calories" never reads as a budget.
  const price =
    text.match(/(?:under|less than|below|max|budget of|around)\s*\$\s*(\d{1,3})\b/) ||
    text.match(/\$\s*(\d{1,3})(?:\.\d{2})?\b/) ||
    text.match(/(\d{1,3})\s*(?:dollars|bucks)\b/);
  if (price) filters.price_max = Number(price[1]);

  if (/\b(?:low[\s-]?carb|keto)\b/.test(text)) filters.carb_preference = "low";
  else if (/\bhigh[\s-]?carb|carb[\s-]?load/.test(text)) filters.carb_preference = "high";

  // A protein keyword preceded by a negation ("no chicken") is an exclusion,
  // not a preference.
  const sourcePatterns = [
    ["beef", /\b(?:beef|steak|burger|kabob|kebab)\b/],
    ["chicken", /\b(?:chicken|poultry)\b/],
    ["fish", /\b(?:fish|salmon|tuna|seafood|poke|sushi)\b/],
    ["plant", /\b(?:tofu|plant[\s-]?based|tempeh)\b/],
  ];
  for (const [source, pattern] of sourcePatterns) {
    const m = pattern.exec(text);
    if (!m) continue;
    const before = text.slice(Math.max(0, m.index - 12), m.index);
    if (/(?:\bno|\bwithout|\bavoid|\bskip(?:\sthe)?)\s*$/.test(before)) continue;
    filters.protein_source = source;
    break;
  }

  if (/\b(?:veggies?|vegetables?|greens|salad)\b/.test(text)) filters.wants_vegetables = true;

  if (/\bvegan\b/.test(text)) filters.diet_pattern = "vegan";
  else if (/\bvegetarian\b/.test(text)) filters.diet_pattern = "vegetarian";
  else if (/\bketo\b/.test(text)) filters.diet_pattern = "keto";
  else if (/\bhalal\b/.test(text)) filters.diet_pattern = "halal";

  const avoid = text.match(/(?:no|without|avoid|skip the?)\s+([a-z]+)/g);
  if (avoid) {
    const stop = new Set(["a", "the", "any", "more", "too", "carbs", "carb"]);
    filters.exclude_terms = avoid
      .map((m) => m.replace(/^(?:no|without|avoid|skip the?)\s+/, ""))
      .filter((w) => !stop.has(w));
  }

  return filters;
}

function templateExplanation({ item, restaurant, filters }) {
  const parts = [];
  parts.push(
    `${item.name} from ${restaurant.name} brings ${item.estimated_protein_g}g of protein, ` +
      `${item.estimated_carbs_g}g of carbs, and ${item.estimated_calories} calories for $${item.price.toFixed(2)}.`
  );
  const why = [];
  if (filters.protein_grams_min != null) {
    const max = filters.protein_grams_max;
    why.push(
      max != null
        ? `lands inside your ${filters.protein_grams_min}–${max}g protein range`
        : `clears your ${filters.protein_grams_min}g protein floor`
    );
  }
  if (filters.carb_preference === "low") why.push("keeps carbs on the lower side");
  if (filters.price_max != null && item.price <= filters.price_max) why.push(`stays under your $${filters.price_max} budget`);
  if (filters.wants_vegetables && item.tags.includes("veggies")) why.push("comes with a vegetable side");
  if (why.length > 0) {
    parts.push(`It matched because it ${why.join(", ")}.`);
  }
  parts.push("Nutrition values are estimates, not restaurant-verified.");
  return parts.join(" ");
}
