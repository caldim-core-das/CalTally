const express = require('express');
const router = express.Router();
const FinancialClosingController = require('../controllers/financialClosing.controller');
const { verifyToken } = require('../../../middleware/auth.middleware');

// Mount routes under /api/v1/financial-closing
router.get('/month-end', verifyToken, FinancialClosingController.getMonthEndSummary);
router.get('/month-end/diagnostics', verifyToken, FinancialClosingController.runDiagnostics);
router.get('/month-end/trends', verifyToken, FinancialClosingController.getMonthEndTrends);
router.get('/month-end/:reportKey', verifyToken, FinancialClosingController.getReportDetails);
router.post('/snapshots', verifyToken, FinancialClosingController.createSnapshot);
router.get('/snapshots/verify', verifyToken, FinancialClosingController.verifySnapshots);
router.post('/audit-log', verifyToken, FinancialClosingController.logExportEvent);

module.exports = router;
