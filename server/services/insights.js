import SearchLog from "../models/SearchLog.js";
import Villa from "../models/Villa.js";
import { TERRAINS, AMENITIES, PLACES } from "./vocabulary.js";
import { KNOWN_LOCATIONS, KNOWN_ORIGINS, expandLocations, zoneOfState } from "./geography.js";
import { buildMongoQuery } from "./query.js";
import { sanitizeFilters } from "./filters.js";
import { normalize } from "./text.js";

// Everyday words that carry no request on their own
const COMMON = new Set(
  `a an the and or but for with without of in on at to from near by into up down this that these those some any
  i we us our me my you your it its is are was be been am do does can could would should will want need looking
  find show get give me please villa villas stay stays home homes house houses place places property bungalow cottage
  trip holiday vacation getaway weekend weekends night nights day days week next coming upcoming today tonight tomorrow
  people person persons guests guest friends family families group gang couple kids adults pax of us all
  under below above over less more than around about max maximum minimum budget price cheap cheaper luxury best good nice
  lakh lakhs thousand k rs inr only also now make it instead what how side area region somewhere something anywhere
  monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september
  october november december jan feb mar apr jun jul aug sep sept oct nov dec st nd rd th hours hour drive away close
  within just like really very much lot lots big bigger small smaller few new old`.split(/\s+/)
);

const KNOWN_WORDS = (() => {
  const words = new Set();
  const addPhrase = (phrase) => normalize(phrase).trim().split(/\s+/).forEach((word) => words.add(word));
  Object.values(TERRAINS).flat().forEach(addPhrase);
  Object.values(AMENITIES).forEach(({ words: list, label }) => [...list, label].forEach(addPhrase));
  [...KNOWN_LOCATIONS.keys(), ...KNOWN_ORIGINS.keys()].forEach(addPhrase);
  return words;
})();

/** Words in a sentence that the search has no meaning for, such as "treehouse". */
export function unknownWords(query) {
  return [
    ...new Set(
      normalize(query)
        .replace(/[^a-z0-9₹\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !/\d/.test(word) && !COMMON.has(word) && !KNOWN_WORDS.has(word))
    ),
  ];
}

// A plain description of what a search asked for, used as the row label
export function describeRequest(filters) {
  const parts = [];
  parts.push(...filters.amenities.map((key) => AMENITIES[key]?.label).filter(Boolean));
  if (filters.maxPrice) parts.push(`under ₹${filters.maxPrice.toLocaleString("en-IN")}`);
  let where = filters.locations.length ? filters.locations.join(" or ") : filters.near ? `near ${filters.near}` : "";
  if (!where && filters.terrains.length) where = filters.terrains.map((t) => `${t} villas`).join(", ");
  const head = parts.length ? parts.join(", ") : "Any villa";
  const size = filters.guests >= 10 ? ", 10 or more" : "";
  return `${head}${where ? ` in ${where}` : ""}${size}`.replace(/^./, (c) => c.toUpperCase());
}

export async function logSearch(entry) {
  try {
    await SearchLog.create({ ...entry, unknownWords: unknownWords(entry.query) });
  } catch (error) {
    console.warn(`Could not log the search, ${error.message}`);
  }
}

/**
 * The team view: what guests asked for over the last few days, where supply
 * falls short, and which words the search could not place.
 */
export async function buildInsights(days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  const logs = await SearchLog.find({ createdAt: { $gte: since }, refined: { $ne: true } }).lean();
  const totalVillas = await Villa.countDocuments({});
  const petVillas = await Villa.countDocuments({ amenities: "petFriendly" });

  const searches = logs.length;
  const nothing = logs.filter((log) => log.strictTotal === 0).length;
  const pets = logs.filter((log) => log.filters?.amenities?.includes("petFriendly")).length;
  const groups = logs.map((log) => log.filters?.guests).filter(Boolean).sort((a, b) => a - b);
  const medianGuests = groups.length ? groups[Math.floor(groups.length / 2)] : null;

  // Group the searches by what they asked for, ignoring dates, then check
  // how many villas could ever answer that request
  const byRequest = new Map();
  for (const log of logs) {
    const filters = sanitizeFilters({ ...log.filters, when: null, dayOfWeek: null, checkIn: null, checkOut: null, nights: null });
    if (!filters.locations.length && !filters.near && !filters.terrains.length && !filters.amenities.length) continue;
    const label = describeRequest(filters);
    const row = byRequest.get(label) || { request: label, searches: 0, filters };
    row.searches += 1;
    byRequest.set(label, row);
  }
  const rows = [...byRequest.values()].sort((a, b) => b.searches - a.searches).slice(0, 20);
  for (const row of rows) row.villas = await Villa.countDocuments(buildMongoQuery(row.filters, null));
  const gaps = rows
    .map(({ request, searches, villas }) => ({ request, searches, villas, gap: Math.round((searches / (searches + villas * 5)) * 100) }))
    .sort((a, b) => b.gap - a.gap || b.searches - a.searches)
    .slice(0, 6);

  const wordCounts = new Map();
  for (const log of logs) for (const word of log.unknownWords || []) wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  const words = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  const zoneCounts = new Map();
  let placed = 0;
  for (const log of logs) {
    const towns = expandLocations(log.filters?.locations || []);
    const zones = new Set(towns.map((town) => zoneOfState(PLACES.find((p) => p.city === town)?.state)).filter(Boolean));
    if (!zones.size) continue;
    placed += 1;
    zones.forEach((zone) => zoneCounts.set(zone, (zoneCounts.get(zone) || 0) + 1));
  }
  const zones = [...zoneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, pct: Math.round((count / placed) * 100) }));

  return {
    days,
    searches,
    nothingShare: searches ? Math.round((nothing / searches) * 100) : 0,
    nothingCount: nothing,
    petShare: searches ? Math.round((pets / searches) * 100) : 0,
    petVillas,
    totalVillas,
    medianGuests,
    gaps,
    words,
    zones,
  };
}
