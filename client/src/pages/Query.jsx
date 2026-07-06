import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSearch } from "../context/SearchContext.jsx";

const EXAMPLES = [
  "High protein dinner, 50 to 60 grams of protein, beef, low carb, veggies on the side",
  "Chicken, around 600 calories, under $15",
  "Vegan bowl with veggies, high protein",
  "Halal, high protein, low carb",
];

export default function Query() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { runSearch } = useSearch();

  async function submit(raw) {
    const value = raw.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { filters } = await api.parseQuery(value);
      // Fold in saved profile exclusions so allergies/dislikes always apply.
      if (user) {
        const extra = [user.allergies, user.disliked_foods]
          .filter(Boolean)
          .flatMap((s) => s.split(",").map((t) => t.trim().toLowerCase()))
          .filter(Boolean);
        filters.exclude_terms = [...new Set([...(filters.exclude_terms ?? []), ...extra])];
        if (!filters.diet_pattern && user.diet_pattern && user.diet_pattern !== "none") {
          filters.diet_pattern = user.diet_pattern;
        }
      }
      await runSearch(value, filters);
      navigate("/results");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pt-14 sm:pt-20">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        What are you eating today?
      </h1>
      <p className="mt-3 text-faint">
        Describe the meal in your own words — macros, protein source, budget, sides.
      </p>

      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <label htmlFor="meal-request" className="sr-only">
          Meal request
        </label>
        <textarea
          id="meal-request"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
          placeholder='e.g. "I want a high protein dinner, 50 to 60 grams of protein, beef, low carb, veggies on the side"'
          className="w-full resize-none rounded-2xl border border-line bg-card p-5 text-lg leading-relaxed placeholder:text-faint/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="mt-4 w-full rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-on-accent transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {loading ? "Reading your request…" : "Find dishes"}
        </button>
      </form>

      <div className="mt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-faint">
          Try one of these
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setText(example);
                submit(example);
              }}
              disabled={loading}
              className="rounded-xl border border-line bg-card px-4 py-3 text-left text-sm text-faint transition-colors hover:border-accent hover:text-ink disabled:opacity-40"
            >
              “{example}”
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
