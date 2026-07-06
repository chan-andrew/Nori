// Distance and delivery-time estimates. With five neighborhoods in the
// dataset, restaurant distance decides which subset surfaces at all
// (MAX_RADIUS_MILES) before the scoring pass runs.

export const MAX_RADIUS_MILES = 4;

const EARTH_RADIUS_MILES = 3958.8;

export function distanceMiles(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

// Rough courier model: ~12 min of prep/pickup overhead + ~5 min per mile,
// shown as a 10-minute window rounded to 5s.
export function deliveryEstimate(miles) {
  const mid = 12 + 5 * miles;
  const low = Math.max(10, Math.round(mid / 5) * 5);
  return { low, high: low + 10 };
}

export function isValidLocation(location) {
  return (
    location != null &&
    Number.isFinite(Number(location.lat)) &&
    Number.isFinite(Number(location.lng))
  );
}
