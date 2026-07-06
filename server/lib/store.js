// Demo-grade persistence: JSON files under data/runtime (gitignored).
// Passwords are scrypt-hashed with a per-user salt. Swap this module for
// Firebase Auth + Firestore without touching the route handlers' shapes.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_DIR = path.join(__dirname, "..", "data", "runtime");
const USERS_FILE = path.join(RUNTIME_DIR, "users.json");
const ORDERS_FILE = path.join(RUNTIME_DIR, "orders.json");
const FAVORITES_FILE = path.join(RUNTIME_DIR, "favorites.json");
const QUERY_LOGS_FILE = path.join(RUNTIME_DIR, "query-logs.json");

function load(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function save(file, data) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function publicUser(user) {
  const { password_hash, salt, ...rest } = user;
  return rest;
}

export function createUser(email, password) {
  const users = load(USERS_FILE, []);
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw Object.assign(new Error("An account with that email already exists."), { status: 409 });
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const user = {
    id: crypto.randomUUID(),
    email,
    auth_provider: "email",
    salt,
    password_hash: hashPassword(password, salt),
    created_at: new Date().toISOString(),
    allergies: "",
    diet_pattern: "none",
    default_calorie_target: null,
    default_protein_target: null,
    disliked_foods: "",
    average_budget: null,
    saved_address: "",
    saved_lat: null,
    saved_lng: null,
    onboarding_complete: false,
  };
  users.push(user);
  save(USERS_FILE, users);
  return publicUser(user);
}

export function verifyUser(email, password) {
  const users = load(USERS_FILE, []);
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  const candidate = hashPassword(password, user.salt);
  const ok = crypto.timingSafeEqual(
    Buffer.from(candidate, "hex"),
    Buffer.from(user.password_hash, "hex")
  );
  return ok ? publicUser(user) : null;
}

export function getUser(userId) {
  const users = load(USERS_FILE, []);
  const user = users.find((u) => u.id === userId);
  return user ? publicUser(user) : null;
}

export function updateUser(userId, updates) {
  const users = load(USERS_FILE, []);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  const allowed = [
    "allergies", "diet_pattern", "default_calorie_target", "default_protein_target",
    "disliked_foods", "average_budget", "onboarding_complete",
    "saved_address", "saved_lat", "saved_lng",
  ];
  for (const key of allowed) {
    if (key in updates) users[idx][key] = updates[key];
  }
  save(USERS_FILE, users);
  return publicUser(users[idx]);
}

export function logOrder({ userId, menuItemId, filters }) {
  const orders = load(ORDERS_FILE, []);
  const order = {
    id: crypto.randomUUID(),
    user_id: userId ?? null,
    menu_item_id: menuItemId,
    ordered_at: new Date().toISOString(),
    final_filters_used: filters ?? null,
  };
  orders.push(order);
  save(ORDERS_FILE, orders);
  return order;
}

export function getOrders(userId) {
  return load(ORDERS_FILE, []).filter((o) => o.user_id === userId);
}

// --- Favorites (local stand-in for the Firestore `favorites` collection) ----

export function getFavorites(userId) {
  return load(FAVORITES_FILE, []).filter((f) => f.user_id === userId);
}

export function addFavorite({ userId, menuItemId }) {
  const favorites = load(FAVORITES_FILE, []);
  const existing = favorites.find(
    (f) => f.user_id === userId && f.menu_item_id === menuItemId
  );
  if (existing) return existing;
  const favorite = {
    id: crypto.randomUUID(),
    user_id: userId,
    menu_item_id: menuItemId,
    saved_at: new Date().toISOString(),
  };
  favorites.push(favorite);
  save(FAVORITES_FILE, favorites);
  return favorite;
}

export function removeFavorite(userId, menuItemId) {
  const favorites = load(FAVORITES_FILE, []);
  const next = favorites.filter(
    (f) => !(f.user_id === userId && f.menu_item_id === menuItemId)
  );
  save(FAVORITES_FILE, next);
  return next.length !== favorites.length;
}

// --- Query logs (local stand-in for the Firestore `query_logs` collection) --
// One entry per parsed query: raw_query, parsed_filters, selected_dish_id,
// timestamp. selected_dish_id fills in later if the user orders a dish.

export function logQuery({ rawQuery, parsedFilters, userId }) {
  const logs = load(QUERY_LOGS_FILE, []);
  const entry = {
    id: crypto.randomUUID(),
    user_id: userId ?? null,
    raw_query: rawQuery,
    parsed_filters: parsedFilters ?? null,
    selected_dish_id: null,
    timestamp: new Date().toISOString(),
  };
  logs.push(entry);
  save(QUERY_LOGS_FILE, logs);
  return entry;
}

export function setQueryLogSelection(logId, dishId) {
  const logs = load(QUERY_LOGS_FILE, []);
  const entry = logs.find((l) => l.id === logId);
  if (!entry) return null;
  entry.selected_dish_id = dishId;
  save(QUERY_LOGS_FILE, logs);
  return entry;
}

export function getQueryLogs() {
  return load(QUERY_LOGS_FILE, []).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
