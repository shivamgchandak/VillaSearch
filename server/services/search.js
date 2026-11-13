import Villa from "../models/Villa.js";
import { resolveStay, addDays, weekday } from "./dates.js";
import { buildMongoQuery, RELAX_STEPS } from "./query.js";
import { scoreVilla } from "./scoring.js";
import { sanitizeFilters } from "./filters.js";
import { AMENITIES, PLACES } from "./vocabulary.js";
import { driveHours, expandLocations, zoneOfState, ZONES, DEFAULT_MAX_HOURS } from "./geography.js";
import { config } from "../config/env.js";

const COMPARATORS = {
  relevance: (a, b) => b.score - a.score || b.popularity - a.popularity,
  popularity: (a, b) => b.popularity - a.popularity || b.rating - a.rating,
  priceLow: (a, b) => a.pricePerNight - b.pricePerNight || b.score - a.score,
  priceHigh: (a, b) => b.pricePerNight - a.pricePerNight || b.score - a.score,
  rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
};

const rupees = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;

function decorate(villa, filters, stay) {
  const { bookedDates = [], ...rest } = villa;
  const available = stay ? !stay.stayNights.some((night) => bookedDates.includes(night)) : null;
  const { score, reasons } = scoreVilla(rest, filters, available);
  return {
    ...rest,
    available,
    score,
    matchReasons: reasons,
    totalPrice: stay ? rest.pricePerNight * stay.nights : null,
    driveHours: filters.near ? driveHours(filters.near, rest.city) : null,
  };
}

// The first date the same number of nights is free again. Weekend trips move
// a week at a time, because a guest who asked for Saturday wants a Saturday.
function nextFreeStart(bookedDates, stay) {
  const weekend = [5, 6].includes(weekday(stay.checkIn));
  const step = weekend ? 7 : 1;
  const tries = weekend ? 8 : 45;
  for (let i = 1; i <= tries; i += 1) {
    const start = addDays(stay.checkIn, i * step);
    const nights = Array.from({ length: stay.nights }, (_, n) => addDays(start, n));
    if (!nights.some((night) => bookedDates.includes(night))) return start;
  }
  return null;
}

/**
 * Villas that miss on exactly one thing: a little over budget, or booked on
 * the asked nights. Shown under their own heading when the real results are
 * few, each saying what is off, so the guest can choose instead of starting over.
 */
async function closeMatchesFor(filters, stay, taken) {
  const found = [];

  if (filters.maxPrice) {
    const query = buildMongoQuery(filters, stay, new Set(["price"]));
    query.pricePerNight = { $gt: filters.maxPrice, $lte: Math.round(filters.maxPrice * 1.25) };
    const rows = await Villa.find(query).limit(8).select("-__v").lean();
    for (const villa of rows) {
      found.push({ ...decorate(villa, filters, stay), miss: { kind: "price", over: villa.pricePerNight - filters.maxPrice } });
    }
  }

  if (stay) {
    const rows = await Villa.find(buildMongoQuery(filters, null, new Set(["dates"]))).limit(40).select("-__v").lean();
    for (const villa of rows) {
      if (!stay.stayNights.some((night) => villa.bookedDates.includes(night))) continue;
      const nextFree = nextFreeStart(villa.bookedDates, stay);
      if (!nextFree) continue;
      found.push({ ...decorate(villa, filters, stay), miss: { kind: "dates", nextFree } });
    }
  }

  const seen = new Set(taken);
  return found
    .filter((villa) => !seen.has(String(villa._id)) && seen.add(String(villa._id)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

// How the villas in this search spread by price, before the budget is
// applied. Drives the little chart in the budget picker and the line that
// says how many more villas a slightly higher budget opens up.
async function priceGuideFor(filters, stay) {
  const rows = await Villa.find(buildMongoQuery(filters, stay, new Set(["price"])))
    .limit(config.search.candidateLimit)
    .select("pricePerNight")
    .lean();
  const prices = rows.map((row) => row.pricePerNight).sort((a, b) => a - b);
  const bands = Array.from({ length: 12 }, (_, i) => ({ from: 5000 * (i + 1), to: 5000 * (i + 2), count: 0 }));
  for (const price of prices) {
    const index = Math.min(11, Math.max(0, Math.floor(price / 5000) - 1));
    bands[index].count += 1;
  }

  let nextStep = null;
  if (filters.maxPrice) {
    const above = prices.find((price) => price > filters.maxPrice);
    if (above) {
      const price = Math.ceil(above / 1000) * 1000;
      nextStep = { price, extra: prices.filter((p) => p > filters.maxPrice && p <= price).length };
    }
  }
  return { min: prices[0] ?? null, max: prices[prices.length - 1] ?? null, bands, nextStep };
}

async function countFor(filters) {
  return Villa.countDocuments(buildMongoQuery(filters, resolveStay(filters)));
}

async function namesFor(filters) {
  const rows = await Villa.find(buildMongoQuery(filters, resolveStay(filters))).sort({ popularity: -1 }).limit(2).select("name").lean();
  return rows.map((row) => row.name).join(" and ");
}

function zoneOfLocation(name) {
  if (ZONES[name]) return null;
  const town = expandLocations([name])[0];
  const place = PLACES.find((p) => p.city === town);
  return place ? zoneOfState(place.state) : null;
}

/**
 * When nothing fits every ask, each single change the guest could make, with
 * how many villas it opens up. Only changes that actually help are offered,
 * most helpful first. The guest picks one; nothing is loosened silently.
 */
async function alternativesFor(filters) {
  const options = [];
  const tryChange = async (key, label, next) => {
    const changed = sanitizeFilters(next);
    const count = await countFor(changed);
    if (count) options.push({ key, label, detail: await namesFor(changed), count, filters: changed });
  };

  for (const amenity of filters.amenities) {
    await tryChange(`amenity:${amenity}`, `Skip ${AMENITIES[amenity].label.toLowerCase()}`, {
      ...filters,
      amenities: filters.amenities.filter((item) => item !== amenity),
    });
  }
  if (filters.maxPrice) {
    const raised = Math.round((filters.maxPrice * 1.25) / 1000) * 1000;
    await tryChange("price", `Raise the budget to ${rupees(raised)}`, { ...filters, maxPrice: raised });
  }
  if (resolveStay(filters)) {
    await tryChange("dates", "Other dates", { ...filters, when: null, dayOfWeek: null, checkIn: null, checkOut: null, nights: null });
  }
  if (filters.locations.length) {
    const zone = zoneOfLocation(filters.locations[0]);
    if (zone) await tryChange("place", `Anywhere in ${zone}`, { ...filters, locations: [zone] });
  } else if (filters.near) {
    const hours = (filters.maxHours || DEFAULT_MAX_HOURS) + 2;
    await tryChange("place", `Up to ${hours} hours from ${filters.near}`, { ...filters, maxHours: hours });
  }
  if (filters.guests) {
    const loose = sanitizeFilters({ ...filters, guests: null });
    const biggest = await Villa.find(buildMongoQuery(loose, resolveStay(loose))).sort({ maxGuests: -1 }).limit(1).select("maxGuests").lean();
    const most = biggest[0]?.maxGuests;
    if (most && most < filters.guests) await tryChange("guests", `Make it ${most} guests, or two villas`, { ...filters, guests: most });
  }

  return options.sort((a, b) => b.count - a.count).slice(0, 5);
}

/**
 * One trip through the database, then the ranking happens here where the
 * request is still in hand. A pure database sort cannot know that a villa for
 * fourteen is a poor answer to a search for four, or that being free on the
 * asked nights matters more than a slightly better rating.
 */
export async function searchVillas(filters, { page = 1, pageSize = config.search.pageSize } = {}) {
  const stay = resolveStay(filters);
  const limit = config.search.candidateLimit;

  const fetch = (skip) => Villa.find(buildMongoQuery(filters, stay, skip)).limit(limit).select("-__v").lean();

  let candidates = await fetch(new Set());
  let relaxed = null;
  let alternatives = [];

  if (!candidates.length) {
    alternatives = await alternativesFor(filters);
    if (config.search.relaxWhenEmpty) {
      const skip = new Set();
      for (const step of RELAX_STEPS) {
        skip.add(step.key);
        candidates = await fetch(skip);
        if (candidates.length) {
          relaxed = { key: step.key, label: step.label };
          break;
        }
      }
    }
  }

  const scored = candidates.map((villa) => decorate(villa, filters, stay));
  scored.sort(COMPARATORS[filters.sortBy] || COMPARATORS.relevance);

  // When the group size itself was the thing that had to give, the largest
  // villas are the only useful answer, whatever the other scores say.
  if (relaxed?.key === "guests") scored.sort((a, b) => b.maxGuests - a.maxGuests || b.score - a.score);

  const size = Math.min(Math.max(1, pageSize), config.search.maxPageSize);
  const pageCount = Math.max(1, Math.ceil(scored.length / size));
  const current = Math.min(Math.max(1, page), pageCount);
  const results = scored.slice((current - 1) * size, current * size);

  const firstPage = current === 1;
  const closeMatches =
    firstPage && !relaxed && scored.length < 4 ? await closeMatchesFor(filters, stay, scored.map((villa) => String(villa._id))) : [];
  const priceGuide = firstPage ? await priceGuideFor(filters, stay) : null;

  return {
    stay: stay && { checkIn: stay.checkIn, checkOut: stay.checkOut, nights: stay.nights },
    relaxed,
    alternatives,
    total: scored.length,
    page: current,
    pageSize: size,
    pageCount,
    hasMore: current < pageCount,
    results,
    closeMatches,
    priceGuide,
  };
}

/**
 * How many villas a set of filters would find, without ranking or paging.
 * Used by the live preview under the search bar, so it has to stay cheap:
 * one count on indexed fields.
 */
export async function countVillas(filters) {
  return countFor(filters);
}
