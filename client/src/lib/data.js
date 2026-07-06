// Storage layer for user data: profiles, order history, favorites, query
// logs. When a Firebase project is configured this reads/writes Firestore
// documents keyed by user id; otherwise it falls back to the local Express
// store so the app keeps working with zero setup.
//
// Firestore documents keep a small `item` snapshot (name, restaurant, price,
// macros) on orders and favorites so history renders without a join against
// the menu dataset.

import { api } from "./api.js";
import { firebaseEnabled, getFirebase } from "./firebase.js";

function itemSnapshot(item) {
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    restaurant_name: item.restaurant_name,
    restaurant_neighborhood: item.restaurant_neighborhood,
    price: item.price,
    estimated_calories: item.estimated_calories,
    estimated_protein_g: item.estimated_protein_g,
    estimated_carbs_g: item.estimated_carbs_g,
    estimated_fat_g: item.estimated_fat_g,
    protein_source: item.protein_source,
    doordash_url: item.doordash_url ?? null,
  };
}

function computeStats(items) {
  if (items.length === 0) return null;
  return {
    order_count: items.length,
    avg_price: items.reduce((s, i) => s + i.price, 0) / items.length,
    avg_protein_g: Math.round(items.reduce((s, i) => s + i.estimated_protein_g, 0) / items.length),
    avg_calories: Math.round(items.reduce((s, i) => s + i.estimated_calories, 0) / items.length),
    top_protein_source: Object.entries(
      items.reduce((acc, i) => ((acc[i.protein_source] = (acc[i.protein_source] ?? 0) + 1), acc), {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  };
}

// --- Profile ---------------------------------------------------------------

export async function getProfileBundle(userId) {
  if (!firebaseEnabled) return api.getProfile(userId);

  const { db, firestoreMod } = await getFirebase();
  const { doc, getDoc, collection, query, where, getDocs } = firestoreMod;
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) throw new Error("user not found");
  const user = { id: userId, ...snap.data() };

  const ordersSnap = await getDocs(
    query(collection(db, "order_history"), where("user_id", "==", userId))
  );
  const orders = ordersSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.ordered_at ?? "").localeCompare(a.ordered_at ?? ""));

  return { user, orders, stats: computeStats(orders.map((o) => o.item).filter(Boolean)) };
}

export async function updateProfile(userId, updates) {
  if (!firebaseEnabled) {
    const { user } = await api.updateProfile(userId, updates);
    return user;
  }
  const { db, firestoreMod } = await getFirebase();
  const { doc, setDoc, getDoc } = firestoreMod;
  const ref = doc(db, "users", userId);
  await setDoc(ref, updates, { merge: true });
  const snap = await getDoc(ref);
  return { id: userId, ...snap.data() };
}

// --- Order history -----------------------------------------------------------

export async function recordOrder({ userId, item, filters, queryLogId }) {
  if (!firebaseEnabled) {
    return api.logOrder(userId ?? null, item.id, filters, queryLogId ?? null);
  }
  const { db, firestoreMod } = await getFirebase();
  const { collection, addDoc } = firestoreMod;
  await addDoc(collection(db, "order_history"), {
    user_id: userId ?? null,
    menu_item_id: item.id,
    ordered_at: new Date().toISOString(),
    final_filters_used: filters ?? null,
    item: itemSnapshot(item),
  });
  if (queryLogId) await setQueryLogSelection(queryLogId, item.id);
}

// --- Favorites ---------------------------------------------------------------

export async function getFavorites(userId) {
  if (!firebaseEnabled) {
    const { favorites } = await api.getFavorites(userId);
    return favorites;
  }
  const { db, firestoreMod } = await getFirebase();
  const { collection, query, where, getDocs } = firestoreMod;
  const snap = await getDocs(query(collection(db, "favorites"), where("user_id", "==", userId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addFavorite(userId, item) {
  if (!firebaseEnabled) {
    const { favorite } = await api.addFavorite(userId, item.id);
    return { ...favorite, item: itemSnapshot(item) };
  }
  const { db, firestoreMod } = await getFirebase();
  const { collection, addDoc } = firestoreMod;
  const data = {
    user_id: userId,
    menu_item_id: item.id,
    saved_at: new Date().toISOString(),
    item: itemSnapshot(item),
  };
  const ref = await addDoc(collection(db, "favorites"), data);
  return { id: ref.id, ...data };
}

export async function removeFavorite(userId, favorite) {
  if (!firebaseEnabled) {
    await api.removeFavorite(userId, favorite.menu_item_id);
    return;
  }
  const { db, firestoreMod } = await getFirebase();
  const { doc, deleteDoc } = firestoreMod;
  await deleteDoc(doc(db, "favorites", favorite.id));
}

// --- Query logs (Phase 3) ----------------------------------------------------
// One entry per parsed query. The local server logs automatically inside
// /api/parse-query; with Firebase configured, the log lives in Firestore's
// query_logs collection instead.

export async function logQueryToFirestore({ rawQuery, parsedFilters, userId }) {
  const { db, firestoreMod } = await getFirebase();
  const { collection, addDoc } = firestoreMod;
  const ref = await addDoc(collection(db, "query_logs"), {
    raw_query: rawQuery,
    parsed_filters: parsedFilters ?? null,
    selected_dish_id: null,
    user_id: userId ?? null,
    timestamp: new Date().toISOString(),
  });
  return ref.id;
}

export async function setQueryLogSelection(logId, dishId) {
  if (!firebaseEnabled) {
    await api.updateQueryLog(logId, dishId);
    return;
  }
  const { db, firestoreMod } = await getFirebase();
  const { doc, updateDoc } = firestoreMod;
  await updateDoc(doc(db, "query_logs", logId), { selected_dish_id: dishId });
}

export async function listQueryLogs() {
  if (!firebaseEnabled) {
    const { logs } = await api.getQueryLogs();
    return logs;
  }
  const { db, firestoreMod } = await getFirebase();
  const { collection, getDocs } = firestoreMod;
  const snap = await getDocs(collection(db, "query_logs"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
}
