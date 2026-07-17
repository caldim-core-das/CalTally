/**
 * Fiscal Year Routes
 * ──────────────────
 * CRUD + close/reopen for fiscal year management.
 */

const router = require('express').Router();
const { verifyToken, tenantAccess, authorizeRoles } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createFiscalYearSchema } = require('../../validators/accounting.schema');
const controller = require('./fiscalYear.controller');

// All routes require auth + tenant access
router.use(verifyToken, tenantAccess);

// GET    /api/fiscal-years           — List fiscal years
router.get('/', controller.getFiscalYears);

// GET    /api/fiscal-years/:id       — Get single fiscal year
router.get('/:id', controller.getFiscalYearById);

// POST   /api/fiscal-years           — Create fiscal year (ADMIN, ACCOUNTANT)
router.post(
  '/',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'),
  validate(createFiscalYearSchema),
  controller.createFiscalYear
);

// POST   /api/fiscal-years/:id/close — Close fiscal year (ADMIN only)
router.post(
  '/:id/close',
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  controller.closeFiscalYear
);

// POST   /api/fiscal-years/:id/reopen — Reopen closed fiscal year (ADMIN only, with reason)
router.post(
  '/:id/reopen',
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  controller.reopenFiscalYear
);

// DELETE /api/fiscal-years/:id       — Delete open fiscal year (ADMIN only)
router.delete(
  '/:id',
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  controller.deleteFiscalYear
);

module.exports = router;
