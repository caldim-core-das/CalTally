/**
 * Centralized Structured Logger
 * ─────────────────────────────
 * Replaces all console.log/warn/error with structured JSON logging.
 * Every log line carries: tenantId, userId, correlationId, module, severity.
 *
 * Uses pino for structured JSON logging in production,
 * pino-pretty for human-readable logs in development.
 */

const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')),
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      correlationId: req.correlationId,
      tenantId: req.companyId,
      userId: req.user?.id,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  // Redact sensitive fields from logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'JWT_SECRET',
      'SMTP_PASS',
      'Client_secret',
      'DATABASE_URL',
    ],
    censor: '[REDACTED]',
  },
});

/**
 * Create a child logger scoped to a specific module/context
 * @param {string} moduleName - The module/bounded-context name (e.g., 'accounting', 'sales')
 * @returns {pino.Logger} Scoped logger instance
 */
function createModuleLogger(moduleName) {
  return logger.child({ module: moduleName });
}

/**
 * Create a request-scoped child logger with tenant/user context
 * @param {object} req - Express request object
 * @param {string} moduleName - The module name
 * @returns {pino.Logger} Request-scoped logger
 */
function createRequestLogger(req, moduleName) {
  return logger.child({
    module: moduleName,
    correlationId: req.correlationId,
    tenantId: req.companyId,
    userId: req.user?.id,
  });
}

module.exports = {
  logger,
  createModuleLogger,
  createRequestLogger,
};
