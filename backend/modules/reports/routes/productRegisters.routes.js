const express = require('express');
const router = express.Router();
const controller = require('../controllers/productRegisters.controller');
const { verifyToken } = require('../../../middleware/auth.middleware');

// All product register endpoints require authentication
router.use(verifyToken);

router.get('/sales', controller.getSalesRegister);
router.get('/purchase', controller.getPurchaseRegister);
router.get('/ledger', controller.getProductLedger);
router.get('/drilldown', controller.getDrilldown);
router.get('/performance', controller.getPerformance);

module.exports = router;
