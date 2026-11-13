import { allowedTowns } from "./geography.js";

// A group of 4 should not open on an 18 guest estate.
// Allow double the group size, or six extra beds, whichever is larger.
export function guestCeiling(guests) {
  return Math.max(guests * 2, guests + 6);
}

/**
 * Builds the database query from filters that have already been sanitised.
 * Kept free of any database import so it can be checked by the test suite
 * without a running cluster.
 *
 * `skip` holds the constraints that the relaxation pass has dropped.
 */
export function buildMongoQuery(filters, stay, skip = new Set()) {
  const query = {};

  if (filters.guests && !skip.has("guests")) {
    query.maxGuests = { $gte: filters.guests };
    if (!skip.has("guestCeiling")) query.maxGuests.$lte = guestCeiling(filters.guests);
  }
  if (filters.bedrooms) query.bedrooms = { $gte: filters.bedrooms };

  // Every place name, from a single town to "North East India", arrives here
  // already turned into the towns it stands for, so the database only ever
  // sees a plain list of town names.
  if (!skip.has("locations")) {
    const towns = allowedTowns(filters);
    if (towns) query.city = { $in: towns };
  }
  if (filters.terrains.length) query.terrains = { $in: filters.terrains };
  if (filters.amenities.length && !skip.has("amenities")) query.amenities = { $all: filters.amenities };

  if (!skip.has("price") && (filters.minPrice || filters.maxPrice)) {
    query.pricePerNight = {};
    if (filters.minPrice) query.pricePerNight.$gte = filters.minPrice;
    if (filters.maxPrice) query.pricePerNight.$lte = filters.maxPrice;
  }

  if (stay && !skip.has("dates")) query.bookedDates = { $nin: stay.stayNights };

  return query;
}

// Dropped one at a time, in this order, so the guest always sees something
// and is told exactly which constraint was loosened.
export const RELAX_STEPS = [
  { key: "guestCeiling", label: "Showing larger villas that also fit your group" },
  { key: "price", label: "Nothing sits inside your budget, so these are the closest above it" },
  { key: "amenities", label: "No villa has every amenity you asked for, so these are the nearest matches" },
  { key: "dates", label: "Every match is taken on those nights, so these are free on other dates" },
  { key: "locations", label: "Nothing is free in that area, so these are similar stays elsewhere" },
  { key: "guests", label: "No villa sleeps a group that size, so these are the largest ones" },
];
