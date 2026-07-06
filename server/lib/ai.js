import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

// Job A (query parsing) and the explanation call both run on Claude Haiku 4.5 —
// cheap, fast, good enough for structured extraction and two-sentence prose.
// When ANTHROPIC_API_KEY is absent, deterministic fallbacks keep the app usable.
//
// Vague language ("light", "comfort food") is handled by the fuzzy term table
// in data/fuzzy_terms.json — a prompt-level mapping, not training or fine
// tuning. The weekly query-log review grows the table; the model never changes.

const MODEL = "claude-haiku-4-5";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FUZZY_TERMS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "fuzzy_terms.json"), "utf8")
);

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
    protein_source: { type: ["string", "null"], enum: ["beef", "chicken", "turkey", "fish", "lamb", "pork", "plant", "egg", "dairy", null] },
    wants_vegetables: { type: ["boolean", "null"], description: "True if the user asked for vegetables, greens, or a salad side." },
    calorie_target: { type: ["number", "null"], description: "A stated calorie number to aim at (e.g. 'around 600 calories')." },
    calorie_min: { type: ["number", "null"], description: "Calorie floor, from an explicit statement or a fuzzy term like 'filling'." },
    calorie_max: { type: ["number", "null"], description: "Calorie ceiling, from an explicit statement or a fuzzy term like 'light'." },
    fat_target: { type: ["number", "null"] },
    price_max: { type: ["number", "null"], description: "Max price in dollars, if a budget was stated or implied." },
    diet_pattern: { type: ["string", "null"], enum: ["vegetarian", "vegan", "keto", "halal", "kosher", null] },
    exclude_terms: { type: "array", items: { type: "string" }, description: "Foods the user wants to avoid, lowercase single words." }
  },
  required: [
    "protein_grams_min", "protein_grams_max", "carb_preference", "protein_source",
    "wants_vegetables", "calorie_target", "calorie_min", "calorie_max",
    "fat_target", "price_max", "diet_pattern", "exclude_terms"
  ],
  additionalProperties: false,
};

// Four worked examples: raw sentence -> matched fuzzy terms -> correct output.
// They teach the matching pattern beyond the table itself. Grow this list when
// the weekly query-log review finds a repeated miss.
const FUZZY_EXAMPLES = `
Example 1
Sentence: "Something light after class, at least 45 grams of protein"
Matched fuzzy terms: "light"
Output: protein_grams_min 45 (explicit number wins), calorie_max 500 (from "light"), every other filter null, exclude_terms [].

Example 2
Sentence: "Comfort food night, keep it under $15"
Matched fuzzy terms: "comfort food"
Output: price_max 15 (explicit number wins), carb_preference "high" and calorie_max null (from "comfort food"), every other filter null, exclude_terms [].

Example 3
Sentence: "Quick bite, keto friendly"
Matched fuzzy terms: "quick bite", "keto friendly"
Output: price_max 10 (from "quick bite"), carb_preference "low" and fat_target null (from "keto friendly"), every other filter null, exclude_terms [].

Example 4
Sentence: "Filling bowl, no shrimp"
Matched fuzzy terms: "filling"
Output: calorie_min 700 (from "filling"), exclude_terms ["shrimp"], every other filter null. "Bowl" matches nothing in the table and no number backs it, so no other filter is set.
`.trim();

function parseSystemPrompt() {
  return (
    "You convert a diner's free-text meal request into a structured filter object.\n\n" +
    "Order of operations:\n" +
    "1. Read the sentence for explicit numbers first (grams of protein, calories, dollars). Fill those filters directly. A stated number always overrides a fuzzy term default.\n" +
    "2. Read the sentence for fuzzy terms second, using the fuzzy term table below. Fill remaining filters from the table.\n" +
    "3. Leave every other filter empty (null).\n\n" +
    "Fuzzy term table (term -> filter defaults it sets):\n" +
    FUZZY_TERMS.map((t) => `- "${t.term}" -> ${JSON.stringify(t.sets)} (${t.note})`).join("\n") +
    "\n\n" +
    FUZZY_EXAMPLES +
    "\n\n" +
    "Fallback rule: when a phrase in the query matches nothing in the table, and no other part of the sentence gives a number, the filter stays null. " +
    "A null filter tells the scoring function to skip that attribute. Never guess a value that has no support in the query.\n\n" +
    "Other hints: 'High protein' with no number implies protein_grams_min 40. 'Low carb' or 'keto-ish' implies carb_preference low. " +
    "Steak/burger/beef -> beef. Salmon/tuna/shrimp/seafood -> fish. Tofu/falafel/plant-based -> plant. Paneer -> dairy."
  );
}

export async function parseQuery(text) {
  if (!aiAvailable()) {
    return { filters: fallbackParse(text), source: "fallback" };
  }
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: parseSystemPrompt(),
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
          "Be concrete about the numbers (protein, carbs, calories, price) and warm but not salesy. " +
          "All nutrition numbers are estimates — say 'estimated' at least once. Plain text only.",
        messages: [
          {
            role: "user",
            content:
              `Diner's request: "${query}"\n` +
              `Parsed goals: ${JSON.stringify(filters)}\n` +
              `Dish: ${item.name} at ${restaurant.name} (${restaurant.neighborhood}) — $${item.price.toFixed(2)}, ` +
              `estimated ${item.estimated_calories} cal, ${item.estimated_protein_g}g protein, ` +
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
  const text = raw.toLowerCase().replace(/[-–]/g, " ");
  const filters = {
    protein_grams_min: null,
    protein_grams_max: null,
    carb_preference: null,
    protein_source: null,
    wants_vegetables: null,
    calorie_target: null,
    calorie_min: null,
    calorie_max: null,
    fat_target: null,
    price_max: null,
    diet_pattern: null,
    exclude_terms: [],
  };

  // Pass 1: explicit numbers. These always beat fuzzy term defaults.
  const proteinRange = text.match(/(\d{2,3})\s*(?:to|-|–)\s*(\d{2,3})\s*g(?:rams)?\s*(?:of\s*)?protein/);
  const proteinSingle = text.match(/(?:at least\s*)?(\d{2,3})\s*(?:\+\s*)?g(?:rams)?\s*(?:of\s*)?protein/);
  if (proteinRange) {
    filters.protein_grams_min = Number(proteinRange[1]);
    filters.protein_grams_max = Number(proteinRange[2]);
  } else if (proteinSingle) {
    filters.protein_grams_min = Number(proteinSingle[1]);
  } else if (/high\s?protein/.test(text)) {
    filters.protein_grams_min = 40;
  }

  const calUnder = text.match(/(?:under|less than|below|max)\s*(\d{3,4})\s*(?:k?cal|calories)/);
  const calOver = text.match(/(?:at least|over|more than)\s*(\d{3,4})\s*(?:k?cal|calories)/);
  const calories = text.match(/(?:around|about)?\s*(\d{3,4})\s*(?:k?cal|calories)/);
  if (calUnder) filters.calorie_max = Number(calUnder[1]);
  else if (calOver) filters.calorie_min = Number(calOver[1]);
  else if (calories) filters.calorie_target = Number(calories[1]);

  // Price needs an explicit money marker ($ or "dollars"/"bucks") so that
  // "around 600 calories" never reads as a budget.
  const price =
    text.match(/(?:under|less than|below|max|budget of|around)\s*\$\s*(\d{1,3})\b/) ||
    text.match(/\$\s*(\d{1,3})(?:\.\d{2})?\b/) ||
    text.match(/(\d{1,3})\s*(?:dollars|bucks)\b/);
  if (price) filters.price_max = Number(price[1]);

  if (/\b(?:low\s?carb|keto)\b/.test(text)) filters.carb_preference = "low";
  else if (/\bhigh\s?carb|carb\s?load/.test(text)) filters.carb_preference = "high";

  // A protein keyword preceded by a negation ("no chicken") is an exclusion,
  // not a preference.
  const sourcePatterns = [
    ["beef", /\b(?:beef|steak|burger|sirloin|bison)\b/],
    ["chicken", /\b(?:chicken|poultry)\b/],
    ["turkey", /\bturkey\b/],
    ["lamb", /\b(?:lamb|gyro|adana)\b/],
    ["fish", /\b(?:fish|salmon|tuna|shrimp|seafood|poke|sushi)\b/],
    ["plant", /\b(?:tofu|plant\s?based|tempeh|falafel)\b/],
    ["dairy", /\bpaneer\b/],
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

  // Pass 2: fuzzy terms fill only the gaps explicit numbers left open.
  // Unmatched phrases set nothing — a null filter means "skip this attribute".
  for (const { term, sets } of FUZZY_TERMS) {
    if (!text.includes(term.replace(/[-–]/g, " "))) continue;
    for (const [key, value] of Object.entries(sets)) {
      if (filters[key] == null || (Array.isArray(filters[key]) && filters[key].length === 0)) {
        filters[key] = value;
      }
    }
  }

  return filters;
}

function templateExplanation({ item, restaurant, filters }) {
  const parts = [];
  parts.push(
    `${item.name} from ${restaurant.name} brings an estimated ${item.estimated_protein_g}g of protein, ` +
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
  if (filters.calorie_max != null && item.estimated_calories <= filters.calorie_max) why.push(`stays under your ${filters.calorie_max}-calorie ceiling`);
  if (filters.calorie_min != null && item.estimated_calories >= filters.calorie_min) why.push("is hearty enough to be filling");
  if (filters.price_max != null && item.price <= filters.price_max) why.push(`stays under your $${filters.price_max} budget`);
  if (filters.wants_vegetables && item.tags.includes("veggies")) why.push("comes with a vegetable side");
  if (why.length > 0) {
    parts.push(`It matched because it ${why.join(", ")}.`);
  }
  parts.push("Nutrition values are estimates, not restaurant-verified.");
  return parts.join(" ");
}
