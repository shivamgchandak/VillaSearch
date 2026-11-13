import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import searchRoutes from "./routes/search.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { requestLog } from "./middleware/requestLog.js";
import { notFound, errorHandler } from "./middleware/errors.js";

// The app is assembled here and started in index.js, so a test can hold the
// app without opening a port.
export function createApp() {
  const app = express();

  if (config.server.trustProxy) app.set("trust proxy", 1);

  const allowAll = config.server.corsOrigins.includes("*");
  app.use(cors({ origin: allowAll ? true : config.server.corsOrigins }));
  app.use(express.json({ limit: config.server.bodyLimit }));
  app.use(requestLog);

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", rateLimit, searchRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
