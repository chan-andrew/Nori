async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  parseQuery: (text, user_id) => request("POST", "/api/parse-query", { text, user_id }),
  search: (filters, location) => request("POST", "/api/search", { filters, location }),
  refine: (filters, location) => request("POST", "/api/refine", { filters, location }),
  explain: (menu_item_id, query, filters) =>
    request("POST", "/api/explain", { menu_item_id, query, filters }),
  signup: (email, password) => request("POST", "/api/auth/signup", { email, password }),
  login: (email, password) => request("POST", "/api/auth/login", { email, password }),
  getProfile: (userId) => request("GET", `/api/profile/${userId}`),
  updateProfile: (userId, updates) => request("PUT", `/api/profile/${userId}`, updates),
  logOrder: (user_id, menu_item_id, filters, query_log_id) =>
    request("POST", "/api/orders", { user_id, menu_item_id, filters, query_log_id }),
  getFavorites: (userId) => request("GET", `/api/favorites/${userId}`),
  addFavorite: (user_id, menu_item_id) => request("POST", "/api/favorites", { user_id, menu_item_id }),
  removeFavorite: (userId, menuItemId) => request("DELETE", `/api/favorites/${userId}/${menuItemId}`),
  getQueryLogs: () => request("GET", "/api/query-logs"),
  updateQueryLog: (id, selected_dish_id) =>
    request("PATCH", `/api/query-logs/${id}`, { selected_dish_id }),
};
