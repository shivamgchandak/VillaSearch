// Dummy catalogue used by seed.js.
// Format: [name, city, bedrooms, maxGuests, pricePerNight, rating, reviewCount, amenity codes]
// Amenity codes: P pool, D pet friendly, W wifi, C chef, B bonfire, J jacuzzi,
// L lawn, Q barbecue, K kids play area, A air conditioning, R parking

export const AMENITY_CODES = {
  P: "privatePool",
  D: "petFriendly",
  W: "wifi",
  C: "chef",
  B: "bonfire",
  J: "jacuzzi",
  L: "lawn",
  Q: "bbq",
  K: "kidsPlay",
  A: "airConditioning",
  R: "parking",
};

export const VILLA_ROWS = [
  // Lonavala region
  ["Cloudline Estate", "Lonavala", 6, 14, 38000, 4.8, 412, "PDWCBLQKAR"],
  ["Monsoon Ridge", "Lonavala", 5, 12, 34000, 4.7, 356, "PDWBLQAR"],
  ["Fernhill House", "Lonavala", 4, 10, 26000, 4.6, 288, "PWCBLAR"],
  ["The Tiger Point Retreat", "Lonavala", 7, 18, 52000, 4.9, 198, "PDWCBJLQKAR"],
  ["Rainwood Cottage", "Lonavala", 2, 5, 11000, 4.4, 164, "DWBLAR"],
  ["Sahyadri Stone Villa", "Khandala", 5, 12, 29500, 4.6, 241, "PDWCLQAR"],
  ["Duke's Nose View", "Khandala", 3, 8, 18500, 4.5, 190, "PWBLAR"],
  ["Pawna Lakeside Manor", "Pawna", 6, 15, 36000, 4.8, 305, "PDWCBLQKR"],
  ["Firefly Lake Hut", "Pawna", 2, 4, 9500, 4.3, 122, "DBLQR"],
  // Karjat
  ["Ulhas Riverbank Villa", "Karjat", 5, 12, 24000, 4.6, 233, "PDWCBLQKAR"],
  ["Karjat Farm Stay", "Karjat", 3, 8, 14500, 4.4, 147, "PDBLQKR"],
  // Mahabaleshwar and Panchgani
  ["Strawberry Fields Bungalow", "Mahabaleshwar", 4, 10, 22000, 4.7, 276, "WCBLKAR"],
  ["Arthur's Seat Lodge", "Mahabaleshwar", 3, 7, 16000, 4.5, 143, "DWBLR"],
  ["Tableland Terrace", "Panchgani", 5, 12, 27000, 4.6, 208, "PWCBLQAR"],
  // Igatpuri and Nashik
  ["Vaitarna Mist Villa", "Igatpuri", 4, 10, 21000, 4.5, 176, "PDWBLQR"],
  ["Sula Vine House", "Nashik", 4, 9, 19500, 4.6, 162, "PWCLQAR"],
  // Alibaug and Kashid
  ["Mandwa Sea Breeze", "Alibaug", 4, 8, 28000, 4.8, 390, "PDWCLQKAR"],
  ["Coconut Grove Villa", "Alibaug", 3, 6, 17500, 4.6, 268, "PDWLQAR"],
  ["Kihim Beach House", "Alibaug", 5, 12, 33000, 4.7, 244, "PWCBLQKAR"],
  ["Nagaon Sands Cottage", "Alibaug", 2, 4, 9000, 4.3, 131, "DWLAR"],
  ["Kashid Cove Villa", "Kashid", 3, 6, 15500, 4.5, 152, "PWLQAR"],
  // Goa
  ["Assagao Portuguese Villa", "North Goa", 4, 8, 32000, 4.9, 452, "PDWCLQAR"],
  ["Anjuna Cliff House", "North Goa", 3, 6, 24000, 4.7, 318, "PWJLAR"],
  ["Siolim Riverside Estate", "North Goa", 6, 14, 48000, 4.8, 267, "PDWCLQKAR"],
  ["Palolem Palm House", "South Goa", 3, 6, 19000, 4.6, 221, "PDWLAR"],
  ["Benaulim Garden Villa", "South Goa", 2, 4, 12500, 4.4, 118, "PWLAR"],
  ["Cavelossim Grand", "South Goa", 5, 12, 41000, 4.7, 186, "PWCLQKAR"],
  // Gokarna and Pondicherry
  ["Om Beach Hideaway", "Gokarna", 2, 4, 10500, 4.5, 99, "DWBLR"],
  ["White Town Heritage Villa", "Pondicherry", 3, 6, 16500, 4.6, 173, "PWCAR"],
  // Coorg, Wayanad, Munnar, Ooty
  ["Coffee Estate Bungalow", "Coorg", 4, 10, 23000, 4.8, 284, "DWCBLKR"],
  ["Madikeri Misty Villa", "Coorg", 3, 6, 14000, 4.5, 137, "WBLR"],
  ["Wayanad Canopy House", "Wayanad", 3, 7, 15500, 4.6, 159, "PDWCBLR"],
  ["Munnar Tea Valley Villa", "Munnar", 4, 9, 18500, 4.7, 201, "WCBLKR"],
  ["Nilgiri Pine Cottage", "Ooty", 3, 6, 13500, 4.5, 145, "DWBLR"],
  // Rajasthan
  ["Pichola Lake Haveli", "Udaipur", 5, 12, 39000, 4.9, 233, "PWCJLAR"],
  ["Amer Heritage Villa", "Jaipur", 6, 14, 35000, 4.7, 197, "PWCLQKAR"],
  // Himalayas
  ["Kasauli Pine View", "Kasauli", 3, 7, 16500, 4.6, 168, "DWBLR"],
  ["Shimla Deodar House", "Shimla", 4, 10, 21500, 4.6, 184, "WCBLKR"],
  ["Old Manali Apple Orchard", "Manali", 4, 9, 18000, 4.8, 293, "DWCBLQR"],
  ["Beas River Chalet", "Manali", 2, 4, 9800, 4.5, 156, "DWBR"],
  ["Landour Cottage", "Mussoorie", 3, 6, 15000, 4.7, 178, "DWBLR"],
  ["Naini Lake View Villa", "Nainital", 4, 8, 17500, 4.5, 139, "WCBLR"],
  ["Ganga Ghat Retreat", "Rishikesh", 4, 10, 16000, 4.6, 166, "PDWCBLR"],
  // Konkan coast
  ["Harnai Shore House", "Dapoli", 4, 10, 16500, 4.6, 174, "PDWCBLQR"],
  ["Ladghar Beach Cottage", "Dapoli", 2, 5, 8500, 4.4, 96, "DWLR"],
  ["Ganpatipule Bay Villa", "Ratnagiri", 4, 9, 17000, 4.6, 158, "PWCLQAR"],
  ["Alphonso Orchard Home", "Ratnagiri", 5, 12, 21000, 4.7, 187, "PDWCBLQKR"],
  ["Tarkarli Reef House", "Tarkarli", 3, 8, 14500, 4.7, 212, "PWCLQAR"],
  ["Devbag Sangam Villa", "Tarkarli", 4, 10, 19500, 4.5, 121, "PDWBLQR"],
  // Deserts
  ["Sam Dunes Camp Villa", "Jaisalmer", 4, 10, 24000, 4.7, 205, "PWCBLQAR"],
  ["Golden Fort Haveli", "Jaisalmer", 6, 14, 32000, 4.8, 176, "PWCJLQKAR"],
  ["White Rann Bhunga", "Kutch", 3, 8, 13500, 4.5, 118, "DWCBLR"],
  ["Bhuj Courtyard House", "Kutch", 4, 10, 16000, 4.4, 92, "PWCLQAR"],
  // East and North East
  ["Tea Terrace Bungalow", "Darjeeling", 4, 10, 18500, 4.8, 221, "DWCBLR"],
  ["Rumtek Valley House", "Gangtok", 4, 10, 17500, 4.7, 149, "WCBLKR"],
  ["Pine Hills Shillong", "Shillong", 4, 9, 15500, 4.7, 168, "DWCBLR"],
  ["Umiam Lakeside Cottage", "Shillong", 3, 6, 12000, 4.6, 131, "DWBLR"],
  ["Kaziranga Grassland Lodge", "Kaziranga", 5, 12, 19000, 4.6, 112, "PDWCBLQKR"],
  // South India hills and backwaters
  ["Kodai Lake Cottage", "Kodaikanal", 3, 7, 13000, 4.6, 154, "DWBLR"],
  ["Palani Hills Estate", "Kodaikanal", 5, 12, 22000, 4.7, 138, "PDWCBLQKR"],
  ["Vembanad Backwater Villa", "Alleppey", 4, 8, 20500, 4.8, 243, "PWCLQAR"],
];
