import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getTheme, setTheme } from "../lib/theme.js";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Header() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [theme, setThemeState] = useState(getTheme);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5">
        <Link to="/" className="font-display text-xl italic font-semibold tracking-tight">
          Nori
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {pathname !== "/order" && pathname !== "/" && (
            <Link to="/order" className="text-faint hover:text-ink transition-colors">
              Search
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-faint transition-colors hover:bg-mist hover:text-ink"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          {user ? (
            <Link
              to="/profile"
              className="rounded-full border border-line px-4 py-1.5 hover:border-ink transition-colors"
            >
              {user.email.split("@")[0]}
            </Link>
          ) : (
            <Link
              to="/signin"
              className="rounded-full border border-line px-4 py-1.5 hover:border-ink transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
