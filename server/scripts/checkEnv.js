// Reads server/.env, reports every value the server will actually use and
// stops with a readable message when one of them is wrong.
//   npm run check-env
import { assertConfig, describeConfig, config } from "../config/env.js";

assertConfig();

console.log(`\nThe environment file is valid.\n  ${describeConfig()}\n`);

if (!config.llm.enabled) {
  console.log("  Note: no model key, so every query goes to the rule parser.");
  console.log("  Add GROQ_API_KEY to server/.env to switch model parsing on.\n");
}
