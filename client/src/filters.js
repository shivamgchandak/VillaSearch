import { rupees, shortDate, nights, dayMonth, joinList, TERRAIN_LABELS, TERRAIN_PHRASES } from "./format.js";

// The same empty shape the server uses, so a change made in a field can be
// sent straight back without the server having to guess anything.
export function emptyFilters() {
  return {
    guests: null,
    bedrooms: null,
    locations: [],
    near: null,
    maxHours: null,
    terrains: [],
    amenities: [],
    minPrice: null,
    maxPrice: null,
    when: null,
    dayOfWeek: null,
    checkIn: null,
    checkOut: null,
    nights: null,
    sortBy: "relevance",
  };
}

export const withChange = (filters, change) => ({ ...emptyFilters(), ...(filters || {}), ...change });

export const NO_DATES = { when: null, dayOfWeek: null, checkIn: null, checkOut: null, nights: null };

export function hasAnything(filters) {
  if (!filters) return false;
  return Boolean(
    filters.guests || filters.locations.length || filters.near || filters.terrains.length || filters.amenities.length ||
      filters.maxPrice || filters.minPrice || filters.when || filters.checkIn
  );
}

// The filters turned back into plain language, one pill each. Every pill can
// be changed or removed, which reruns the search without asking the model again.
export function pillsFrom(filters, stay, amenityLabels = {}) {
  if (!filters) return [];
  const pills = [];
  if (filters.guests) pills.push({ id: "guests", kind: "guests", label: `${filters.guests} guests` });
  filters.locations.forEach((place) => pills.push({ id: `location:${place}`, kind: "where", label: place }));
  if (filters.near) pills.push({ id: "near", kind: "where", label: `Within ${filters.maxHours || 4} hours of ${filters.near}` });
  filters.terrains.forEach((terrain) => pills.push({ id: `terrain:${terrain}`, kind: "terrain", label: TERRAIN_LABELS[terrain] || terrain }));
  if (stay) pills.push({ id: "dates", kind: "dates", label: `${shortDate(stay.checkIn)}, ${nights(stay.nights)}` });
  filters.amenities.forEach((amenity) => pills.push({ id: `amenity:${amenity}`, kind: "amenity", label: amenityLabels[amenity] || amenity }));
  if (filters.maxPrice) pills.push({ id: "price", kind: "budget", label: `Up to ${rupees(filters.maxPrice)} a night` });
  else if (filters.minPrice) pills.push({ id: "price", kind: "budget", label: `From ${rupees(filters.minPrice)} a night` });
  return pills;
}

export function withoutPill(filters, id) {
  const next = withChange(filters, {});
  const [kind, value] = id.split(":");
  if (kind === "guests") next.guests = null;
  if (kind === "price") next.minPrice = next.maxPrice = null;
  if (kind === "dates") Object.assign(next, NO_DATES);
  if (kind === "near") Object.assign(next, { near: null, maxHours: null });
  if (kind === "location") next.locations = next.locations.filter((item) => item !== value);
  if (kind === "terrain") next.terrains = next.terrains.filter((item) => item !== value);
  if (kind === "amenity") next.amenities = next.amenities.filter((item) => item !== value);
  return next;
}

/**
 * Filters written back as a sentence, so a guest who changes a field sees the
 * sentence follow. The wording is chosen so the keyword parser reads it back
 * to the same filters.
 */
export function sentenceFrom(filters, stay, amenityLabels = {}) {
  if (!hasAnything(filters)) return "";
  let head = "Villa";
  if (filters.guests) head += ` for ${filters.guests} guests`;
  if (filters.locations.length) head += ` in ${joinList(filters.locations)}`;
  else if (filters.near) head += ` within ${filters.maxHours || 4} hours of ${filters.near}`;
  if (filters.terrains.length) head += ` ${filters.terrains.map((t) => TERRAIN_PHRASES[t] || t).join(" and ")}`;
  const parts = [head];
  filters.amenities.forEach((amenity) => parts.push((amenityLabels[amenity] || amenity).toLowerCase()));
  if (filters.maxPrice) parts.push(`under ${rupees(filters.maxPrice)}`);
  if (stay) parts.push(`on ${dayMonth(stay.checkIn)} for ${nights(stay.nights)}`);
  return parts.join(", ");
}
