import { guestCeiling } from "./query.js";
import { driveHours, DEFAULT_MAX_HOURS } from "./geography.js";

// Ordering by popularity alone puts the same villas on top of every search.
// This blends how well each villa answers the request with how well it is
// reviewed, and keeps the reasons so the card can say why it matched.

const clamp = (value) => Math.min(1, Math.max(0, value));

function guestFit(villa, guests) {
  if (!guests) return null;
  if (villa.maxGuests < guests) return 0;
  const slack = villa.maxGuests - guests;
  const allowed = guestCeiling(guests) - guests || 1;
  return clamp(1 - slack / allowed);
}

function priceFit(villa, { minPrice, maxPrice }) {
  if (!minPrice && !maxPrice) return null;
  const price = villa.pricePerNight;
  if (maxPrice && price > maxPrice) return clamp(1 - (price - maxPrice) / maxPrice) * 0.5;
  if (minPrice && price < minPrice) return clamp(1 - (minPrice - price) / minPrice) * 0.5;
  if (maxPrice) return 0.6 + 0.4 * clamp(1 - price / maxPrice);
  return 0.8;
}

function amenityFit(villa, wanted) {
  if (!wanted.length) return null;
  const owned = wanted.filter((item) => villa.amenities.includes(item));
  return owned.length / wanted.length;
}

function terrainFit(villa, wanted) {
  if (!wanted.length) return null;
  const owned = wanted.filter((item) => villa.terrains.includes(item));
  return owned.length / wanted.length;
}

// Closer is better when the guest searched out from a home city
function distanceFit(villa, { near, maxHours }) {
  if (!near) return null;
  const hours = driveHours(near, villa.city);
  if (hours === null) return null;
  return clamp(1 - hours / ((maxHours || DEFAULT_MAX_HOURS) * 1.5));
}

const WEIGHTS = {
  availability: 0.3,
  guests: 0.2,
  amenities: 0.15,
  price: 0.15,
  terrain: 0.1,
  distance: 0.15,
  popularity: 0.14,
  rating: 0.08,
};

/**
 * Returns a number between 0 and 1 plus a few short lines the card can show.
 * Only the parts the guest actually asked about take part, and the total is
 * divided by the weight that applied, so a bare search still ranks sensibly.
 */
export function scoreVilla(villa, filters, available) {
  const parts = [];
  const add = (key, value) => {
    if (value !== null && value !== undefined) parts.push([WEIGHTS[key], value]);
  };

  add("popularity", clamp(villa.popularity ?? 0));
  add("rating", clamp((villa.rating - 4) / 1));
  add("guests", guestFit(villa, filters.guests));
  add("price", priceFit(villa, filters));
  add("amenities", amenityFit(villa, filters.amenities));
  add("terrain", terrainFit(villa, filters.terrains));
  add("distance", distanceFit(villa, filters));
  if (available !== null) add("availability", available ? 1 : 0);

  const weight = parts.reduce((sum, [w]) => sum + w, 0) || 1;
  const score = parts.reduce((sum, [w, v]) => sum + w * v, 0) / weight;

  return { score: Number(score.toFixed(4)), reasons: reasonsFor(villa, filters, available) };
}

function reasonsFor(villa, filters, available) {
  const reasons = [];

  if (filters.near) {
    const hours = driveHours(filters.near, villa.city);
    if (hours !== null) {
      const rounded = Math.max(1, Math.round(hours));
      reasons.push(`About ${rounded} ${rounded === 1 ? "hour" : "hours"} by road from ${filters.near}`);
    }
  }

  if (filters.guests) {
    const spare = villa.maxGuests - filters.guests;
    if (spare === 0) reasons.push(`Sleeps exactly ${filters.guests}`);
    else if (spare <= 2) reasons.push(`Fits your ${filters.guests} with room to spare`);
    else reasons.push(`Room for up to ${villa.maxGuests}`);
  }
  if (filters.maxPrice && villa.pricePerNight <= filters.maxPrice) {
    const under = filters.maxPrice - villa.pricePerNight;
    if (under >= 2000) reasons.push(`₹${under.toLocaleString("en-IN")} under your budget`);
    else reasons.push("Inside your budget");
  }
  if (filters.amenities.length) {
    const owned = filters.amenities.filter((item) => villa.amenities.includes(item));
    if (owned.length === filters.amenities.length && owned.length > 1) reasons.push("Has everything you asked for");
  }
  if (available === true) reasons.push("Free on your dates");
  if (!reasons.length && villa.reviewCount >= 200) reasons.push(`Well reviewed, ${villa.reviewCount} stays`);

  return reasons.slice(0, 3);
}
