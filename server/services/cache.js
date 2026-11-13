import { config } from "../config/env.js";

// Identical searches are common during a demo and on a results page where the
// guest removes a chip and puts it back. Caching the parse means the model is
// asked once. Entries expire and the oldest is dropped when the map is full.
const store = new Map();

export function cacheGet(key) {
  if (!config.cache.enabled) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  // Touch the entry so the least recently used one is the first to go.
  store.delete(key);
  store.set(key, entry);
  return entry.value;
}

export function cacheSet(key, value) {
  if (!config.cache.enabled) return value;
  if (store.size >= config.cache.maxEntries) {
    const oldest = store.keys().next().value;
    store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + config.cache.ttlMs });
  return value;
}

export function cacheStats() {
  return { enabled: config.cache.enabled, entries: store.size, maxEntries: config.cache.maxEntries };
}

export function cacheClear() {
  store.clear();
}
