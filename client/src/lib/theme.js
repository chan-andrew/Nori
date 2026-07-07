const KEY = "nori_theme";

// Light is the default; dark only when the user has toggled it themselves.
export function getTheme() {
  return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

// Apply on module load so the first paint is already themed.
applyTheme(getTheme());
