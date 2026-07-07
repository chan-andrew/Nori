import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { recordOrder } from "../lib/data.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSearch } from "../context/SearchContext.jsx";
import MatchBadge from "../components/MatchBadge.jsx";
import FavoriteStar from "../components/FavoriteStar.jsx";

export default function DishDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { queryText, filters, results, queryLogId } = useSearch();
  const [explanation, setExplanation] = useState(null);

  const item = results?.find((r) => r.id === id);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    api
      .explain(item.id, queryText, filters)
      .then(({ explanation: text }) => {
        if (!cancelled) setExplanation(text);
      })
      .catch(() => {
        if (!cancelled) setExplanation("This dish lines up well with the goals you set.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!results) return <Navigate to="/order" replace />;
  if (!item) return <Navigate to="/results" replace />;

  function orderOnDoorDash() {
    // Log first (fire and forget) — also attaches this dish to the query log —
    // then hand off to the DoorDash restaurant page in a new tab.
    recordOrder({ userId: user?.id ?? null, item, filters, queryLogId }).catch(() => {});
    window.open(item.doordash_url, "_blank", "noopener");
  }

  const stats = [
    [item.estimated_calories, "estimated calories"],
    [`${item.estimated_protein_g}g`, "estimated protein"],
    [`${item.estimated_carbs_g}g`, "estimated carbs"],
    [`${item.estimated_fat_g}g`, "estimated fat"],
  ];

  return (
    <section className="pt-8">
      <Link to="/results" className="text-sm font-semibold text-faint transition-colors hover:text-ink">
        ← Back to results
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
              {item.name}
            </h1>
            <FavoriteStar item={item} />
          </div>
          <p className="mt-1.5 text-faint">
            {item.restaurant_name} · {item.restaurant_neighborhood} · {item.cuisine_type}
          </p>
          {item.distance_miles != null && (
            <p className="mt-1 text-sm text-faint">
              {item.distance_miles} mi away · {item.delivery_minutes_low}–{item.delivery_minutes_high} min
              estimated delivery
            </p>
          )}
        </div>
        <MatchBadge score={item.match_score} size="lg" />
      </div>

      {item.outside_original_request && (
        <p className="mt-4 inline-flex rounded-full bg-amber-soft px-3 py-1.5 text-xs font-medium text-amber-ink">
          Outside your original request — shown because nothing matched exactly
        </p>
      )}

      <p className="mt-4 max-w-prose leading-relaxed text-faint">{item.description}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-line bg-card p-4 text-center">
            <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-0.5 text-xs uppercase tracking-wide text-faint">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-accent-soft p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-dark">
          Why this matched
        </h2>
        <p className="mt-2 leading-relaxed text-ink" aria-live="polite">
          {explanation ?? "Thinking it through…"}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-2xl font-semibold tabular-nums">
          ${item.price.toFixed(2)}
        </p>
        <button
          type="button"
          onClick={orderOnDoorDash}
          className="rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-on-accent transition-colors hover:bg-accent-dark"
        >
          Order on DoorDash ↗
        </button>
      </div>
      {!user && (
        <p className="mt-2 text-xs text-faint">
          <Link to="/signup" className="underline underline-offset-2 transition-colors hover:text-accent">
            Sign up
          </Link>{" "}
          to save this to your order history.
        </p>
      )}

      <p className="mt-10 text-xs leading-relaxed text-faint">
        Nutrition values are estimated by AI from the menu description — not verified by{" "}
        {item.restaurant_name}. Prices and delivery times may differ on DoorDash.
      </p>
    </section>
  );
}
