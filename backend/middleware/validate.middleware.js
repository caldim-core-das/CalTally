/**
 * Zod Request Validation Middleware
 * ─────────────────────────────────
 * Validates req.body, req.params, and req.query against Zod schemas.
 * On failure, passes a ZodError to the global error handler which
 * formats it as a structured VALIDATION_ERROR response.
 */

/**
 * Creates validation middleware for a given Zod schema object.
 * @param {{ body?: ZodSchema, params?: ZodSchema, query?: ZodSchema }} schemas
 * @returns {Function} Express middleware
 *
 * Usage:
 *   const { z } = require('zod');
 *   const schema = { body: z.object({ name: z.string().min(1) }) };
 *   router.post('/items', validate(schema), controller.create);
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      next();
    } catch (err) {
      // ZodError will be caught by the global errorHandler
      next(err);
    }
  };
}

module.exports = { validate };
