import { config } from "../config/env.js";

// A small fixed window counter kept in memory. Plenty for a prototype and it
// keeps the dependency list short. A deployment behind more than one process
// would move this into Redis, which is the only change needed.
const hits = new Map();

function visitorKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (config.server.trustProxy && typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
}, 60000);
sweeper.unref?.();

export function rateLimit(req, res, next) {
  if (!config.rateLimit.enabled) return next();

  const { windowMs, max } = config.rateLimit;
  const now = Date.now();
  const key = visitorKey(req);
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    res.setHeader("X-RateLimit-Remaining", String(max - 1));
    return next();
  }

  entry.count += 1;
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));

  if (entry.count > max) {
    const seconds = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(seconds));
    return res.status(429).json({ error: `Too many searches. Try again in ${seconds} seconds.` });
  }

  return next();
}

export function resetRateLimit() {
  hits.clear();
}
