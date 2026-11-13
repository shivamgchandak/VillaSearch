import { AMENITIES, TERRAINS } from "./vocabulary.js";
import { normalize, hasPhrase } from "./text.js";
import { DEFAULT_MAX_HOURS } from "./geography.js";

// A second search is usually a correction of the first one, not a fresh start.
// "Now make it cheaper" or "add a pool" only makes sense next to what came
// before, so those queries are merged onto the previous filters instead of
// replacing them.

const MARKERS = [
  "make it",
  "make them",
  "now ",
  "instead",
  "what about",
  "how about",
  "also",
  "as well",
  "add ",
  "remove ",
  "drop ",
  "without",
  "no ",
  "but ",
  "same but",
  "change",
  "only ",
  "something",
  "anything",
  "cheaper",
  "pricier",
  "bigger",
  "larger",
  "smaller",
  "closer",
  "further",
  "more ",
  "less ",
  "fewer",
  "rather",
];

const RELATIVE = {
  cheaper: ["cheaper", "less expensive", "lower price", "cut the budget", "reduce the budget", "too expensive", "too pricey"],
  pricier: ["pricier", "more luxurious", "fancier", "nicer", "more expensive", "upgrade"],
  bigger: ["bigger", "larger", "more people", "more guests", "more room", "more space", "too small"],
  smaller: ["smaller", "fewer people", "fewer guests", "too big", "too large"],
  longer: ["longer", "extra night", "one more night", "more nights"],
  shorter: ["shorter", "one less night", "fewer nights"],
  closer: ["closer", "nearer", "less driving", "shorter drive", "too far"],
  further: ["further", "farther", "further away", "longer drive"],
};

/**
 * True when the text reads like an adjustment rather than a new trip.
 * Short queries that name no place, no terrain and no group size count too,
 * since "with a jacuzzi" on its own is always a follow up.
 */
export function isRefinement(query, freshFilters) {
  const text = normalize(query);
  // Whole word matching, otherwise "no" would fire on "north goa".
  if (MARKERS.some((marker) => hasPhrase(text, marker.trim()))) return true;

  const words = text.trim().split(/\s+/).length;
  const namesATrip = Boolean(freshFilters?.guests) || Boolean(freshFilters?.locations?.length) || Boolean(freshFilters?.near) || Boolean(freshFilters?.terrains?.length);
  return words <= 6 && !namesATrip;
}

// "without pets", "no pool", "drop the bonfire", "any budget", "any dates"
export function detectRemovals(query) {
  const text = normalize(query);
  const removals = { amenities: [], terrains: [], locations: [], place: false, price: false, dates: false, guests: false };
  const negations = ["without", "no", "not", "drop", "remove", "skip", "forget", "any"];

  const negated = (words) =>
    words.some((word) =>
      negations.some((negation) => new RegExp(`(^|[^a-z0-9])${negation}\\s+(the\\s+|a\\s+|an\\s+)?${word}`, "i").test(text))
    );

  for (const [key, { words }] of Object.entries(AMENITIES)) {
    if (negated(words)) removals.amenities.push(key);
  }
  for (const [key, words] of Object.entries(TERRAINS)) {
    if (negated(words)) removals.terrains.push(key);
  }
  if (negated(["budget", "price limit", "price cap", "maximum"]) || hasPhrase(text, "any budget")) removals.price = true;
  if (negated(["dates", "date", "specific dates"]) || hasPhrase(text, "any dates")) removals.dates = true;
  if (hasPhrase(text, "anywhere") || negated(["location", "place", "area"])) removals.place = true;

  return removals;
}

/**
 * Relative words carry no number, so they are read against what the guest
 * already has. "Cheaper" with a budget of forty thousand becomes thirty.
 * With no budget at all it simply sorts by price, which is the honest reading.
 */
export function applyRelative(query, filters) {
  const text = normalize(query);
  const next = { ...filters };
  const hit = (key) => RELATIVE[key].some((phrase) => hasPhrase(text, phrase));

  if (hit("cheaper")) {
    if (next.maxPrice) next.maxPrice = Math.max(3000, Math.round((next.maxPrice * 0.75) / 500) * 500);
    else next.sortBy = "priceLow";
  }
  if (hit("pricier")) {
    if (next.minPrice) next.minPrice = Math.round((next.minPrice * 1.3) / 500) * 500;
    else next.sortBy = "priceHigh";
  }
  if (hit("bigger") && next.guests) next.guests = Math.min(60, next.guests + 2);
  if (hit("smaller") && next.guests) next.guests = Math.max(1, next.guests - 2);
  if (hit("longer")) next.nights = Math.min(14, (next.nights || 2) + 1);
  if (hit("shorter")) next.nights = Math.max(1, (next.nights || 2) - 1);
  // Closer and further only mean something next to a home city
  if (hit("closer") && next.near) next.maxHours = Math.max(1, (next.maxHours || DEFAULT_MAX_HOURS) - 1);
  if (hit("further") && next.near) next.maxHours = Math.min(24, (next.maxHours || DEFAULT_MAX_HOURS) + 2);

  return next;
}
