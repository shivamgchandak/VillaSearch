// Try the parsers without a database or a browser.
//   npm run try                            runs the sample set through the rules
//   npm run try "villa for 6 near hills"   runs one query
//   npm run try --ai "villa for 6"         uses the model when a key is present
import { assertConfig, config } from "../config/env.js";
import { ruleParse } from "../services/ruleParser.js";
import { parseQuery } from "../services/parseQuery.js";
import { sanitizeFilters } from "../services/filters.js";
import { resolveStay } from "../services/dates.js";

// The parsers never touch the database, so this script does not need one.
assertConfig({ database: false });

const args = process.argv.slice(2);
const useModel = args.includes("--ai");
const words = args.filter((arg) => arg !== "--ai");

const SAMPLES = [
  "villa for 10 next coming weekend near mountains",
  "villa for 4 near beach",
  "Villa for 12 near Lonavala, pet friendly, private pool, under 40k for Saturday",
  "cheap stay in goa for a couple with jacuzzi on 25th dec for 2 nights",
  "group of 8 friends, hills, bonfire, budget 20000, next weekend",
  "about 10 people within 2 nights in Kerala",
  "villas near mountains in north india for 8",
  "something in the north east for a family of 6",
  "mountain villa in south india with a bonfire",
  "beach house on the kokan side under 20k",
  "villa near the desert for 10 this weekend",
  "weekend getaway within 3 hours of pune",
];

const queries = words.length ? [words.join(" ")] : SAMPLES;

const compact = (filters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== null && !(Array.isArray(value) && !value.length)));

for (const query of queries) {
  const result = useModel && config.llm.enabled ? await parseQuery(query) : { filters: sanitizeFilters(ruleParse(query)), source: "rules" };
  const stay = resolveStay(result.filters);
  console.log(`\n> ${query}`);
  console.log(`  understood by ${result.source}${result.model ? ` (${result.model})` : ""}`);
  console.log(" ", compact(result.filters));
  console.log(` ${stay ? ` stay ${stay.checkIn} to ${stay.checkOut}, ${stay.nights} nights` : " no dates asked for"}`);
}
console.log("");
