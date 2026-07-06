export default function MatchBadge({ score, size = "sm" }) {
  const tier =
    score >= 80
      ? "bg-accent-soft text-accent-dark"
      : score >= 55
        ? "bg-amber-soft text-amber-ink"
        : "bg-mist text-faint";
  const pad = size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold tabular-nums ${tier} ${pad}`}>
      {score}% match
    </span>
  );
}
