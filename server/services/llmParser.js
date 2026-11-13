import { TERRAINS, AMENITIES, SORT_OPTIONS, WHEN_OPTIONS } from "./vocabulary.js";
import { placeGuideForPrompt } from "./geography.js";
import { todayIST, weekday } from "./dates.js";
import { config } from "../config/env.js";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function systemPrompt(previousFilters) {
  const today = todayIST();
  const guide = placeGuideForPrompt();

  const history = previousFilters
    ? `

PREVIOUS SEARCH: ${JSON.stringify(previousFilters)}
The guest is adjusting that search. Return the complete updated set of filters,
carrying over everything they did not change. If they ask to drop something,
leave that field empty or null.`
    : "";

  return `You turn a guest's villa search into JSON filters for an Indian luxury villa rental site.
Today is ${today}, a ${DAY_NAMES[weekday(today)]}.

Return ONLY a JSON object with exactly these keys:
{
  "guests": number or null,
  "bedrooms": number or null,
  "locations": string[]   (only names that appear in the PLACE GUIDE: a town, a region, a state, a zone or an area),
  "near": string or null  (one of the HOME CITIES when the guest wants somewhere close to that city),
  "maxHours": number or null (hours of travel from the home city, only when the guest gives a number),
  "terrains": string[]    (subset of ${JSON.stringify(Object.keys(TERRAINS))}),
  "amenities": string[]   (subset of ${JSON.stringify(Object.keys(AMENITIES))}),
  "minPrice": number or null (rupees per night),
  "maxPrice": number or null (rupees per night, "40k" means 40000),
  "when": one of ${JSON.stringify(WHEN_OPTIONS)} or null,
  "dayOfWeek": lowercase weekday name when "when" is "day_of_week", else null,
  "checkIn": "YYYY-MM-DD" only when "when" is "specific", else null,
  "checkOut": "YYYY-MM-DD" or null,
  "nights": number or null,
  "sortBy": one of ${JSON.stringify(SORT_OPTIONS)}
}

Rules:
- Do not calculate dates for relative phrases. "This Saturday" is {"when":"day_of_week","dayOfWeek":"saturday"}. "Next coming weekend" or "this weekend" is "this_weekend". "Next weekend" is "next_weekend".
- Where the guest wants to go goes in "locations". Use your own knowledge of Indian geography to connect whatever words the guest uses (a direction, a region, a landscape, a nickname, a nearby landmark) to names in the PLACE GUIDE, and return the broadest name that still means what the guest meant. Return only names that appear in the guide, spelled as written there.
- The kind of landscape goes in "terrains". A landscape on its own, with no region, is only a terrain and leaves locations empty. A region plus a landscape fills both.
- A guest who wants to stay close to a big city they did not name as the destination fills "near", not "locations".
- If the guest names somewhere that has no match in the guide, leave locations empty rather than guess.
- A couple means 2 guests. "Villa for 12" means 12 guests.
- sortBy defaults to "relevance". Use "priceLow" for cheap or budget, "priceHigh" for luxury or premium, "rating" for best rated, "popularity" for most popular.

PLACE GUIDE
Zones and the states in them:
${guide.zones}

Areas that cross state lines, and our towns in them:
${guide.areas}

Our towns (region, state, zone; landscape):
${guide.towns}

HOME CITIES: ${guide.origins}${history}`;
}

async function callModel(model, query, previousFilters, signal) {
  const response = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: config.llm.temperature,
      max_tokens: config.llm.maxOutputTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(previousFilters) },
        { role: "user", content: query },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${model} answered ${response.status} ${body.slice(0, 160)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${model} returned an empty answer`);
  return JSON.parse(content);
}

/**
 * Tries the main model, then the lighter one. Returns null when both fail so
 * the caller can fall back to the rule parser. A search never fails because
 * the model did.
 */
export async function llmParse(query, { previousFilters = null } = {}) {
  if (!config.llm.enabled) return null;

  const models = [config.llm.model, config.llm.fallbackModel].filter(Boolean);

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.llm.timeoutMs);
    const startedAt = Date.now();
    try {
      const raw = await callModel(model, query, previousFilters, controller.signal);
      return { raw, model, ms: Date.now() - startedAt };
    } catch (error) {
      const reason = error.name === "AbortError" ? `timed out after ${config.llm.timeoutMs}ms` : error.message;
      console.warn(`Model parse failed, ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}
