import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import * as data from "../lib/data.js";

// Favorites are toggled straight from the star on each result card — no need
// to open the dish detail first. Stored per user (Firestore `favorites`
// collection, or the local store without Firebase).

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    let cancelled = false;
    data.getFavorites(user.id)
      .then((f) => { if (!cancelled) setFavorites(f); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function isFavorite(menuItemId) {
    return favorites.some((f) => f.menu_item_id === menuItemId);
  }

  async function toggleFavorite(item) {
    if (!user) return false;
    const existing = favorites.find((f) => f.menu_item_id === item.id);
    if (existing) {
      setFavorites((f) => f.filter((x) => x.menu_item_id !== item.id));
      await data.removeFavorite(user.id, existing).catch(() => {
        setFavorites((f) => [...f, existing]);
      });
    } else {
      const optimistic = { id: `pending-${item.id}`, menu_item_id: item.id, item };
      setFavorites((f) => [...f, optimistic]);
      try {
        const saved = await data.addFavorite(user.id, item);
        setFavorites((f) => f.map((x) => (x.id === optimistic.id ? saved : x)));
      } catch {
        setFavorites((f) => f.filter((x) => x.id !== optimistic.id));
      }
    }
    return true;
  }

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
