import { PLACES, PLACE_ALIASES, STATES } from "./vocabulary.js";

// The place guide. It answers one question for the rest of the search:
// which of our towns does a name stand for?
//
// A name can be a town (Manali), a region (Lonavala covers Khandala and
// Pawna), a state (Kerala), a zone of the country (North India) or a
// landscape that crosses state lines (the Konkan coast). The model and the
// keyword parser may only hand back names that exist here, and the query
// builder turns every one of them into a plain list of towns. Adding a new
// area is a data change in this file or in PLACES, never a prompt change.

// Zones follow the zonal councils of India, the way most people split the
// country when they say "north" or "south".
export const ZONES = {
  "North India": {
    words: ["north india", "northern india", "north indian", "up north", "the north"],
    states: ["Jammu and Kashmir", "Ladakh", "Himachal Pradesh", "Punjab", "Haryana", "Delhi", "Uttarakhand", "Uttar Pradesh", "Rajasthan", "Chandigarh"],
  },
  "North East India": {
    words: ["north east", "northeast", "north eastern", "north east india", "northeast india", "seven sisters", "ne india"],
    states: ["Assam", "Meghalaya", "Arunachal Pradesh", "Nagaland", "Manipur", "Mizoram", "Tripura", "Sikkim"],
  },
  "East India": {
    words: ["east india", "eastern india", "east indian", "the east"],
    states: ["West Bengal", "Odisha", "Bihar", "Jharkhand"],
  },
  "Central India": {
    words: ["central india"],
    states: ["Madhya Pradesh", "Chhattisgarh"],
  },
  "West India": {
    words: ["west india", "western india"],
    states: ["Maharashtra", "Goa", "Gujarat", "Dadra and Nagar Haveli and Daman and Diu"],
  },
  "South India": {
    words: ["south india", "southern india", "south indian", "down south", "the south"],
    states: ["Karnataka", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Telangana", "Puducherry", "Lakshadweep"],
  },
};

// Landscapes that are not one state. Which towns belong to each is written
// on the town itself in PLACES, under "areas".
export const AREAS = {
  himalayas: { label: "Himalayas", words: ["himalaya", "himalayas", "himalayan"] },
  westernGhats: { label: "Western Ghats", words: ["western ghats", "sahyadri", "sahyadris", "sahyadri range"] },
  konkan: { label: "Konkan coast", words: ["konkan", "kokan", "konkan coast", "konkan belt"] },
  thar: { label: "Thar desert", words: ["thar", "thar desert", "great indian desert"] },
  rann: { label: "Rann of Kutch", words: ["rann", "rann of kutch", "white desert", "white rann"] },
  backwaters: { label: "Kerala backwaters", words: ["backwaters", "backwater", "houseboat"] },
};

// Home cities people search out from. We have no villas in them, so
// "near Mumbai" means towns within a drive of Mumbai.
export const ORIGINS = {
  Mumbai: { words: ["mumbai", "bombay", "navi mumbai", "thane"], lat: 19.08, lng: 72.88 },
  Pune: { words: ["pune", "poona"], lat: 18.52, lng: 73.86 },
  Delhi: { words: ["delhi", "new delhi", "ncr", "gurgaon", "gurugram", "noida"], lat: 28.61, lng: 77.21 },
  Bengaluru: { words: ["bengaluru", "bangalore", "blr"], lat: 12.97, lng: 77.59 },
  Hyderabad: { words: ["hyderabad"], lat: 17.39, lng: 78.49 },
  Chennai: { words: ["chennai", "madras"], lat: 13.08, lng: 80.27 },
  Kolkata: { words: ["kolkata", "calcutta"], lat: 22.57, lng: 88.36 },
  Ahmedabad: { words: ["ahmedabad"], lat: 23.02, lng: 72.57 },
  Chandigarh: { words: ["chandigarh"], lat: 30.73, lng: 76.78 },
  Guwahati: { words: ["guwahati"], lat: 26.14, lng: 91.74 },
};

// How far "near a city" reaches when the guest gives no number of hours.
export const DEFAULT_MAX_HOURS = 4;

const AREA_LABELS = Object.fromEntries(Object.entries(AREAS).map(([id, area]) => [area.label, id]));

export function zoneOfState(state) {
  return Object.keys(ZONES).find((zone) => ZONES[zone].states.includes(state)) || null;
}

export function placeByCity(city) {
  return PLACES.find((place) => place.city === city) || null;
}

/**
 * Every name the search accepts, lowercased, mapped to its one proper
 * spelling. The sanitiser keeps a location only when it is in here.
 */
export const KNOWN_LOCATIONS = (() => {
  const known = new Map();
  const add = (word, name) => known.set(word.toLowerCase(), name);
  for (const place of PLACES) {
    add(place.city, place.city);
    add(place.region, place.region);
  }
  for (const state of STATES) add(state, state);
  for (const [alias, name] of Object.entries(PLACE_ALIASES)) add(alias, name);
  for (const [zone, { words }] of Object.entries(ZONES)) {
    add(zone, zone);
    words.forEach((word) => add(word, zone));
  }
  for (const { label, words } of Object.values(AREAS)) {
    add(label, label);
    words.forEach((word) => add(word, label));
  }
  return known;
})();

export const KNOWN_ORIGINS = (() => {
  const known = new Map();
  for (const [name, { words }] of Object.entries(ORIGINS)) {
    known.set(name.toLowerCase(), name);
    words.forEach((word) => known.set(word, name));
  }
  return known;
})();

// The towns one name stands for
function townsFor(name) {
  if (ZONES[name]) return PLACES.filter((place) => ZONES[name].states.includes(place.state));
  if (AREA_LABELS[name]) return PLACES.filter((place) => place.areas.includes(AREA_LABELS[name]));
  return PLACES.filter((place) => place.city === name || place.region === name || place.state === name);
}

/** Turns any mix of towns, regions, states, zones and areas into town names. */
export function expandLocations(names = []) {
  return [...new Set(names.flatMap((name) => townsFor(name).map((place) => place.city)))];
}

// Straight line distance, stretched for winding roads and an Indian average
// road speed. Rough, but the right order of magnitude for "a weekend drive".
const ROAD_FACTOR = 1.4;
const ROAD_SPEED_KMH = 50;

function kilometres(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function driveHours(origin, city) {
  const from = ORIGINS[origin];
  const to = placeByCity(city);
  if (!from || !to) return null;
  return Number(((kilometres(from, to) * ROAD_FACTOR) / ROAD_SPEED_KMH).toFixed(1));
}

/**
 * Towns reachable from a home city inside the given number of hours. When the
 * guest named no number and nothing sits inside the usual weekend drive, the
 * closest few towns are the honest answer, and each card says how far it is.
 */
export function townsNear(origin, maxHours = null) {
  if (!ORIGINS[origin]) return [];
  const byDistance = PLACES.map((place) => ({ city: place.city, hours: driveHours(origin, place.city) })).sort((a, b) => a.hours - b.hours);
  const inside = byDistance.filter((town) => town.hours <= (maxHours || DEFAULT_MAX_HOURS));
  if (inside.length || maxHours) return inside.map((town) => town.city);
  const nearest = byDistance[0].hours;
  return byDistance.filter((town) => town.hours <= nearest + 1.5).map((town) => town.city);
}

/**
 * The towns a set of filters allows, or null when the guest set no place at
 * all. A named place and a home city together means both have to hold, so
 * "Western Ghats near Pune" is the ghats towns that are close to Pune.
 */
export function allowedTowns(filters) {
  const hasPlaces = filters.locations?.length > 0;
  const hasOrigin = Boolean(filters.near);
  if (!hasPlaces && !hasOrigin) return null;

  let towns = hasPlaces ? expandLocations(filters.locations) : null;
  if (hasOrigin) {
    const close = townsNear(filters.near, filters.maxHours);
    towns = towns ? towns.filter((town) => close.includes(town)) : close;
  }
  return towns;
}

// Short lines for the model, so it can connect any wording to a real name.
export function placeGuideForPrompt() {
  const zones = Object.entries(ZONES)
    .map(([zone, { states }]) => `${zone}: ${states.join(", ")}`)
    .join("\n");
  const areas = Object.entries(AREAS)
    .map(([id, { label }]) => `${label}: ${PLACES.filter((p) => p.areas.includes(id)).map((p) => p.city).join(", ")}`)
    .join("\n");
  const towns = PLACES.map((p) => `${p.city} (${p.region}, ${p.state}, ${zoneOfState(p.state)}; ${p.terrains.join(", ")})`).join("\n");
  return { zones, areas, towns, origins: Object.keys(ORIGINS).join(", ") };
}
