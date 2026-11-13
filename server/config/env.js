// One place where every environment variable is read, checked and defaulted.
// Nothing else in the codebase touches process.env, so a missing or malformed
// value is caught at boot with a readable message instead of surfacing deep
// inside a request as an unexplained failure.

import "dotenv/config";

const problems = [];
const warnings = [];

function raw(name) {
  const value = process.env[name];
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function str(name, { fallback = null, required = false, hint = "" } = {}) {
  const value = raw(name) ?? fallback;
  if (required && !value) problems.push(`${name} is not set. ${hint}`.trim());
  return value;
}

function num(name, { fallback, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  const value = raw(name);
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    problems.push(`${name} has to be a number. It is currently "${value}".`);
    return fallback;
  }
  if (parsed < min || parsed > max) {
    problems.push(`${name} has to be between ${min} and ${max}. It is currently ${parsed}.`);
    return fallback;
  }
  return parsed;
}

function bool(name, fallback) {
  const value = raw(name);
  if (value === null) return fallback;
  const lower = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(lower)) return true;
  if (["0", "false", "no", "off"].includes(lower)) return false;
  problems.push(`${name} has to be true or false. It is currently "${value}".`);
  return fallback;
}

function list(name, fallback = []) {
  const value = raw(name);
  if (value === null) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function oneOf(name, allowed, fallback) {
  const value = raw(name);
  if (value === null) return fallback;
  if (!allowed.includes(value)) {
    problems.push(`${name} has to be one of ${allowed.join(", ")}. It is currently "${value}".`);
    return fallback;
  }
  return value;
}

const nodeEnv = oneOf("NODE_ENV", ["development", "test", "production"], "development");

const mongoUri = str("MONGODB_URI");

if (mongoUri && !/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
  problems.push(
    `MONGODB_URI does not look like a connection string. It has to start with mongodb:// or mongodb+srv://. It is currently "${mongoUri}".`
  );
}
if (mongoUri && /<password>|<username>|<db_password>/i.test(mongoUri)) {
  problems.push("MONGODB_URI still contains the Atlas placeholder text. Replace it with the real user name and password.");
}

const groqKey = str("GROQ_API_KEY");
if (groqKey && !groqKey.startsWith("gsk_")) {
  warnings.push("GROQ_API_KEY does not start with gsk_, so the model call may be rejected. The rule parser will take over if it is.");
}

const corsOrigins = list("CORS_ORIGIN", ["*"]);

export const config = {
  env: nodeEnv,
  isProduction: nodeEnv === "production",

  server: {
    port: num("PORT", { fallback: 5000, min: 1, max: 65535 }),
    host: str("HOST", { fallback: "0.0.0.0" }),
    bodyLimit: str("BODY_LIMIT", { fallback: "20kb" }),
    corsOrigins,
    trustProxy: bool("TRUST_PROXY", false),
    shutdownTimeoutMs: num("SHUTDOWN_TIMEOUT_MS", { fallback: 10000, min: 1000, max: 60000 }),
  },

  mongo: {
    uri: mongoUri,
    serverSelectionTimeoutMs: num("MONGODB_SERVER_SELECTION_TIMEOUT_MS", { fallback: 8000, min: 1000, max: 60000 }),
    maxPoolSize: num("MONGODB_MAX_POOL_SIZE", { fallback: 10, min: 1, max: 200 }),
    connectRetries: num("MONGODB_CONNECT_RETRIES", { fallback: 3, min: 0, max: 10 }),
    autoIndex: bool("MONGODB_AUTO_INDEX", nodeEnv !== "production"),
  },

  llm: {
    apiKey: groqKey,
    enabled: Boolean(groqKey) && bool("LLM_ENABLED", true),
    baseUrl: str("GROQ_BASE_URL", { fallback: "https://api.groq.com/openai/v1" }),
    model: str("GROQ_MODEL", { fallback: "llama-3.3-70b-versatile" }),
    fallbackModel: str("GROQ_FALLBACK_MODEL", { fallback: "llama-3.1-8b-instant" }),
    timeoutMs: num("LLM_TIMEOUT_MS", { fallback: 5000, min: 500, max: 30000 }),
    maxOutputTokens: num("LLM_MAX_OUTPUT_TOKENS", { fallback: 500, min: 100, max: 4000 }),
    temperature: num("LLM_TEMPERATURE", { fallback: 0, min: 0, max: 2 }),
  },

  search: {
    pageSize: num("SEARCH_PAGE_SIZE", { fallback: 12, min: 1, max: 60 }),
    maxPageSize: num("SEARCH_MAX_PAGE_SIZE", { fallback: 48, min: 1, max: 100 }),
    candidateLimit: num("SEARCH_CANDIDATE_LIMIT", { fallback: 240, min: 20, max: 1000 }),
    maxQueryLength: num("SEARCH_MAX_QUERY_LENGTH", { fallback: 300, min: 40, max: 2000 }),
    relaxWhenEmpty: bool("SEARCH_RELAX_WHEN_EMPTY", true),
  },

  cache: {
    enabled: bool("PARSE_CACHE_ENABLED", true),
    ttlMs: num("PARSE_CACHE_TTL_MS", { fallback: 600000, min: 1000, max: 86400000 }),
    maxEntries: num("PARSE_CACHE_MAX_ENTRIES", { fallback: 500, min: 10, max: 10000 }),
  },

  rateLimit: {
    enabled: bool("RATE_LIMIT_ENABLED", true),
    windowMs: num("RATE_LIMIT_WINDOW_MS", { fallback: 60000, min: 1000, max: 3600000 }),
    max: num("RATE_LIMIT_MAX", { fallback: 60, min: 1, max: 10000 }),
  },

  logging: {
    requests: bool("LOG_REQUESTS", true),
    slowRequestMs: num("LOG_SLOW_REQUEST_MS", { fallback: 800, min: 50, max: 60000 }),
  },

  seed: {
    bookingHorizonDays: num("SEED_BOOKING_HORIZON_DAYS", { fallback: 60, min: 7, max: 365 }),
    randomSeed: num("SEED_RANDOM_SEED", { fallback: 42, min: 1, max: 100000000 }),
  },
};

function mask(value) {
  if (!value) return "not set";
  if (value.length <= 8) return "set";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function maskUri(uri) {
  if (!uri) return "not set";
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:****@");
}

// Printed once at boot so the running configuration is never a guess.
export function describeConfig() {
  return [
    `environment      ${config.env}`,
    `address          http://localhost:${config.server.port}`,
    `database         ${maskUri(config.mongo.uri)}`,
    `model parsing    ${config.llm.enabled ? `on, ${config.llm.model} then ${config.llm.fallbackModel}` : "off, the rule parser handles every query"}`,
    `model key        ${mask(config.llm.apiKey)}`,
    `parse cache      ${config.cache.enabled ? `on, ${Math.round(config.cache.ttlMs / 1000)} seconds` : "off"}`,
    `rate limit       ${config.rateLimit.enabled ? `${config.rateLimit.max} requests per ${Math.round(config.rateLimit.windowMs / 1000)} seconds` : "off"}`,
    `page size        ${config.search.pageSize}`,
  ].join("\n  ");
}

// Called by every entry point. Stops the process before anything else runs
// when a value is wrong, and names the file that has to be fixed.
export function assertConfig({ database = true } = {}) {
  const found = [...problems];
  if (database && !config.mongo.uri) {
    found.push(
      "MONGODB_URI is not set. Use a local address such as mongodb://127.0.0.1:27017/villa_search, or an Atlas connection string that starts with mongodb+srv://."
    );
  }

  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  if (!found.length) return config;

  console.error("\nThe server cannot start because of the environment file.\n");
  for (const problem of found) console.error(`  ${problem}`);
  console.error("\nCopy server/.env.example to server/.env and fill the values in, then start again.\n");
  process.exit(1);
}

export const configProblems = problems;
