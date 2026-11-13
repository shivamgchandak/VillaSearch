import mongoose from "mongoose";

const villaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    city: { type: String, required: true, index: true },
    region: { type: String, required: true, index: true },
    state: { type: String, required: true },
    zone: { type: String },
    areas: { type: [String], default: [] },
    terrains: { type: [String], index: true },
    amenities: { type: [String], index: true },
    bedrooms: { type: Number, required: true },
    maxGuests: { type: Number, required: true, index: true },
    pricePerNight: { type: Number, required: true, index: true },
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 0 },
    popularity: { type: Number, default: 0, index: true },
    description: String,
    // Nights that are already taken, stored as YYYY-MM-DD strings
    bookedDates: { type: [String], default: [] },
  },
  { timestamps: true }
);

// The searches this app actually runs, in the order the query builder uses
// them. Group size and price come first because they are on almost every
// request, and the availability check reads bookedDates on every one of them.
villaSchema.index({ maxGuests: 1, pricePerNight: 1 });
villaSchema.index({ region: 1, maxGuests: 1 });
villaSchema.index({ terrains: 1, maxGuests: 1 });
villaSchema.index({ popularity: -1, rating: -1 });
villaSchema.index({ bookedDates: 1 });

export default mongoose.model("Villa", villaSchema);
