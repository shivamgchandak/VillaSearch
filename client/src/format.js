export const rupees = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;

// "Saturday 26 September", never shortened
export function shortDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  const weekday = date.toLocaleDateString("en-IN", { weekday: "long" });
  const month = date.toLocaleDateString("en-IN", { month: "long" });
  return `${weekday} ${date.getDate()} ${month}`;
}

// "26 September", for sentences
export function dayMonth(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getDate()} ${date.toLocaleDateString("en-IN", { month: "long" })}`;
}

export const weekdayName = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long" });

export function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export const nights = (count) => `${count} ${count === 1 ? "night" : "nights"}`;
export const villaCount = (count) => `${count} ${count === 1 ? "villa" : "villas"}`;

// Groups split the bill, so the price each person pays is the number they compare
export const perPerson = (price, guests) => (guests ? `${rupees(Math.round(price / guests))} each for ${guests} guests` : null);

export const TERRAIN_LABELS = {
  mountain: "Near mountains",
  beach: "Near the beach",
  lake: "By a lake",
  forest: "Forest",
  river: "By a river",
  vineyard: "Vineyards",
  heritage: "Heritage",
  desert: "Desert",
};

// How a landscape reads inside a sentence, "villa in the mountains"
export const TERRAIN_PHRASES = {
  mountain: "in the mountains",
  beach: "by the beach",
  lake: "by a lake",
  forest: "in the forest",
  river: "by a river",
  vineyard: "among the vineyards",
  heritage: "in a heritage home",
  desert: "in the desert",
};

export const SORT_LABELS = {
  relevance: "Best match",
  priceLow: "Price, low to high",
  priceHigh: "Price, high to low",
  rating: "Best rated",
  popularity: "Most popular",
};

// "Lonavala", "Goa and Alibaug", "Goa, Alibaug and Kashid"
export function joinList(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
