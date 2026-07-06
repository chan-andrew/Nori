export function filterLabels(filters) {
  if (!filters) return [];
  const chips = [];
  const { protein_grams_min: pMin, protein_grams_max: pMax } = filters;
  if (pMin != null && pMax != null) chips.push(`${pMin}–${pMax}g protein`);
  else if (pMin != null) chips.push(`${pMin}g+ protein`);
  else if (pMax != null) chips.push(`under ${pMax}g protein`);
  if (filters.carb_preference) chips.push(`${filters.carb_preference} carb`);
  if (filters.protein_source) chips.push(filters.protein_source);
  if (filters.wants_vegetables) chips.push("veggies on the side");
  if (filters.calorie_target != null) chips.push(`~${filters.calorie_target} cal`);
  if (filters.fat_target != null) chips.push(`~${filters.fat_target}g fat`);
  if (filters.price_max != null) chips.push(`under $${filters.price_max}`);
  if (filters.diet_pattern) chips.push(filters.diet_pattern);
  for (const term of filters.exclude_terms ?? []) chips.push(`no ${term}`);
  return chips;
}

export default function FilterChips({ filters }) {
  const chips = filterLabels(filters);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}
