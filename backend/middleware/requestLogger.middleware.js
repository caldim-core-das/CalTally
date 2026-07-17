/**
 * Request Logger Middleware
 * ────────────────────────
 * Logs incoming HTTP requests and outgoing responses with timing.
 * Financial mutations (POST/PUT/DELETE) are logged at INFO level unconditionally.
 * GET requests are logged at DEBUG level (can be sampled under load).
 */

const { createModuleLogger } = require('../utils/logger');
const log = createModuleLogger('http');

function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      correlationId: req.correlationId,
      tenantId: req.companyId,
      userId: req.user?.id,
      contentLength: res.getHeader('content-length'),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
    };

    // Financial mutations are never sampled — always log at INFO
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (res.statusCode >= 400) {
        log.warn(logData, `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
      } else {
        log.info(logData, `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
      }
    } else {
      // GET/HEAD/OPTIONS — debug level (can be sampled)
      if (res.statusCode >= 400) {
        log.warn(logData, `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
      } else {
        log.debug(logData, `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
      }
    }
  });

  next();
}

module.exports = requestLogger;
