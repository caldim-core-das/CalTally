/**
 * Correlation ID Middleware
 * ────────────────────────
 * Generates a unique UUID per incoming request so every log line, error response,
 * and downstream call can be traced back to a single user action.
 *
 * If the client sends an `x-correlation-id` header (e.g., from a frontend retry),
 * we reuse it; otherwise we generate a fresh one.
 */

const crypto = require('crypto');

function correlationId(req, res, next) {
  req.correlationId =
    req.headers['x-correlation-id'] || crypto.randomUUID();

  // Expose it on the response so the client can reference it in bug reports
  res.setHeader('x-correlation-id', req.correlationId);

  next();
}

module.exports = correlationId;
