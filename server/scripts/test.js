// Checks everything that does not need a database: the two parsers, the date
// maths, the sanitiser, the query builder, the ranking and the follow up
// merge. Run it with: npm test
//
// No test framework, so there is nothing to install and it runs in well under
// a second, which means it can be run on every change without thinking about it.

import { ruleParse } from "../services/ruleParser.js";
import { sanitizeFilters, mergeFilters, emptyFilters } from "../services/filters.js";
import { resolveStay, addDays, weekday } from "../services/dates.js";
import { buildMongoQuery, guestCeiling } from "../services/query.js";
import { scoreVilla } from "../services/scoring.js";
import { isRefinement, detectRemovals, applyRelative } from "../services/refine.js";
import { normalize } from "../services/text.js";
import { expandLocations, townsNear, allowedTowns, driveHours } from "../services/geography.js";
import { PLACES } from "../services/vocabulary.js";
import { unknownWords, describeRequest } from "../services/insights.js";

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) passed += 1;
  else failures.push(`${name}${detail ? `\n      ${detail}` : ""}`);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const parse = (text) => sanitizeFilters(ruleParse(text));

// ---------------------------------------------------------------- parser

const one = parse("Villa for 12 near Lonavala, pet friendly, private pool, under 40k for Saturday");
check("group size is read", one.guests === 12, `got ${one.guests}`);
check("place is read", same(one.locations, ["Lonavala"]), JSON.stringify(one.locations));
check("amenities are read", one.amenities.includes("privatePool") && one.amenities.includes("petFriendly"), JSON.stringify(one.amenities));
check("budget in thousands is read", one.maxPrice === 40000, `got ${one.maxPrice}`);
check("weekday is read", one.when === "day_of_week" && one.dayOfWeek === "saturday", JSON.stringify([one.when, one.dayOfWeek]));

const two = parse("Villa for 10 next coming weekend near mountains");
check("terrain is read", same(two.terrains, ["mountain"]), JSON.stringify(two.terrains));
check("a terrain does not invent a place", two.locations.length === 0, JSON.stringify(two.locations));
check("coming weekend is this weekend", two.when === "this_weekend", String(two.when));

const three = parse("Villa for 4 near beach");
check("beach search finds the terrain", same(three.terrains, ["beach"]), JSON.stringify(three.terrains));
check("beach search leaves the sort alone", three.sortBy === "relevance", three.sortBy);

const four = parse("about 10 people within 2 nights in Kerala");
check("a night count is not a budget", four.maxPrice === null, `got ${four.maxPrice}`);
check("nights are read", four.nights === 2, `got ${four.nights}`);
check("a state is a place", same(four.locations, ["Kerala"]), JSON.stringify(four.locations));

const five = parse("cheap stay in north goa for a couple with jacuzzi on 25th dec for 2 nights");
check("a couple is two guests", five.guests === 2, `got ${five.guests}`);
check("the longer place name wins", same(five.locations, ["North Goa"]), JSON.stringify(five.locations));
check("cheap sorts by price", five.sortBy === "priceLow", five.sortBy);
check("an explicit date is read", five.when === "specific" && /\d{4}-12-25/.test(five.checkIn), String(five.checkIn));

check("number words are turned into digits", /\b8\b/.test(normalize("villa for eight friends")), normalize("villa for eight friends"));
check("no pool means no pool", !parse("villa in karjat with no pool").amenities.includes("privatePool"));
check("petrol is not a pet", !parse("villa near a petrol pump in karjat").amenities.includes("petFriendly"));
check("a price range is read", same([parse("villa between 20000 and 35000").minPrice, parse("villa between 20000 and 35000").maxPrice], [20000, 35000]));

// ------------------------------------------------------------------ dates

const saturday = "2026-09-19";
check("the fixture really is a Saturday", weekday(saturday) === 6);

const weekendStay = resolveStay({ ...emptyFilters(), when: "this_weekend" }, saturday);
check("this weekend starts today when today is Saturday", weekendStay.checkIn === saturday, weekendStay.checkIn);
check("a weekend is two nights", weekendStay.nights === 2, String(weekendStay.nights));
check("check out is the Monday", weekendStay.checkOut === addDays(saturday, 2), weekendStay.checkOut);

const nextWeekend = resolveStay({ ...emptyFilters(), when: "next_weekend" }, saturday);
check("next weekend is seven days later", nextWeekend.checkIn === addDays(saturday, 7), nextWeekend.checkIn);

const sunday = "2026-09-20";
const sundayWeekend = resolveStay({ ...emptyFilters(), when: "this_weekend" }, sunday);
check("on a Sunday only Sunday night is left", sundayWeekend.checkIn === sunday && sundayWeekend.nights === 1, JSON.stringify(sundayWeekend));

const nextSaturday = resolveStay({ ...emptyFilters(), when: "day_of_week", dayOfWeek: "saturday" }, "2026-09-16");
check("a weekday looks forward", nextSaturday.checkIn === "2026-09-19", nextSaturday.checkIn);
check("no date intent means no stay", resolveStay(emptyFilters(), saturday) === null);
check("a stay never starts in the past", resolveStay({ ...emptyFilters(), when: "specific", checkIn: "2020-01-01" }, saturday).checkIn === saturday);

// -------------------------------------------------------------- sanitiser

const dirty = sanitizeFilters({
  guests: { $gt: 0 },
  locations: ["Lonavala", "Atlantis", { $ne: null }],
  terrains: ["mountain", "moon"],
  amenities: ["privatePool", "helipad"],
  minPrice: 50000,
  maxPrice: 20000,
  sortBy: "drop table",
  when: "someday",
  extra: "ignored",
});
check("an operator is not a group size", dirty.guests === null, JSON.stringify(dirty.guests));
check("an unknown place is dropped", same(dirty.locations, ["Lonavala"]), JSON.stringify(dirty.locations));
check("an unknown terrain is dropped", same(dirty.terrains, ["mountain"]), JSON.stringify(dirty.terrains));
check("an unknown amenity is dropped", same(dirty.amenities, ["privatePool"]), JSON.stringify(dirty.amenities));
check("a flipped price range is put right", dirty.minPrice === 20000 && dirty.maxPrice === 50000);
check("an unknown sort falls back", dirty.sortBy === "relevance", dirty.sortBy);
check("an unknown date intent is dropped", dirty.when === null, String(dirty.when));
check("unknown keys do not survive", !("extra" in dirty));

// ---------------------------------------------------------- query builder

const stay = resolveStay({ ...emptyFilters(), when: "this_weekend" }, saturday);
const query = buildMongoQuery(one, stay);
check("the group size has a floor and a ceiling", query.maxGuests.$gte === 12 && query.maxGuests.$lte === guestCeiling(12), JSON.stringify(query.maxGuests));
check("a region becomes its towns", same([...query.city.$in].sort(), ["Khandala", "Lonavala", "Pawna"]), JSON.stringify(query.city));
check("every amenity has to be present", same(query.amenities, { $all: ["privatePool", "petFriendly"] }) || query.amenities.$all.length === 2);
check("the budget is a ceiling", query.pricePerNight.$lte === 40000);
check("booked nights are excluded", same(query.bookedDates.$nin, stay.stayNights));

const relaxed = buildMongoQuery(one, stay, new Set(["price", "amenities"]));
check("relaxing drops the budget", relaxed.pricePerNight === undefined);
check("relaxing drops the amenities", relaxed.amenities === undefined);
check("relaxing keeps the place", relaxed.city !== undefined);
check("the last step drops the group size itself", buildMongoQuery(one, stay, new Set(["guests"])).maxGuests === undefined);

// ------------------------------------------------------------------ score

const small = { maxGuests: 6, bedrooms: 3, pricePerNight: 18000, rating: 4.5, reviewCount: 150, popularity: 0.5, amenities: ["privatePool"], terrains: ["beach"] };
const huge = { maxGuests: 18, bedrooms: 7, pricePerNight: 52000, rating: 4.9, reviewCount: 200, popularity: 0.8, amenities: ["privatePool"], terrains: ["beach"] };
const wanted = { ...emptyFilters(), guests: 4, terrains: ["beach"], amenities: ["privatePool"] };
check("a group of four is not sent to an eighteen guest estate", scoreVilla(small, wanted, true).score > scoreVilla(huge, wanted, true).score);
check("a free villa beats a booked one", scoreVilla(small, wanted, true).score > scoreVilla(small, wanted, false).score);
check("the card is given a reason", scoreVilla(small, wanted, true).reasons.length > 0);

const overBudget = { ...small, pricePerNight: 60000 };
check("inside the budget beats above it", scoreVilla(small, { ...wanted, maxPrice: 20000 }, true).score > scoreVilla(overBudget, { ...wanted, maxPrice: 20000 }, true).score);

// ------------------------------------------------------------- follow ups

const first = parse("villa for 12 near lonavala with a pool under 40k");
check("a follow up is recognised", isRefinement("now make it cheaper", parse("now make it cheaper")));
check("a new trip is not a follow up", !isRefinement("villa for 8 in goa next weekend", parse("villa for 8 in goa next weekend")));
check("north goa is not read as the word no", !isRefinement("villa for 6 in north goa", parse("villa for 6 in north goa")));

const cheaper = applyRelative("now make it cheaper", mergeFilters(first, parse("now make it cheaper")));
check("cheaper lowers the budget", cheaper.maxPrice === 30000, String(cheaper.maxPrice));
check("cheaper keeps the place", same(cheaper.locations, ["Lonavala"]), JSON.stringify(cheaper.locations));
check("cheaper keeps the group size", cheaper.guests === 12, String(cheaper.guests));

const withBonfire = mergeFilters(first, parse("also with a bonfire"));
check("amenities add up on a follow up", withBonfire.amenities.includes("privatePool") && withBonfire.amenities.includes("bonfire"), JSON.stringify(withBonfire.amenities));

const moved = mergeFilters(first, parse("what about goa instead"));
check("a new place replaces the old one", same(moved.locations, ["Goa"]), JSON.stringify(moved.locations));

const dropped = mergeFilters(first, parse("without a pool"), detectRemovals("without a pool"));
check("an amenity can be taken away", !dropped.amenities.includes("privatePool"), JSON.stringify(dropped.amenities));

const noBudget = mergeFilters(first, parse("any budget"), detectRemovals("any budget"));
check("the budget can be taken away", noBudget.maxPrice === null, String(noBudget.maxPrice));

const bigger = applyRelative("make it bigger", mergeFilters(first, parse("make it bigger")));
check("bigger raises the group size", bigger.guests === 14, String(bigger.guests));

// -------------------------------------------------------------- geography

const cities = (filters) => [...(allowedTowns(filters) || [])].sort();
const inState = (state) => PLACES.filter((p) => p.state === state).map((p) => p.city);

check("every town sits in a zone", PLACES.every((p) => expandLocations(["North India", "North East India", "East India", "Central India", "West India", "South India"]).includes(p.city)));

const northHills = parse("villas near mountains in north india for 8");
check("north india is read as a zone", same(northHills.locations, ["North India"]), JSON.stringify(northHills.locations));
const northTowns = cities(northHills);
check("north india covers Himachal", ["Manali", "Shimla", "Kasauli"].every((c) => northTowns.includes(c)), JSON.stringify(northTowns));
check("north india covers Uttarakhand", ["Mussoorie", "Nainital"].every((c) => northTowns.includes(c)), JSON.stringify(northTowns));
check("north india leaves out the south", !northTowns.includes("Ooty") && !northTowns.includes("Lonavala"), JSON.stringify(northTowns));
check("mountains in the north keeps the terrain too", buildMongoQuery(northHills, null).terrains.$in.includes("mountain"));

const northEast = parse("villa in the north-east for 6");
check("north east is read with a hyphen", same(northEast.locations, ["North East India"]), JSON.stringify(northEast.locations));
check("north east covers only north eastern states", same(cities(northEast), ["Gangtok", "Kaziranga", "Shillong"]), JSON.stringify(cities(northEast)));

const southHills = parse("mountain villa in south india");
const southTowns = cities(southHills);
check("south india hills include Munnar, Ooty, Coorg, Kodaikanal", ["Munnar", "Ooty", "Coorg", "Kodaikanal"].every((c) => southTowns.includes(c)), JSON.stringify(southTowns));
check("south india leaves out Himachal", !southTowns.includes("Manali"));

const konkan = parse("something on the kokan side with a pool");
check("kokan is read as the Konkan coast", same(konkan.locations, ["Konkan coast"]), JSON.stringify(konkan.locations));
check("the Konkan coast crosses states", ["Alibaug", "Ratnagiri", "Tarkarli", "North Goa"].every((c) => cities(konkan).includes(c)), JSON.stringify(cities(konkan)));
check("the Konkan coast is not inland", !cities(konkan).includes("Lonavala"));

const desert = parse("villa near the desert for 10 this weekend");
check("desert is a landscape, not a place", same(desert.terrains, ["desert"]) && desert.locations.length === 0, JSON.stringify(desert));
const desertTowns = PLACES.filter((p) => p.terrains.includes("desert")).map((p) => p.city).sort();
check("desert villas sit in Rajasthan and Gujarat", same(desertTowns, ["Jaisalmer", "Kutch"]), JSON.stringify(desertTowns));
check("white desert means the Rann", same(parse("stay near the white desert").locations, ["Rann of Kutch"]));

check("sahyadri is the Western Ghats", same(parse("sahyadri villa").locations, ["Western Ghats"]));
check("himalayan is the Himalayas", expandLocations(parse("himalayan cottage").locations).includes("Gangtok"));
check("a zone with no villas finds no towns", expandLocations(["Central India"]).length === 0);
check("an invented zone does not survive", sanitizeFilters({ locations: ["Middle Earth"] }).locations.length === 0);
check("a state still works", same(expandLocations(["Kerala"]).sort(), inState("Kerala").sort()));

// -------------------------------------------------------- near a home city

const nearMumbai = parse("weekend getaway near mumbai with a pool");
check("a home city is read as near", nearMumbai.near === "Mumbai" && nearMumbai.locations.length === 0, JSON.stringify([nearMumbai.near, nearMumbai.locations]));
check("near mumbai reaches Lonavala and Alibaug", ["Lonavala", "Alibaug", "Karjat"].every((c) => cities(nearMumbai).includes(c)), JSON.stringify(cities(nearMumbai)));
check("near mumbai leaves out Goa", !cities(nearMumbai).includes("North Goa"));
check("bombay is Mumbai", parse("close to bombay").near === "Mumbai");
check("Lonavala is about two hours from Mumbai", driveHours("Mumbai", "Lonavala") >= 1.5 && driveHours("Mumbai", "Lonavala") <= 2.5, String(driveHours("Mumbai", "Lonavala")));

const pune3 = parse("within 3 hours of pune for 6 people");
check("a number of hours is read", pune3.near === "Pune" && pune3.maxHours === 3, JSON.stringify([pune3.near, pune3.maxHours]));
check("hours are not a budget", pune3.maxPrice === null, String(pune3.maxPrice));
check("three hours from Pune stays close", cities(pune3).every((c) => driveHours("Pune", c) <= 3));
check("a far city still gets its closest towns", townsNear("Bengaluru").includes("Coorg"), JSON.stringify(townsNear("Bengaluru")));
check("an unknown home city is dropped", sanitizeFilters({ near: "Atlantis" }).near === null);

const ghatsNearPune = { ...emptyFilters(), locations: ["Western Ghats"], near: "Pune", maxHours: 3 };
check("a place and a home city both have to hold", cities(ghatsNearPune).every((c) => driveHours("Pune", c) <= 3) && !cities(ghatsNearPune).includes("Coorg"), JSON.stringify(cities(ghatsNearPune)));

const cards = scoreVilla({ ...small, city: "Lonavala" }, nearMumbai, true);
check("the card says how far it is", cards.reasons[0].startsWith("About 2 hours by road from Mumbai"), JSON.stringify(cards.reasons));

const toGoa = mergeFilters(nearMumbai, parse("what about goa instead"));
check("a new place replaces a home city", same(toGoa.locations, ["Goa"]) && toGoa.near === null, JSON.stringify([toGoa.locations, toGoa.near]));
const closer = applyRelative("somewhere closer", mergeFilters(nearMumbai, parse("somewhere closer")));
check("closer shortens the drive", closer.near === "Mumbai" && closer.maxHours === 3, JSON.stringify([closer.near, closer.maxHours]));
const anywhere = mergeFilters(konkan, parse("anywhere is fine"), detectRemovals("anywhere is fine"));
check("anywhere clears the place", anywhere.locations.length === 0 && anywhere.near === null, JSON.stringify(anywhere.locations));

// ---------------------------------------------------------------- insights

check("an unknown word is noticed", same(unknownWords("treehouse villa near lonavala for 6"), ["treehouse"]), JSON.stringify(unknownWords("treehouse villa near lonavala for 6")));
check("a fully understood sentence has no unknown words", unknownWords("Villa for 12 near Lonavala, pet friendly, private pool, under 40k for Saturday").length === 0);
check("place words are known words", unknownWords("mountains in north india, konkan side, near bombay").length === 0, JSON.stringify(unknownWords("mountains in north india, konkan side, near bombay")));
check("a request reads as plain words", describeRequest(one) === "Private pool, Pet friendly, under ₹40,000 in Lonavala, 10 or more", describeRequest(one));

// ----------------------------------------------------------------- report

console.log(`\n${passed} checks passed`);
if (failures.length) {
  console.log(`${failures.length} failed\n`);
  for (const failure of failures) console.log(`  x  ${failure}`);
  console.log("");
  process.exit(1);
}
console.log("Everything the search depends on is behaving.\n");
