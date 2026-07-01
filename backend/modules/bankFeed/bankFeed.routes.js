const express = require('express');
const router = express.Router();
const bankFeedController = require('./bankFeed.controller');
const { verifyToken, tenantAccess } = require('../../middleware/auth.middleware');

// Secure all banking and consent routes with token & tenant checks
router.use(verifyToken, tenantAccess);

router.post('/consent', bankFeedController.createConsent);
router.get('/consent/:consentId', bankFeedController.getConsentStatus);
router.get('/consent/ledger/:ledgerId', bankFeedController.getConsentByLedger);
router.post('/consent/:consentId/approve', bankFeedController.approveConsent);
router.post('/sync', bankFeedController.syncTransactions);

module.exports = router;
