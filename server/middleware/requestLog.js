import { config } from "../config/env.js";

// One readable line per request, with the duration, so a slow model call is
// visible in the terminal during a demo without opening any tooling.
export function requestLog(req, res, next) {
  if (!config.logging.requests) return next();

  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const slow = ms >= config.logging.slowRequestMs ? "  slow" : "";
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms${slow}`);
  });
  next();
}
