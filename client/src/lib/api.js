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
  parseQuery: (text) => request("POST", "/api/parse-query", { text }),
  search: (filters) => request("POST", "/api/search", { filters }),
  refine: (filters) => request("POST", "/api/refine", { filters }),
  explain: (menu_item_id, query, filters) =>
    request("POST", "/api/explain", { menu_item_id, query, filters }),
  signup: (email, password) => request("POST", "/api/auth/signup", { email, password }),
  login: (email, password) => request("POST", "/api/auth/login", { email, password }),
  getProfile: (userId) => request("GET", `/api/profile/${userId}`),
  updateProfile: (userId, updates) => request("PUT", `/api/profile/${userId}`, updates),
  logOrder: (user_id, menu_item_id, filters) =>
    request("POST", "/api/orders", { user_id, menu_item_id, filters }),
};
