import mongoose from "mongoose";
import { config } from "../config/env.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function explain(message) {
  if (/ENOTFOUND|EAI_AGAIN/.test(message)) {
    return "The cluster address could not be resolved. Check the host name in MONGODB_URI and your internet connection.";
  }
  if (/ECONNREFUSED/.test(message)) {
    return "Nothing is listening on that address. Start MongoDB locally, or point MONGODB_URI at your Atlas cluster.";
  }
  if (/Authentication failed|bad auth/i.test(message)) {
    return "The user name or password in MONGODB_URI was rejected. On Atlas the database user is separate from your account login.";
  }
  if (/IP|whitelist|not allowed/i.test(message)) {
    return "Atlas is refusing this address. Add your current address under Network Access in the Atlas console.";
  }
  return "Check MONGODB_URI in server/.env.";
}

// Connects with a few retries, because an Atlas cluster that has gone to
// sleep often refuses the first attempt and accepts the second.
let closing = false;

export async function connectDatabase() {
  closing = false;
  const { uri, serverSelectionTimeoutMs, maxPoolSize, connectRetries, autoIndex } = config.mongo;
  let lastError = null;

  for (let attempt = 0; attempt <= connectRetries; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: serverSelectionTimeoutMs,
        maxPoolSize,
        autoIndex,
      });
      mongoose.connection.on("disconnected", () => {
        // A deliberate close is not a fault, so only an unexpected drop is reported.
        if (!closing) console.warn("Database connection dropped, the driver will try to restore it.");
      });
      mongoose.connection.on("reconnected", () => console.log("Database connection restored."));
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      if (attempt < connectRetries) {
        const pause = 1000 * (attempt + 1);
        console.warn(`Database attempt ${attempt + 1} failed, trying again in ${pause / 1000} seconds.`);
        await wait(pause);
      }
    }
  }

  console.error(`\nCould not reach the database: ${lastError.message}`);
  console.error(`  ${explain(lastError.message)}\n`);
  throw lastError;
}

export async function disconnectDatabase() {
  closing = true;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

export function databaseReady() {
  return mongoose.connection.readyState === 1;
}
