import { llmParse } from "./llmParser.js";
import { ruleParse } from "./ruleParser.js";
import { sanitizeFilters, mergeFilters, DEFAULT_SORT } from "./filters.js";
import { isRefinement, detectRemovals, applyRelative } from "./refine.js";
import { cacheGet, cacheSet } from "./cache.js";

/**
 * The model understands the sentence. It never runs the search and it never
 * does calendar arithmetic. Whatever it returns goes through the same
 * sanitiser as the rule parser, so by the time the search layer sees a filter
 * set it cannot tell which one produced it, and neither can be trusted to
 * have invented a field.
 */
export async function parseQuery(query, { previousFilters = null } = {}) {
  const cacheKey = `${query.toLowerCase()}|${previousFilters ? JSON.stringify(previousFilters) : ""}`;
  const cached = cacheGet(cacheKey);
  if (cached) return { ...cached, cached: true };

  const fresh = sanitizeFilters(ruleParse(query));
  const refining = Boolean(previousFilters) && isRefinement(query, fresh);
  const context = refining ? previousFilters : null;

  const model = await llmParse(query, { previousFilters: context });

  let result;
  if (model) {
    const parsed = sanitizeFilters(model.raw);
    result = {
      filters: refining ? mergeFilters(previousFilters, parsed, detectRemovals(query)) : parsed,
      source: "ai",
      model: model.model,
      ms: model.ms,
      refined: refining,
    };
  } else {
    result = {
      filters: refining ? mergeFilters(previousFilters, fresh, detectRemovals(query)) : fresh,
      source: "rules",
      model: null,
      ms: 0,
      refined: refining,
    };
  }

  // Relative words carry no number, so they are read against the merged set.
  if (refining) result.filters = sanitizeFilters(applyRelative(query, result.filters));
  if (!result.filters.sortBy) result.filters.sortBy = DEFAULT_SORT;

  return cacheSet(cacheKey, result);
}
