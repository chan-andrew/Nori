import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { parseQuery, explainMatch, aiAvailable } from "./lib/ai.js";
import { rankWithWidening } from "./lib/score.js";
import { distanceMiles, deliveryEstimate, isValidLocation, MAX_RADIUS_MILES } from "./lib/geo.js";
import {
  createUser, verifyUser, getUser, updateUser, logOrder, getOrders,
  getFavorites, addFavorite, removeFavorite,
  logQuery, setQueryLogSelection, getQueryLogs,
} from "./lib/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  // no .env — fall back to whatever is already in the environment
}

const restaurants = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "restaurants.json"), "utf8"));
const menuItems = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "menu-items.json"), "utf8"));
const restaurantById = new Map(restaurants.map((r) => [r.id, r]));
const itemById = new Map(menuItems.map((m) => [m.id, m]));

function withRestaurant(item, location = null) {
  const r = restaurantById.get(item.restaurant_id);
  const enriched = {
    ...item,
    restaurant_name: r.name,
    restaurant_neighborhood: r.neighborhood,
    restaurant_address: r.address,
    cuisine_type: r.cuisine_type,
    doordash_url: r.doordash_url,
  };
  if (isValidLocation(location)) {
    const miles = distanceMiles(
      { lat: Number(location.lat), lng: Number(location.lng) },
      { lat: r.lat, lng: r.lng }
    );
    const eta = deliveryEstimate(miles);
    enriched.distance_miles = Math.round(miles * 10) / 10;
    enriched.delivery_minutes_low = eta.low;
    enriched.delivery_minutes_high = eta.high;
  }
  return enriched;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: aiAvailable() ? "claude-haiku-4-5" : "fallback-parser" });
});

// Job A: free text -> structured filters. Every parse is logged (raw query,
// parsed filters, timestamp); the log id comes back so the client can attach
// the selected dish later.
app.post("/api/parse-query", async (req, res) => {
  const text = (req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  const { filters, source } = await parseQuery(text);
  const log = logQuery({ rawQuery: text, parsedFilters: filters, userId: req.body?.user_id ?? null });
  res.json({ filters, source, query_log_id: log.id });
});

// Filters (+ optional location) -> ranked dishes. /api/refine is the same
// computation on adjusted filters; both accept the full filter object so the
// client stays stateless.
//
// With five neighborhoods in the dataset, a known location first trims the
// pool to restaurants within MAX_RADIUS_MILES, then the scoring pass runs.
// If nothing sits inside the ±10% tolerance band, the band widens
// automatically and every returned dish carries outside_original_request.
function searchHandler(req, res) {
  const filters = req.body?.filters ?? {};
  const location = req.body?.location ?? null;

  let pool = menuItems;
  let locationApplied = false;
  if (isValidLocation(location)) {
    const origin = { lat: Number(location.lat), lng: Number(location.lng) };
    const nearIds = new Set(
      restaurants
        .filter((r) => distanceMiles(origin, r) <= MAX_RADIUS_MILES)
        .map((r) => r.id)
    );
    if (nearIds.size > 0) {
      pool = menuItems.filter((m) => nearIds.has(m.restaurant_id));
      locationApplied = true;
    }
  }

  const { results, widened, tolerance } = rankWithWidening(pool, filters);
  res.json({
    results: results.map((item) => withRestaurant(item, location)),
    count: results.length,
    widened,
    tolerance,
    location_applied: locationApplied,
  });
}
app.post("/api/search", searchHandler);
app.post("/api/refine", searchHandler);

// One dish + original query -> short explanation (runs once per selection)
app.post("/api/explain", async (req, res) => {
  const { menu_item_id, query, filters } = req.body ?? {};
  const item = itemById.get(menu_item_id);
  if (!item) return res.status(404).json({ error: "menu item not found" });
  const restaurant = restaurantById.get(item.restaurant_id);
  const { explanation, source } = await explainMatch({
    item, restaurant, query: query ?? "", filters: filters ?? {},
  });
  res.json({ explanation, source });
});

// --- Auth & profile (local fallback; Firebase Auth + Firestore take over
// --- when the client is configured with a Firebase project) ---------------

app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Email and a password of at least 8 characters are required." });
  }
  try {
    const user = createUser(email, password);
    res.status(201).json({ user });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  const user = email && password ? verifyUser(email, password) : null;
  if (!user) return res.status(401).json({ error: "Invalid email or password." });
  res.json({ user });
});

app.get("/api/profile/:userId", (req, res) => {
  const user = getUser(req.params.userId);
  if (!user) return res.status(404).json({ error: "user not found" });

  const orders = getOrders(user.id)
    .map((o) => {
      const item = itemById.get(o.menu_item_id);
      return item ? { ...o, item: withRestaurant(item) } : o;
    })
    .sort((a, b) => b.ordered_at.localeCompare(a.ordered_at));

  // Lightweight personalization stats from order history
  const itemsOrdered = orders.map((o) => o.item).filter(Boolean);
  const stats = itemsOrdered.length === 0 ? null : {
    order_count: itemsOrdered.length,
    avg_price: itemsOrdered.reduce((s, i) => s + i.price, 0) / itemsOrdered.length,
    avg_protein_g: Math.round(itemsOrdered.reduce((s, i) => s + i.estimated_protein_g, 0) / itemsOrdered.length),
    avg_calories: Math.round(itemsOrdered.reduce((s, i) => s + i.estimated_calories, 0) / itemsOrdered.length),
    top_protein_source: Object.entries(
      itemsOrdered.reduce((acc, i) => ((acc[i.protein_source] = (acc[i.protein_source] ?? 0) + 1), acc), {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  };

  res.json({ user, orders, stats });
});

app.put("/api/profile/:userId", (req, res) => {
  const user = updateUser(req.params.userId, req.body ?? {});
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json({ user });
});

app.post("/api/orders", (req, res) => {
  const { user_id, menu_item_id, filters, query_log_id } = req.body ?? {};
  if (!itemById.has(menu_item_id)) {
    return res.status(400).json({ error: "menu_item_id is required and must exist" });
  }
  const order = logOrder({ userId: user_id, menuItemId: menu_item_id, filters });
  if (query_log_id) setQueryLogSelection(query_log_id, menu_item_id);
  res.status(201).json({ order });
});

// --- Favorites (local fallback for the Firestore `favorites` collection) ---

app.get("/api/favorites/:userId", (req, res) => {
  const favorites = getFavorites(req.params.userId).map((f) => {
    const item = itemById.get(f.menu_item_id);
    return item ? { ...f, item: withRestaurant(item) } : f;
  });
  res.json({ favorites });
});

app.post("/api/favorites", (req, res) => {
  const { user_id, menu_item_id } = req.body ?? {};
  if (!user_id || !itemById.has(menu_item_id)) {
    return res.status(400).json({ error: "user_id and an existing menu_item_id are required" });
  }
  const favorite = addFavorite({ userId: user_id, menuItemId: menu_item_id });
  res.status(201).json({ favorite });
});

app.delete("/api/favorites/:userId/:menuItemId", (req, res) => {
  const removed = removeFavorite(req.params.userId, req.params.menuItemId);
  res.json({ removed });
});

// --- Query logs (local fallback for the Firestore `query_logs` collection) -
// GET supports ?format=csv for the weekly spreadsheet review.

app.get("/api/query-logs", (req, res) => {
  const logs = getQueryLogs();
  if (req.query.format === "csv") {
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["id", "timestamp", "raw_query", "parsed_filters", "selected_dish_id"].join(","),
      ...logs.map((l) =>
        [esc(l.id), esc(l.timestamp), esc(l.raw_query), esc(JSON.stringify(l.parsed_filters)), esc(l.selected_dish_id)].join(",")
      ),
    ];
    res.type("text/csv").attachment("nori-query-logs.csv").send(rows.join("\n"));
    return;
  }
  res.json({ logs });
});

app.patch("/api/query-logs/:id", (req, res) => {
  const entry = setQueryLogSelection(req.params.id, req.body?.selected_dish_id ?? null);
  if (!entry) return res.status(404).json({ error: "query log not found" });
  res.json({ log: entry });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`Nori server on http://localhost:${PORT}`);
  console.log(`AI parsing: ${aiAvailable() ? "Claude Haiku 4.5" : "fallback heuristics (set ANTHROPIC_API_KEY in server/.env to enable Claude)"}`);
});
