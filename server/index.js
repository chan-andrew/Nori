import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { parseQuery, explainMatch, aiAvailable } from "./lib/ai.js";
import { rankItems } from "./lib/score.js";
import {
  createUser, verifyUser, getUser, updateUser, logOrder, getOrders,
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

function withRestaurant(item) {
  const r = restaurantById.get(item.restaurant_id);
  return {
    ...item,
    restaurant_name: r.name,
    restaurant_neighborhood: r.neighborhood,
    cuisine_type: r.cuisine_type,
    uber_eats_url: r.uber_eats_url,
  };
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: aiAvailable() ? "claude-haiku-4-5" : "fallback-parser" });
});

// Job A: free text -> structured filters
app.post("/api/parse-query", async (req, res) => {
  const text = (req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  const { filters, source } = await parseQuery(text);
  res.json({ filters, source });
});

// Filters -> ranked dishes. /api/refine is the same computation on adjusted
// filters; both accept the full filter object so the client stays stateless.
function searchHandler(req, res) {
  const filters = req.body?.filters ?? {};
  const results = rankItems(menuItems, filters).map(withRestaurant);
  res.json({ results, count: results.length });
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

// --- Auth & profile (local MVP implementation; Firebase swap planned) ------

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
  const { user_id, menu_item_id, filters } = req.body ?? {};
  if (!itemById.has(menu_item_id)) {
    return res.status(400).json({ error: "menu_item_id is required and must exist" });
  }
  const order = logOrder({ userId: user_id, menuItemId: menu_item_id, filters });
  res.status(201).json({ order });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`Nori server on http://localhost:${PORT}`);
  console.log(`AI parsing: ${aiAvailable() ? "Claude Haiku 4.5" : "fallback heuristics (set ANTHROPIC_API_KEY in server/.env to enable Claude)"}`);
});
