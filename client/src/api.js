// The one place the browser talks to the server. The address comes from
// VITE_API_BASE_URL so the same build works against a local API and a
// deployed one without a code change.
const BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, options);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(`Could not reach the API at ${BASE}. Check that the server is running.`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `The API answered ${response.status}.`);
  return data;
}

const post = (path, body, signal) =>
  request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

// A plain sentence. The server decides whether to hand it to the model, and
// whether it is a follow up on the previous search or a new trip.
export const searchByText = (query, { previousFilters = null, page = 1, pageSize, sortBy } = {}) =>
  post("/search", { query, previousFilters, page, ...(pageSize ? { pageSize } : {}), ...(sortBy ? { sortBy } : {}) });

// Filters set by hand, in the fields or on a pill. Parsing is skipped.
export const searchByFilters = (filters, { page = 1, pageSize, sortBy } = {}) =>
  post("/search", { filters, page, ...(pageSize ? { pageSize } : {}), ...(sortBy ? { sortBy } : {}) });

// What the search understands so far, and how many villas that finds. Cheap
// enough to call while the guest types. Pass a signal so a newer keystroke
// can cancel an older request.
export const previewQuery = (query, signal) => post("/preview", { query }, signal);
export const previewFilters = (filters, signal) => post("/preview", { filters }, signal);

export const getMeta = () => request("/meta");
export const getInsights = (days = 7) => request(`/insights?days=${days}`);
