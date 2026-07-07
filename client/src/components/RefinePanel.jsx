import { useState } from "react";
import { useSearch } from "../context/SearchContext.jsx";
import FilterChips from "./FilterChips.jsx";
import NoriLoader from "./NoriLoader.jsx";

// Sliders sit at their minimum for "no preference" (null in the filter object).
// Applying re-runs the ranking; the results list above updates in place.
const SLIDERS = [
  { key: "protein_target", label: "Protein", unit: "g", min: 0, max: 70, step: 5 },
  { key: "calorie_target", label: "Calories", unit: "cal", min: 0, max: 1200, step: 50 },
  { key: "fat_target", label: "Fat", unit: "g", min: 0, max: 60, step: 5 },
  { key: "price_max", label: "Max price", unit: "$", min: 0, max: 30, step: 1 },
];

export default function RefinePanel() {
  const { filters, refine } = useSearch();
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState(() => ({
    protein_target:
      filters?.protein_grams_min != null && filters?.protein_grams_max != null
        ? Math.round((filters.protein_grams_min + filters.protein_grams_max) / 2)
        : filters?.protein_grams_min ?? 0,
    calorie_target: filters?.calorie_target ?? 0,
    fat_target: filters?.fat_target ?? 0,
    price_max: filters?.price_max ?? 0,
    carb_preference: filters?.carb_preference ?? "",
  }));

  async function apply() {
    setBusy(true);
    try {
      await refine({
        ...filters,
        protein_grams_min: values.protein_target > 0 ? Math.max(0, values.protein_target - 5) : null,
        protein_grams_max: values.protein_target > 0 ? values.protein_target + 5 : null,
        calorie_target: values.calorie_target > 0 ? values.calorie_target : null,
        fat_target: values.fat_target > 0 ? values.fat_target : null,
        price_max: values.price_max > 0 ? values.price_max : null,
        carb_preference: values.carb_preference || null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-faint">
        Refine
      </h2>

      <div className="mt-3">
        <FilterChips filters={filters} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {SLIDERS.map(({ key, label, unit, min, max, step }) => (
          <div key={key}>
            <div className="flex items-baseline justify-between text-sm">
              <label htmlFor={`refine-${key}`} className="font-medium">
                {label}
              </label>
              <span className="tabular-nums text-faint">
                {values[key] > 0
                  ? unit === "$"
                    ? `$${values[key]}`
                    : `~${values[key]} ${unit}`
                  : "Any"}
              </span>
            </div>
            <input
              id={`refine-${key}`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: Number(e.target.value) }))}
              className="mt-1.5 w-full accent-accent"
            />
          </div>
        ))}

        <div>
          <label htmlFor="refine-carbs" className="text-sm font-medium">
            Carbs
          </label>
          <select
            id="refine-carbs"
            value={values.carb_preference}
            onChange={(e) => setValues((v) => ({ ...v, carb_preference: e.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
          >
            <option value="">No preference</option>
            <option value="low">Low (under 35g)</option>
            <option value="moderate">Moderate (35–75g)</option>
            <option value="high">High (75g+)</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={apply}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-accent px-5 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-50"
          >
            {busy && <NoriLoader size={14} />}
            {busy ? "Re-ranking…" : "Apply refinements"}
          </button>
        </div>
      </div>
    </div>
  );
}
