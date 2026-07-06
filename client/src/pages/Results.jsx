import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext.jsx";
import DishCard from "../components/DishCard.jsx";
import FilterChips from "../components/FilterChips.jsx";
import RefinePanel from "../components/RefinePanel.jsx";

export default function Results() {
  const { queryText, filters, results } = useSearch();
  const [showRefine, setShowRefine] = useState(false);

  if (!results) return <Navigate to="/order" replace />;

  return (
    <section className="pt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" aria-live="polite">
          {results.length} {results.length === 1 ? "dish fits" : "dishes fit"}
        </h1>
        <div className="flex shrink-0 items-baseline gap-4 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setShowRefine((s) => !s)}
            aria-expanded={showRefine}
            className="text-accent hover:text-accent-dark"
          >
            {showRefine ? "Hide refine" : "Refine"}
          </button>
          <Link to="/order" className="text-faint hover:text-ink">
            Edit request
          </Link>
        </div>
      </div>

      {queryText && (
        <p className="mt-2 text-sm italic text-faint">“{queryText}”</p>
      )}
      <div className="mt-4">
        <FilterChips filters={filters} />
      </div>

      {showRefine && (
        <div className="mt-5">
          <RefinePanel />
        </div>
      )}

      {results.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-line bg-card p-8 text-center">
          <p className="font-display text-lg font-semibold">Nothing matched every requirement.</p>
          <p className="mt-2 text-sm text-faint">
            Try loosening one constraint — a wider protein range or a different protein source
            usually does it.
          </p>
          <Link
            to="/order"
            className="mt-5 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-dark"
          >
            Rewrite request
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {results.map((item) => (
            <DishCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
