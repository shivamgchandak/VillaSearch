import mongoose from "mongoose";

// One row per sentence typed into search. This is what the team view reads:
// what guests ask for, how often nothing fits, and which words the search
// could not place. No personal details are stored, only the search itself.
const searchLogSchema = new mongoose.Schema(
  {
    query: { type: String, required: true },
    filters: { type: Object, default: {} },
    total: { type: Number, default: 0 },
    strictTotal: { type: Number, default: 0 },
    source: String,
    refined: Boolean,
    unknownWords: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

searchLogSchema.index({ createdAt: -1 });

export default mongoose.model("SearchLog", searchLogSchema);
