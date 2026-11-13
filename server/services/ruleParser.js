import { TERRAINS, AMENITIES } from "./vocabulary.js";
import { KNOWN_LOCATIONS, KNOWN_ORIGINS } from "./geography.js";
import { hasPhrase, normalize } from "./text.js";
import { emptyFilters } from "./filters.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY_PATTERN = "(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun)";

// Only treat a number as money when it looks like money: a unit (40k, 1 lakh),
// a currency sign, or a value of at least 1,000. This stops "about 10 people"
// or "within 2 nights" from becoming a budget.
function toAmount(currency, num, unit) {
  const value = parseFloat(String(num).replace(/,/g, ""));
  if (Number.isNaN(value)) return null;
  if (unit === "k" || unit === "thousand") return value * 1000;
  if (unit && /^(l|lakhs?|lac)$/.test(unit)) return value * 100000;
  if (currency || value >= 1000) return value;
  return null;
}

const MONEY = "(rs\\.?|₹|inr)?\\s*(\\d[\\d,.]*)\\s*(k|thousand|lakhs?|lac|l)?\\b";

function parsePrice(text, filters) {
  const between = text.match(new RegExp(`between\\s*${MONEY}\\s*(?:and|to)\\s*${MONEY}`));
  if (between) {
    filters.minPrice = toAmount(between[1] || between[4], between[2], between[3] || between[6]);
    filters.maxPrice = toAmount(between[4] || between[1], between[5], between[6]);
    return;
  }
  const max = text.match(
    new RegExp(`(?:under|below|less than|within|upto|up to|max(?:imum)?|budget(?: of| is)?|not more than|cheaper than|around|about)\\s*${MONEY}`)
  );
  if (max) filters.maxPrice = toAmount(max[1], max[2], max[3]);
  const min = text.match(new RegExp(`(?:above|over|more than|min(?:imum)?|starting(?: from)?)\\s*${MONEY}`));
  if (min) filters.minPrice = toAmount(min[1], min[2], min[3]);
}

function parseGuests(text, filters) {
  if (/\bcouple\b/.test(text) && !/couples/.test(text)) filters.guests = 2;
  const patterns = [
    /(\d{1,2})\s*(?:people|persons?|guests?|pax|adults|friends|members|of us|ppl)\b/,
    /(?:group|family|gang|team|batch|party) of (\d{1,2})\b/,
    /(?:villa|villas|stay|house|place|home|bungalow)s? for (\d{1,2})\b(?!\s*(?:k|nights?|days?|bhk|bedrooms?|thousand|,\d))/,
    /\bfor (\d{1,2})\b(?!\s*(?:k|nights?|days?|bhk|bedrooms?|rooms?|thousand|,\d|\d))/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      filters.guests = parseInt(m[1], 10);
      return;
    }
  }
}

function parseBedrooms(text, filters) {
  const m = text.match(/(\d{1,2})\s*(?:bhk|bedrooms?|bed rooms?|br)\b/);
  if (m) filters.bedrooms = parseInt(m[1], 10);
}

function parseWhen(text, filters) {
  const nights = text.match(/(\d{1,2})\s*nights?/);
  if (nights) filters.nights = parseInt(nights[1], 10);

  // Explicit date like "25 dec", "25th december", "dec 25"
  const monthAlt = MONTHS.join("|");
  const dm = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(${monthAlt})[a-z]*\\b`));
  const md = text.match(new RegExp(`\\b(${monthAlt})[a-z]*\\s*(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  const hit = dm ? { day: dm[1], mon: dm[2] } : md ? { day: md[2], mon: md[1] } : null;
  if (hit) {
    const now = new Date();
    const month = MONTHS.indexOf(hit.mon.slice(0, 3));
    let year = now.getFullYear();
    const candidate = new Date(Date.UTC(year, month, parseInt(hit.day, 10)));
    if (candidate < new Date(Date.UTC(year, now.getMonth(), now.getDate()))) year += 1;
    filters.when = "specific";
    filters.checkIn = new Date(Date.UTC(year, month, parseInt(hit.day, 10))).toISOString().slice(0, 10);
    return;
  }

  if (/\b(next coming|coming|upcoming|this) weekend\b/.test(text)) filters.when = "this_weekend";
  else if (/\bnext weekend\b/.test(text)) filters.when = "next_weekend";
  else if (/\bweekend\b/.test(text)) filters.when = "this_weekend";
  else if (/\btonight\b/.test(text)) filters.when = "tonight";
  else if (/\btoday\b/.test(text)) filters.when = "today";
  else if (/\btomorrow\b/.test(text)) filters.when = "tomorrow";
  else {
    const day = text.match(new RegExp(`\\b${DAY_PATTERN}\\b`));
    if (day) {
      filters.when = "day_of_week";
      filters.dayOfWeek = day[1];
    }
  }
}

// Every name in the place guide, longest first, so "north goa" wins over
// "goa" and "north east india" wins over "north east".
// The words go through the same normalising as the query, so "seven sisters"
// still matches after the query has become "7 sisters".
const byLength = (entries) =>
  entries.map(([word, name]) => [normalize(word).trim(), name]).sort((a, b) => b[0].length - a[0].length);
const LOCATION_WORDS = byLength([...KNOWN_LOCATIONS.entries()]);
const ORIGIN_WORDS = byLength([...KNOWN_ORIGINS.entries()]);

function parsePlaces(text, filters) {
  const found = new Set();
  let remaining = text;
  for (const [needle, canonical] of LOCATION_WORDS) {
    if (hasPhrase(remaining, needle)) {
      found.add(canonical);
      remaining = remaining.replace(needle, " ");
    }
  }
  filters.locations = [...found];

  // A home city is never a place we have villas in, so naming one always
  // means "somewhere close to it"
  for (const [needle, canonical] of ORIGIN_WORDS) {
    if (hasPhrase(remaining, needle)) {
      filters.near = canonical;
      break;
    }
  }
  const hours = text.match(/(\d{1,2})\s*(?:hours?|hrs?)\b/);
  if (filters.near && hours) filters.maxHours = parseInt(hours[1], 10);
}

function parseTerrains(text, filters) {
  filters.terrains = Object.entries(TERRAINS)
    .filter(([, words]) => words.some((w) => hasPhrase(text, w)))
    .map(([key]) => key);
}

function parseAmenities(text, filters) {
  filters.amenities = Object.entries(AMENITIES)
    .filter(([key, { words }]) => {
      if (key === "privatePool" && /\bno pool\b/.test(text)) return false;
      return words.some((w) => hasPhrase(text, w));
    })
    .map(([key]) => key);
}

function parseSort(text, filters) {
  if (/\b(cheapest|cheap|budget(?!\s*(?:of |is )?(?:rs|₹|inr)?\s*\d)|affordable|lowest price|low price)\b/.test(text)) filters.sortBy = "priceLow";
  else if (/\b(luxury|luxurious|premium|most expensive|lavish)\b/.test(text)) filters.sortBy = "priceHigh";
  else if (/\b(best rated|top rated|highest rated|best reviewed|best)\b/.test(text)) filters.sortBy = "rating";
}

// Deterministic fallback: no network, no key needed, runs in under a millisecond.
export function ruleParse(query) {
  const text = normalize(query);
  const filters = emptyFilters();
  parseWhen(text, filters);
  parsePrice(text, filters);
  parseBedrooms(text, filters);
  parseGuests(text, filters);
  parsePlaces(text, filters);
  parseTerrains(text, filters);
  parseAmenities(text, filters);
  parseSort(text, filters);
  return filters;
}
