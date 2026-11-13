import { VILLA_ROWS, AMENITY_CODES } from "./villas.js";
import { PLACES } from "../services/vocabulary.js";
import { zoneOfState } from "../services/geography.js";
import { todayIST, addDays, weekday } from "../services/dates.js";
import { config } from "../config/env.js";

// Small seeded random so every seed produces the same bookings
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// Popular villas get booked more, especially on weekends. The coming
// weekend is kept mostly open so a demo search for "this weekend" has
// plenty to show, with a handful of villas taken so the date check still
// has something visible to do.
function makeBookings(index, popularity, random) {
  const today = todayIST();
  const comingSaturday = addDays(today, (6 - weekday(today) + 7) % 7);
  const comingFriday = addDays(comingSaturday, -1);
  const booked = new Set();
  for (let i = 0; i < config.seed.bookingHorizonDays; i++) {
    const date = addDays(today, i);
    const wd = weekday(date);
    const weekend = wd === 5 || wd === 6;
    const coming = date === comingFriday || date === comingSaturday;
    const chance = (coming ? 0.03 : weekend ? 0.18 : 0.06) * (0.5 + popularity);
    if (random() < chance) booked.add(date);
  }
  if (index % 10 === 3) booked.add(comingSaturday);
  return [...booked].sort();
}

export function buildVillas() {
  const random = rng(config.seed.randomSeed);
  const maxReviews = Math.max(...VILLA_ROWS.map((r) => r[6]));

  return VILLA_ROWS.map(([name, city, bedrooms, maxGuests, price, rating, reviews, codes], i) => {
    const place = PLACES.find((p) => p.city === city);
    if (!place) throw new Error(`Unknown city in seed data: ${city}`);
    // Popularity blends review volume and rating, scaled 0 to 1
    const popularity = Number((0.7 * (reviews / maxReviews) + 0.3 * ((rating - 4) / 1)).toFixed(3));

    return {
      name,
      slug: slugify(name),
      city,
      region: place.region,
      state: place.state,
      zone: zoneOfState(place.state),
      areas: place.areas,
      terrains: place.terrains,
      amenities: codes.split("").map((c) => AMENITY_CODES[c]),
      bedrooms,
      maxGuests,
      pricePerNight: price,
      rating,
      reviewCount: reviews,
      popularity,
      description: `${bedrooms} bedroom villa in ${city}, ${place.state}, ${zoneOfState(place.state)}, for up to ${maxGuests} guests. Landscape: ${place.terrains.join(", ")}.`,
      bookedDates: makeBookings(i, popularity, random),
    };
  });
}

