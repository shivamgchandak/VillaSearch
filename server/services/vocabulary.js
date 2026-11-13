// Single source of truth for what the search understands.
// Both the LLM prompt and the rule based parser read from here,
// so adding a new amenity or place only happens in one spot.

export const TERRAINS = {
  mountain: ["mountain", "mountains", "hill", "hills", "hill station", "hilly", "valley", "ghats", "misty"],
  beach: ["beach", "beaches", "sea", "seaside", "sea side", "coast", "coastal", "ocean", "shore"],
  lake: ["lake", "lakes", "lakeside", "lake side", "lakefront"],
  forest: ["forest", "jungle", "woods", "wildlife", "plantation", "coffee estate"],
  river: ["river", "riverside", "river side"],
  vineyard: ["vineyard", "vineyards", "wine", "winery"],
  heritage: ["heritage", "palace", "haveli", "royal", "fort"],
  desert: ["desert", "deserts", "dunes", "sand dunes", "camel safari"],
};

export const AMENITIES = {
  privatePool: { label: "Private pool", words: ["private pool", "pool", "swimming pool", "swimming"] },
  petFriendly: { label: "Pet friendly", words: ["pet friendly", "pet", "pets", "dog", "dogs", "cat", "puppy"] },
  wifi: { label: "Wifi", words: ["wifi", "wi fi", "internet", "workation", "work from villa"] },
  chef: { label: "Chef on call", words: ["chef", "cook", "meals", "food included", "home cooked"] },
  bonfire: { label: "Bonfire", words: ["bonfire", "campfire", "fire pit"] },
  jacuzzi: { label: "Jacuzzi", words: ["jacuzzi", "hot tub", "bathtub"] },
  lawn: { label: "Lawn", words: ["lawn", "garden", "open space"] },
  bbq: { label: "Barbecue", words: ["bbq", "barbecue", "barbeque", "grill"] },
  kidsPlay: { label: "Kids play area", words: ["kids", "kid friendly", "children", "play area"] },
  airConditioning: { label: "Air conditioning", words: ["ac", "air conditioning", "air conditioned"] },
  parking: { label: "Parking", words: ["parking", "car park"] },
};

// Places we have villas in. "region" groups nearby towns, so a search
// for Lonavala also returns Khandala and Pawna. "areas" are the wider
// landscapes a place belongs to, and lat and lng put it on the map so a
// search can be measured in hours from a city. The zone (North India,
// South India and so on) comes from the state, see geography.js.
export const PLACES = [
  // West India
  { city: "Lonavala", region: "Lonavala", state: "Maharashtra", terrains: ["mountain"], areas: ["westernGhats"], lat: 18.75, lng: 73.41 },
  { city: "Khandala", region: "Lonavala", state: "Maharashtra", terrains: ["mountain"], areas: ["westernGhats"], lat: 18.76, lng: 73.38 },
  { city: "Pawna", region: "Lonavala", state: "Maharashtra", terrains: ["lake", "mountain"], areas: ["westernGhats"], lat: 18.67, lng: 73.5 },
  { city: "Karjat", region: "Karjat", state: "Maharashtra", terrains: ["mountain", "river"], areas: ["westernGhats"], lat: 18.91, lng: 73.33 },
  { city: "Mahabaleshwar", region: "Mahabaleshwar", state: "Maharashtra", terrains: ["mountain", "forest"], areas: ["westernGhats"], lat: 17.92, lng: 73.66 },
  { city: "Panchgani", region: "Mahabaleshwar", state: "Maharashtra", terrains: ["mountain"], areas: ["westernGhats"], lat: 17.92, lng: 73.8 },
  { city: "Igatpuri", region: "Igatpuri", state: "Maharashtra", terrains: ["mountain", "lake"], areas: ["westernGhats"], lat: 19.7, lng: 73.56 },
  { city: "Nashik", region: "Nashik", state: "Maharashtra", terrains: ["vineyard"], areas: [], lat: 20.0, lng: 73.79 },
  { city: "Alibaug", region: "Alibaug", state: "Maharashtra", terrains: ["beach"], areas: ["konkan"], lat: 18.64, lng: 72.87 },
  { city: "Kashid", region: "Alibaug", state: "Maharashtra", terrains: ["beach"], areas: ["konkan"], lat: 18.43, lng: 72.9 },
  { city: "Dapoli", region: "Dapoli", state: "Maharashtra", terrains: ["beach"], areas: ["konkan"], lat: 17.76, lng: 73.19 },
  { city: "Ratnagiri", region: "Ratnagiri", state: "Maharashtra", terrains: ["beach"], areas: ["konkan"], lat: 16.99, lng: 73.3 },
  { city: "Tarkarli", region: "Tarkarli", state: "Maharashtra", terrains: ["beach"], areas: ["konkan"], lat: 16.03, lng: 73.47 },
  { city: "North Goa", region: "Goa", state: "Goa", terrains: ["beach"], areas: ["konkan"], lat: 15.59, lng: 73.74 },
  { city: "South Goa", region: "Goa", state: "Goa", terrains: ["beach"], areas: ["konkan"], lat: 15.01, lng: 74.02 },
  { city: "Kutch", region: "Kutch", state: "Gujarat", terrains: ["desert", "heritage"], areas: ["rann"], lat: 23.83, lng: 69.67 },
  // South India
  { city: "Gokarna", region: "Gokarna", state: "Karnataka", terrains: ["beach"], areas: ["konkan"], lat: 14.55, lng: 74.32 },
  { city: "Coorg", region: "Coorg", state: "Karnataka", terrains: ["mountain", "forest"], areas: ["westernGhats"], lat: 12.42, lng: 75.74 },
  { city: "Wayanad", region: "Wayanad", state: "Kerala", terrains: ["forest", "mountain"], areas: ["westernGhats"], lat: 11.61, lng: 76.08 },
  { city: "Munnar", region: "Munnar", state: "Kerala", terrains: ["mountain"], areas: ["westernGhats"], lat: 10.09, lng: 77.06 },
  { city: "Alleppey", region: "Alleppey", state: "Kerala", terrains: ["lake", "river"], areas: ["backwaters"], lat: 9.49, lng: 76.33 },
  { city: "Ooty", region: "Ooty", state: "Tamil Nadu", terrains: ["mountain", "lake"], areas: ["westernGhats"], lat: 11.41, lng: 76.7 },
  { city: "Kodaikanal", region: "Kodaikanal", state: "Tamil Nadu", terrains: ["mountain", "lake"], areas: ["westernGhats"], lat: 10.24, lng: 77.49 },
  { city: "Pondicherry", region: "Pondicherry", state: "Puducherry", terrains: ["beach", "heritage"], areas: [], lat: 11.94, lng: 79.81 },
  // North India
  { city: "Udaipur", region: "Udaipur", state: "Rajasthan", terrains: ["lake", "heritage"], areas: [], lat: 24.59, lng: 73.71 },
  { city: "Jaipur", region: "Jaipur", state: "Rajasthan", terrains: ["heritage"], areas: [], lat: 26.91, lng: 75.79 },
  { city: "Jaisalmer", region: "Jaisalmer", state: "Rajasthan", terrains: ["desert", "heritage"], areas: ["thar"], lat: 26.91, lng: 70.92 },
  { city: "Kasauli", region: "Kasauli", state: "Himachal Pradesh", terrains: ["mountain"], areas: ["himalayas"], lat: 30.9, lng: 76.96 },
  { city: "Shimla", region: "Shimla", state: "Himachal Pradesh", terrains: ["mountain", "forest"], areas: ["himalayas"], lat: 31.1, lng: 77.17 },
  { city: "Manali", region: "Manali", state: "Himachal Pradesh", terrains: ["mountain", "river"], areas: ["himalayas"], lat: 32.24, lng: 77.19 },
  { city: "Mussoorie", region: "Mussoorie", state: "Uttarakhand", terrains: ["mountain"], areas: ["himalayas"], lat: 30.46, lng: 78.07 },
  { city: "Nainital", region: "Nainital", state: "Uttarakhand", terrains: ["lake", "mountain"], areas: ["himalayas"], lat: 29.38, lng: 79.46 },
  { city: "Rishikesh", region: "Rishikesh", state: "Uttarakhand", terrains: ["river", "mountain"], areas: ["himalayas"], lat: 30.09, lng: 78.27 },
  // East and North East India
  { city: "Darjeeling", region: "Darjeeling", state: "West Bengal", terrains: ["mountain", "forest"], areas: ["himalayas"], lat: 27.04, lng: 88.26 },
  { city: "Gangtok", region: "Gangtok", state: "Sikkim", terrains: ["mountain"], areas: ["himalayas"], lat: 27.33, lng: 88.61 },
  { city: "Shillong", region: "Shillong", state: "Meghalaya", terrains: ["mountain", "forest", "lake"], areas: [], lat: 25.58, lng: 91.89 },
  { city: "Kaziranga", region: "Kaziranga", state: "Assam", terrains: ["forest"], areas: [], lat: 26.58, lng: 93.17 },
];

// Extra ways people refer to a place
export const PLACE_ALIASES = {
  goa: "Goa",
  "north goa": "North Goa",
  "south goa": "South Goa",
  lonavla: "Lonavala",
  alibag: "Alibaug",
  mahabaleshwar: "Mahabaleshwar",
  pondy: "Pondicherry",
  puducherry: "Pondicherry",
  kodagu: "Coorg",
  madikeri: "Coorg",
  alappuzha: "Alleppey",
  kumarakom: "Alleppey",
  kodai: "Kodaikanal",
  udhagamandalam: "Ooty",
  malvan: "Tarkarli",
  bhuj: "Kutch",
  kachchh: "Kutch",
  himachal: "Himachal Pradesh",
};

// States can also be searched ("villa in Kerala")
export const STATES = [...new Set(PLACES.map((p) => p.state))];

// "relevance" is the default. It blends how well a villa answers the request
// with how well it is reviewed, see services/scoring.js.
export const SORT_OPTIONS = ["relevance", "popularity", "priceLow", "priceHigh", "rating"];

export const WHEN_OPTIONS = [
  "today",
  "tonight",
  "tomorrow",
  "this_weekend",
  "next_weekend",
  "day_of_week",
  "specific",
];
