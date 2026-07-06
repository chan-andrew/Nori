import { Link } from "react-router-dom";
import MatchBadge from "./MatchBadge.jsx";
import MacroRow from "./MacroRow.jsx";
import FavoriteStar from "./FavoriteStar.jsx";

export default function DishCard({ item }) {
  const hasDistance = item.distance_miles != null;

  return (
    <Link
      to={`/dish/${item.id}`}
      className="block rounded-2xl border border-line bg-card p-5 transition-all hover:border-ink/30 hover:shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold leading-snug">{item.name}</h3>
            <FavoriteStar item={item} size={18} />
          </div>
          <p className="mt-0.5 text-sm text-faint">
            {item.restaurant_name} · {item.restaurant_neighborhood}
            {hasDistance && (
              <>
                {" "}· {item.distance_miles} mi · {item.delivery_minutes_low}–{item.delivery_minutes_high} min
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="font-semibold tabular-nums">${item.price.toFixed(2)}</span>
          <MatchBadge score={item.match_score} />
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-faint">{item.description}</p>
      <MacroRow item={item} className="mt-3" />
      {item.outside_original_request && (
        <p className="mt-3 inline-flex rounded-full bg-amber-soft px-3 py-1 text-xs font-medium text-amber-ink">
          Outside your original request — shown because nothing matched exactly
        </p>
      )}
    </Link>
  );
}
