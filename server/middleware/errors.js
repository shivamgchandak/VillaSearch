import { config } from "../config/env.js";

export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function badRequest(message) {
  return new RequestError(400, message);
}

export function notFound(req, res) {
  res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}.` });
}

// Anything thrown inside a route lands here. Known request errors keep their
// message, anything else is reported as a server fault and logged in full.
export function errorHandler(error, _req, res, _next) {
  const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;

  if (status >= 500) console.error(error);
  else if (!config.isProduction) console.warn(`${status}: ${error.message}`);

  res.status(status).json({
    error: status >= 500 ? "The search failed on the server. Try again in a moment." : error.message,
    ...(status >= 500 && !config.isProduction ? { detail: error.message } : {}),
  });
}
