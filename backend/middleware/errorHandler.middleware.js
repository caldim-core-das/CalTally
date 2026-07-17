/**
 * Global Error Handler Middleware
 * ───────────────────────────────
 * Centralizes error handling for the entire Express application.
 * Produces a consistent error envelope:
 *   { error: { code, message, details, correlationId } }
 *
 * Error taxonomy:
 *   VALIDATION_ERROR  — Zod / input validation failure
 *   AUTH_ERROR         — Authentication / token failure
 *   FORBIDDEN          — Authorization / role failure
 *   NOT_FOUND          — Resource not found
 *   PERIOD_LOCKED      — Posting to a locked accounting period
 *   INTEGRITY_ERROR    — Double-entry balance failure, data integrity
 *   CONFLICT           — Duplicate / unique constraint violation
 *   RATE_LIMIT         — Too many requests
 *   INTERNAL_ERROR     — Unhandled / unexpected server error
 */

const { createModuleLogger } = require('../utils/logger');
const log = createModuleLogger('error-handler');

// Map known error prefixes/messages to structured codes
const ERROR_CODE_MAP = [
  { match: /PERIOD LOCKED/i,          code: 'PERIOD_LOCKED',    status: 422 },
  { match: /INTEGRITY ERROR/i,        code: 'INTEGRITY_ERROR',  status: 422 },
  { match: /SECURITY ERROR/i,         code: 'AUTH_ERROR',       status: 403 },
  { match: /Permission denied/i,      code: 'FORBIDDEN',        status: 403 },
  { match: /Access denied/i,          code: 'FORBIDDEN',        status: 403 },
  { match: /not found/i,              code: 'NOT_FOUND',        status: 404 },
  { match: /already exists/i,         code: 'CONFLICT',         status: 409 },
  { match: /duplicate/i,              code: 'CONFLICT',         status: 409 },
  { match: /Unique constraint/i,      code: 'CONFLICT',         status: 409 },
  { match: /token/i,                  code: 'AUTH_ERROR',       status: 401 },
];

function classifyError(err) {
  // Zod validation errors
  if (err.name === 'ZodError') {
    return {
      code: 'VALIDATION_ERROR',
      status: 400,
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    };
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return {
      code: err.name === 'SequelizeUniqueConstraintError' ? 'CONFLICT' : 'VALIDATION_ERROR',
      status: err.name === 'SequelizeUniqueConstraintError' ? 409 : 400,
      details: (err.errors || []).map((e) => ({
        field: e.path,
        message: e.message,
        type: e.type,
      })),
    };
  }

  // Check message-based classification
  for (const rule of ERROR_CODE_MAP) {
    if (rule.match.test(err.message)) {
      return { code: rule.code, status: rule.status };
    }
  }

  // If the error already has a statusCode (set by controllers)
  if (err.statusCode) {
    return {
      code: err.code || 'APPLICATION_ERROR',
      status: err.statusCode,
    };
  }

  // Default: internal server error
  return { code: 'INTERNAL_ERROR', status: 500 };
}

/**
 * Express error-handling middleware (4 args)
 */
function errorHandler(err, req, res, _next) {
  let { code, status, details } = classifyError(err);
  const isProduction = process.env.NODE_ENV === 'production';

  // Vol 3: Module-Specific Error Namespacing
  if (code && !code.includes('.')) {
    const contextName = req.baseUrl ? req.baseUrl.split('/').pop().toUpperCase().replace(/-/g, '_') : 'CORE';
    code = `${contextName}.${code}`;
  }

  // Log the full error server-side
  const logPayload = {
    correlationId: req.correlationId,
    tenantId: req.companyId,
    userId: req.user?.id,
    method: req.method,
    url: req.originalUrl,
    errorCode: code,
    err,
  };

  if (status >= 500) {
    log.error(logPayload, `[${code}] ${err.message}`);
  } else {
    log.warn(logPayload, `[${code}] ${err.message}`);
  }

  // Build response envelope
  const responseBody = {
    error: status >= 500 && isProduction
      ? 'An internal server error occurred'
      : err.message,
    errorCode: code,
    correlationId: req.correlationId,
  };

  if (details) {
    responseBody.details = details;
  }

  // Never leak stack traces in production
  if (!isProduction && status >= 500) {
    responseBody.stack = err.stack;
  }

  res.status(status).json(responseBody);
}

/**
 * Helper: create an error with a specific status code
 */
function createError(message, statusCode, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

module.exports = { errorHandler, createError };
