// Every macro number is an AI estimate, so the word "estimated" sits beside
// each one on every card and detail screen — a trust and liability
// requirement, not optional polish.
export default function MacroRow({ item, className = "" }) {
  const macros = [
    [item.estimated_calories, "cal"],
    [`${item.estimated_protein_g}g`, "protein"],
    [`${item.estimated_carbs_g}g`, "carbs"],
    [`${item.estimated_fat_g}g`, "fat"],
  ];
  return (
    <dl className={`flex flex-wrap gap-x-4 gap-y-1 text-sm text-faint ${className}`}>
      {macros.map(([value, label]) => (
        <div key={label} className="flex items-baseline gap-1">
          <dd className="font-semibold tabular-nums text-ink">
            <span className="mr-1 text-xs font-normal text-faint">estimated</span>
            {value}
          </dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
  );
}
