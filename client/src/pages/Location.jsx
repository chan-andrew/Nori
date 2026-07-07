import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSearch } from "../context/SearchContext.jsx";
import { updateProfile } from "../lib/data.js";

// Location capture happens after the text prompt: submitting a query with no
// known location stashes it as `pending` and lands here, and finishing runs
// the search. Distance and delivery time can't render without it, and with
// restaurants across five neighborhoods it decides which subset of the
// dataset is close enough to surface. Kept per session; auto-saved to the
// profile when signed in. Also reachable mid-session via the "Change" link
// on the results page, which re-runs the current query from the new spot.

const NEIGHBORHOODS = [
  { name: "Oakland", lat: 40.442, lng: -79.955 },
  { name: "Shadyside", lat: 40.4552, lng: -79.933 },
  { name: "Squirrel Hill", lat: 40.434, lng: -79.923 },
  { name: "East Liberty", lat: 40.46, lng: -79.925 },
  { name: "Downtown", lat: 40.4406, lng: -79.9959 },
];

// Cheap offline geocoder: an address that names a neighborhood (or a campus
// landmark) resolves locally. Anything else goes to OpenStreetMap Nominatim.
function matchNeighborhood(text) {
  const t = text.toLowerCase();
  const aliases = {
    Oakland: ["oakland", "pitt", "cmu", "forbes ave", "craig st", "university of pittsburgh"],
    Shadyside: ["shadyside", "walnut st", "shady ave"],
    "Squirrel Hill": ["squirrel hill", "murray ave", "forward ave"],
    "East Liberty": ["east liberty", "highland ave", "penn circle"],
    Downtown: ["downtown", "wood st", "market square", "point park"],
  };
  for (const n of NEIGHBORHOODS) {
    if (aliases[n.name].some((a) => t.includes(a))) return n;
  }
  return null;
}

async function geocodeRemote(address) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(`${address}, Pittsburgh, PA`);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("geocoder unavailable");
  const [hit] = await res.json();
  if (!hit) throw new Error("address not found");
  return { lat: Number(hit.lat), lng: Number(hit.lon) };
}

export default function Location() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { pending, location, setLocation, runSearch } = useSearch();
  const [address, setAddress] = useState(location?.address ?? user?.saved_address ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function finish(loc) {
    setLocation(loc);
    if (user) {
      try {
        const updated = await updateProfile(user.id, {
          saved_address: loc.address ?? "",
          saved_lat: loc.lat,
          saved_lng: loc.lng,
        });
        setUser(updated);
      } catch {
        // Saving the address is best-effort; the flow continues either way.
      }
    }
    if (pending) {
      await runSearch(pending.text, pending.filters, loc, pending.queryLogId);
      navigate("/results");
    } else {
      navigate("/order");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support geolocation — type an address instead.");
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        finish({
          address: "Current location",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).catch((err) => setError(err.message)).finally(() => setBusy(false));
      },
      () => {
        setBusy(false);
        setError("Couldn't read your location — type an address or pick a neighborhood.");
      },
      { timeout: 8000 }
    );
  }

  async function submitAddress(e) {
    e.preventDefault();
    const value = address.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const local = matchNeighborhood(value);
      const coords = local ?? (await geocodeRemote(value));
      await finish({ address: value, lat: coords.lat, lng: coords.lng });
    } catch {
      setError("Couldn't place that address — try a street + neighborhood, or tap a neighborhood below.");
    } finally {
      setBusy(false);
    }
  }

  function pickNeighborhood(n) {
    if (busy) return;
    setBusy(true);
    setError(null);
    finish({ address: n.name, lat: n.lat, lng: n.lng })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }

  return (
    <section className="pt-14 sm:pt-20">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Where should it come to?
      </h1>
      <p className="mt-3 text-faint">
        Distance and delivery times need a starting point.{" "}
        {user ? "We'll save it to your account for next time." : "We'll keep it for this session."}
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={busy}
          className="w-full rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-on-accent transition-colors hover:bg-accent-dark disabled:opacity-40 sm:w-auto"
        >
          {busy ? "Working…" : "Use my current location"}
        </button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] text-faint">
          <span className="h-px flex-1 bg-line" /> or type an address <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submitAddress} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="address" className="sr-only">Delivery address</label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder='e.g. "3959 Fifth Ave, Oakland"'
            className="w-full flex-1 rounded-xl border border-line bg-card px-4 py-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="submit"
            disabled={busy || !address.trim()}
            className="rounded-full border border-accent px-6 py-3 font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-40"
          >
            Set address
          </button>
        </form>

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">{error}</p>
        )}
      </div>

      <div className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-faint">
          Or jump to a neighborhood
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {NEIGHBORHOODS.map((n) => (
            <button
              key={n.name}
              type="button"
              onClick={() => pickNeighborhood(n)}
              disabled={busy}
              className="rounded-full border border-line bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
            >
              {n.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
