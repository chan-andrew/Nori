export default function MacroRow({ item, className = "" }) {
  const macros = [
    [item.estimated_calories, "cal"],
    [`${item.estimated_protein_g}g`, "protein"],
    [`${item.estimated_carbs_g}g`, "carbs"],
    [`${item.estimated_fat_g}g`, "fat"],
  ];
  return (
    <dl className={`flex flex-wrap gap-x-5 gap-y-1 text-sm text-faint ${className}`}>
      {macros.map(([value, label]) => (
        <div key={label} className="flex items-baseline gap-1">
          <dd className="font-semibold tabular-nums text-ink">{value}</dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
  );
}
