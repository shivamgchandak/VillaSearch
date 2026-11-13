import { TERRAINS, AMENITIES, SORT_OPTIONS, WHEN_OPTIONS } from "./vocabulary.js";
import { KNOWN_LOCATIONS, KNOWN_ORIGINS } from "./geography.js";
import { isValidDate, dayIndex } from "./dates.js";

export const DEFAULT_SORT = "relevance";

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
    sortBy: DEFAULT_SORT,
  };
}

function toPositiveInt(value, max) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 && parsed <= max ? parsed : null;
}

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

/**
 * Whatever comes in, model output or edited chips from the browser, only known
 * keys and known values survive. This is the reason the model can never inject
 * a database operator, an unknown place or a negative price into the search.
 */
export function sanitizeFilters(raw = {}) {
  const filters = emptyFilters();

  filters.guests = toPositiveInt(raw.guests, 60);
  filters.bedrooms = toPositiveInt(raw.bedrooms, 20);
  filters.nights = toPositiveInt(raw.nights, 14);
  filters.minPrice = toPositiveInt(raw.minPrice, 10000000);
  filters.maxPrice = toPositiveInt(raw.maxPrice, 10000000);
  if (filters.minPrice && filters.maxPrice && filters.minPrice > filters.maxPrice) {
    [filters.minPrice, filters.maxPrice] = [filters.maxPrice, filters.minPrice];
  }

  filters.locations = [
    ...new Set(
      asArray(raw.locations)
        .map((name) => KNOWN_LOCATIONS.get(String(name).toLowerCase().trim()))
        .filter(Boolean)
    ),
  ];
  filters.near = raw.near ? KNOWN_ORIGINS.get(String(raw.near).toLowerCase().trim()) || null : null;
  filters.maxHours = filters.near ? toPositiveInt(raw.maxHours, 24) : null;
  filters.terrains = [
    ...new Set(asArray(raw.terrains).map((name) => String(name).toLowerCase()).filter((name) => name in TERRAINS)),
  ];
  filters.amenities = [...new Set(asArray(raw.amenities).filter((name) => name in AMENITIES))];

  filters.sortBy = SORT_OPTIONS.includes(raw.sortBy) ? raw.sortBy : DEFAULT_SORT;
  filters.when = WHEN_OPTIONS.includes(raw.when) ? raw.when : null;
  filters.dayOfWeek = dayIndex(raw.dayOfWeek) >= 0 ? String(raw.dayOfWeek).toLowerCase() : null;
  filters.checkIn = isValidDate(raw.checkIn) ? raw.checkIn : null;
  filters.checkOut = isValidDate(raw.checkOut) ? raw.checkOut : null;
  if (filters.when === "day_of_week" && !filters.dayOfWeek) filters.when = null;
  if (filters.when === "specific" && !filters.checkIn) filters.when = null;

  return filters;
}

// True when nothing was understood, which is how a bare browse is recognised.
export function isEmptyFilters(filters) {
  const empty = emptyFilters();
  return Object.keys(empty).every((key) => {
    const value = filters[key];
    return Array.isArray(value) ? value.length === 0 : value === empty[key];
  });
}

/**
 * Follow up searches. "Now make it cheaper" carries no place and no group size,
 * so the previous filters stay and only what the guest just said changes.
 *
 * Amenities add up, because asking for a pool after asking for a bonfire means
 * both. A place or a terrain replaces, because naming Goa after Lonavala means
 * instead of, not as well as.
 */
export function mergeFilters(previous, incoming, removals = {}) {
  const base = sanitizeFilters(previous);
  const next = sanitizeFilters(incoming);
  const merged = { ...base };

  for (const key of ["guests", "bedrooms", "minPrice", "maxPrice"]) {
    if (next[key] !== null) merged[key] = next[key];
  }

  // A place and a home city together describe where, so either one being
  // named replaces both. "What about Goa instead" after "near Mumbai" is Goa.
  if (next.locations.length || next.near) {
    merged.locations = next.locations;
    merged.near = next.near;
    merged.maxHours = next.maxHours;
  }
  if (next.terrains.length) merged.terrains = next.terrains;
  if (next.amenities.length) merged.amenities = [...new Set([...merged.amenities, ...next.amenities])];

  if (next.when || next.checkIn) {
    merged.when = next.when;
    merged.dayOfWeek = next.dayOfWeek;
    merged.checkIn = next.checkIn;
    merged.checkOut = next.checkOut;
    merged.nights = next.nights;
  } else if (next.nights !== null) {
    merged.nights = next.nights;
  }

  if (next.sortBy !== DEFAULT_SORT) merged.sortBy = next.sortBy;

  if (removals.amenities?.length) {
    merged.amenities = merged.amenities.filter((item) => !removals.amenities.includes(item));
  }
  if (removals.terrains?.length) {
    merged.terrains = merged.terrains.filter((item) => !removals.terrains.includes(item));
  }
  if (removals.locations?.length) {
    merged.locations = merged.locations.filter((item) => !removals.locations.includes(item));
  }
  if (removals.place) {
    merged.locations = [];
    merged.near = null;
    merged.maxHours = null;
  }
  if (removals.price) {
    merged.minPrice = null;
    merged.maxPrice = null;
  }
  if (removals.dates) {
    Object.assign(merged, { when: null, dayOfWeek: null, checkIn: null, checkOut: null, nights: null });
  }
  if (removals.guests) merged.guests = null;

  return sanitizeFilters(merged);
}
