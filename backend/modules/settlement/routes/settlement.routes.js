const express = require('express');
const router = express.Router();
const SettlementController = require('../controllers/settlement.controller');
const { verifyToken } = require('../../../middleware/auth.middleware');

router.use(verifyToken);

// Executive KPIs
router.get('/dashboard-kpis', SettlementController.getDashboardKPIs);

// Unpaid invoices for Allocation Modal
router.get('/unpaid-invoices', SettlementController.getUnpaidInvoices);

// Allocate Payments
router.post('/allocate', SettlementController.allocatePayment);

// Waterfall Settlement History
router.get('/history/:invoiceId', SettlementController.getSettlementHistory);

// Settlement Register Journal Report
router.get('/register', SettlementController.getSettlementRegister);

// Receivables Aging Analysis
router.get('/aging/receivables', SettlementController.getReceivablesAging);

// Collections Follow-up
router.get('/collections-followup', SettlementController.getCollectionsFollowup);

// Party Ledger Statement
router.get('/party-statement', SettlementController.getPartyStatement);

module.exports = router;
