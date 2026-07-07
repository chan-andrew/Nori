import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext.jsx";
import DishCard from "../components/DishCard.jsx";
import RefinePanel from "../components/RefinePanel.jsx";
import Reveal from "../components/Reveal.jsx";

export default function Results() {
  const { queryText, filters, results, widened, location, setLocation, setPending } = useSearch();
  const [showRefine, setShowRefine] = useState(false);
  const [neighborhood, setNeighborhood] = useState(null);

  // Group counts by neighborhood; tapping a chip narrows the ranked list.
  const neighborhoods = useMemo(() => {
    if (!results) return [];
    const counts = new Map();
    for (const r of results) {
      counts.set(r.restaurant_neighborhood, (counts.get(r.restaurant_neighborhood) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [results]);

  if (!results) return <Navigate to="/order" replace />;

  const visible = neighborhood
    ? results.filter((r) => r.restaurant_neighborhood === neighborhood)
    : results;

  function changeLocation() {
    // Re-enter the location step with the current query ready to re-run.
    setPending({ text: queryText, filters, queryLogId: null });
    setLocation(null);
  }

  return (
    <section className="pt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" aria-live="polite">
          {visible.length} {visible.length === 1 ? "dish fits" : "dishes fit"}
        </h1>
        <div className="flex shrink-0 items-baseline gap-4 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setShowRefine((s) => !s)}
            aria-expanded={showRefine}
            className="text-accent transition-colors hover:text-accent-dark"
          >
            {showRefine ? "Hide refine" : "Refine"}
          </button>
          <Link to="/order" className="text-faint transition-colors hover:text-ink">
            Edit request
          </Link>
        </div>
      </div>

      {queryText && (
        <p className="mt-2 text-sm italic text-faint">“{queryText}”</p>
      )}
      {location && (
        <p className="mt-1 text-sm text-faint">
          Delivering to <span className="font-medium text-ink">{location.address}</span>{" "}
          <Link
            to="/location"
            onClick={changeLocation}
            className="font-semibold text-accent transition-colors hover:text-accent-dark"
          >
            Change
          </Link>
        </p>
      )}
      {widened && (
        <div className="mt-5 rounded-2xl bg-amber-soft p-4 text-sm leading-relaxed text-amber-ink" role="status">
          <strong>We loosened your filters.</strong> Nothing landed inside your exact targets, so
          these are the closest dishes — each is flagged with why it sits outside your original
          request.
        </div>
      )}

      {showRefine && (
        <div className="mt-5">
          <RefinePanel />
        </div>
      )}

      {neighborhoods.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setNeighborhood(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              neighborhood === null ? "bg-accent text-on-accent" : "bg-mist text-ink hover:bg-line"
            }`}
          >
            All neighborhoods
          </button>
          {neighborhoods.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setNeighborhood((n) => (n === name ? null : name))}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                neighborhood === name ? "bg-accent text-on-accent" : "bg-mist text-ink hover:bg-line"
              }`}
            >
              {name} · {count}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-line bg-card p-8 text-center">
          <p className="font-display text-lg font-semibold">Nothing matched every requirement.</p>
          <p className="mt-2 text-sm text-faint">
            Hard limits like allergies, diet pattern, or protein source excluded everything here.
            Try a different protein source or neighborhood.
          </p>
          <Link
            to="/order"
            className="mt-5 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-dark"
          >
            Rewrite request
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {visible.map((item, i) => (
            <Reveal key={item.id} delay={Math.min(i, 6) * 60}>
              <DishCard item={item} />
            </Reveal>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-faint">
        All nutrition numbers are estimated from menu descriptions — not restaurant-verified.
      </p>
    </section>
  );
}
