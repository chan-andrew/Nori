import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useFavorites } from "../context/FavoritesContext.jsx";

// Tappable star used directly on result cards (and the detail screen) so
// favoriting never requires opening the dish first. Signed-out taps go to
// sign-in.
export default function FavoriteStar({ item, size = 22 }) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const active = isFavorite(item.id);

  function onClick(e) {
    // The card around the star is a Link — don't follow it.
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/signin");
      return;
    }
    toggleFavorite(item);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${item.name} from favorites` : `Save ${item.name} to favorites`}
      className={`-m-1.5 rounded-full p-1.5 transition-colors hover:bg-mist ${
        active ? "text-accent" : "text-faint hover:text-ink"
      }`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
