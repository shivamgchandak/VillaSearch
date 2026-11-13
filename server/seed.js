import mongoose from "mongoose";
import { assertConfig, config } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./db/connect.js";
import Villa from "./models/Villa.js";
import { buildVillas } from "./data/buildVillas.js";

assertConfig();

async function seed() {
  await connectDatabase();

  const villas = buildVillas();
  await Villa.deleteMany({});
  await Villa.insertMany(villas);
  await Villa.syncIndexes();

  const bookedNights = villas.reduce((sum, villa) => sum + villa.bookedDates.length, 0);
  const cities = new Set(villas.map((villa) => villa.city));

  console.log(`\nSeeded ${villas.length} villas across ${cities.size} places`);
  console.log(`  ${bookedNights} booked nights over the next ${config.seed.bookingHorizonDays} days`);
  console.log(`  database ${mongoose.connection.name} on ${mongoose.connection.host}\n`);

  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error(error.message);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
