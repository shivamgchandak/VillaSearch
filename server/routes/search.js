import { Router } from "express";
import { parseQuery } from "../services/parseQuery.js";
import { sanitizeFilters, emptyFilters } from "../services/filters.js";
import { searchVillas, countVillas } from "../services/search.js";
import { ruleParse } from "../services/ruleParser.js";
import { resolveStay } from "../services/dates.js";
import { TERRAINS, AMENITIES, PLACES, SORT_OPTIONS } from "../services/vocabulary.js";
import { ZONES, AREAS, ORIGINS, zoneOfState } from "../services/geography.js";
import { cacheStats } from "../services/cache.js";
import { logSearch, buildInsights } from "../services/insights.js";
import { databaseReady } from "../db/connect.js";
import { badRequest } from "../middleware/errors.js";
import { config } from "../config/env.js";

const router = Router();

function readPaging(body) {
  const page = Number(body.page ?? 1);
  const pageSize = Number(body.pageSize ?? config.search.pageSize);
  if (!Number.isInteger(page) || page < 1 || page > 500) throw badRequest("The page number is not valid.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > config.search.maxPageSize) {
    throw badRequest(`Page size has to be between 1 and ${config.search.maxPageSize}.`);
  }
  return { page, pageSize };
}

/**
 * POST /api/search
 *   { query: "villa for 10 this weekend near mountains" }   understand, then search
 *   { query: "mountain villa in north india" }              zones and areas become their towns
 *   { query, previousFilters }                              a follow up on the last search
 *   { filters }                                             search with edited chips, no parsing
 *   { page, pageSize, sortBy }                              work with any of the above
 */
router.post("/search", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { query, filters: incoming, previousFilters, sortBy } = body;
    const { page, pageSize } = readPaging(body);

    if (incoming !== undefined && (typeof incoming !== "object" || incoming === null || Array.isArray(incoming))) {
      throw badRequest("Filters have to be sent as an object.");
    }
    if (query !== undefined && query !== null && typeof query !== "string") {
      throw badRequest("The search text has to be a string.");
    }
    if (typeof query === "string" && query.length > config.search.maxQueryLength) {
      throw badRequest(`Keep the search under ${config.search.maxQueryLength} characters.`);
    }

    let parsed;
    if (incoming) {
      parsed = { filters: sanitizeFilters(incoming), source: "edited", model: null, ms: 0, refined: false };
    } else if (typeof query === "string" && query.trim()) {
      const context = previousFilters && typeof previousFilters === "object" ? sanitizeFilters(previousFilters) : null;
      parsed = await parseQuery(query.trim(), { previousFilters: context });
    } else {
      parsed = { filters: emptyFilters(), source: "browse", model: null, ms: 0, refined: false };
    }

    if (sortBy) parsed = { ...parsed, filters: sanitizeFilters({ ...parsed.filters, sortBy }) };

    const found = await searchVillas(parsed.filters, { page, pageSize });

    // Only fresh sentences are logged, not paging, sorting or pill edits
    if (typeof query === "string" && query.trim() && page === 1 && !sortBy) {
      logSearch({
        query: query.trim(),
        filters: parsed.filters,
        total: found.total,
        strictTotal: found.relaxed ? 0 : found.total,
        source: parsed.source,
        refined: Boolean(parsed.refined),
      });
    }

    res.json({
      query: typeof query === "string" ? query : null,
      filters: parsed.filters,
      source: parsed.source,
      model: parsed.model,
      parseMs: parsed.ms ?? 0,
      refined: Boolean(parsed.refined),
      cached: Boolean(parsed.cached),
      ...found,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/preview { query } or { filters }
 * The live read out under the search bar while the guest is still typing, or
 * the count for fields the guest filled in by hand.
 * It uses the keyword parser only, so it answers in a few milliseconds and
 * never spends a model call on half a sentence. The full search, with the
 * model, runs when the guest presses Search.
 */
router.post("/preview", async (req, res, next) => {
  try {
    const { query, filters: incoming } = req.body || {};
    let filters;
    if (incoming && typeof incoming === "object" && !Array.isArray(incoming)) {
      filters = sanitizeFilters(incoming);
    } else if (typeof query === "string") {
      if (query.length > config.search.maxQueryLength) {
        throw badRequest(`Keep the search under ${config.search.maxQueryLength} characters.`);
      }
      filters = sanitizeFilters(ruleParse(query));
    } else {
      throw badRequest("Send the search text, or filters.");
    }

    const stay = resolveStay(filters);
    const total = databaseReady() ? await countVillas(filters) : null;

    res.json({
      filters,
      stay: stay && { checkIn: stay.checkIn, checkOut: stay.checkOut, nights: stay.nights },
      total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/insights?days=7   what guests asked for, for the villa team
router.get("/insights", async (req, res, next) => {
  try {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
    res.json(await buildInsights(days));
  } catch (error) {
    next(error);
  }
});

// Everything the browser needs to draw chips and the sort control.
router.get("/meta", (_req, res) => {
  res.json({
    terrains: Object.keys(TERRAINS),
    amenities: Object.fromEntries(Object.entries(AMENITIES).map(([key, value]) => [key, value.label])),
    places: PLACES.map(({ city, region, state, areas }) => ({
      city,
      region,
      state,
      zone: zoneOfState(state),
      areas: areas.map((id) => AREAS[id].label),
    })),
    zones: Object.keys(ZONES),
    areas: Object.values(AREAS).map((area) => area.label),
    origins: Object.keys(ORIGINS),
    sortOptions: SORT_OPTIONS,
    aiEnabled: config.llm.enabled,
    pageSize: config.search.pageSize,
  });
});

router.get("/health", (_req, res) => {
  const ready = databaseReady();
  res.status(ready ? 200 : 503).json({
    ok: ready,
    database: ready ? "connected" : "not connected",
    parsing: config.llm.enabled ? "model with rule fallback" : "rules only",
    cache: cacheStats(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

export default router;
