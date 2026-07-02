const express = require('express');
const router = express.Router();
const ctrl = require('./bankFeed.controller');
const parserCtrl = require('./statementParser.controller');
const { verifyToken, tenantAccess } = require('../../middleware/auth.middleware');

// Webhook — NO auth (Setu calls this directly)
router.post('/webhook', ctrl.handleWebhook);

// Redirect endpoint from Setu — NO auth needed since browser is redirected here
router.get('/consent-redirect', (req, res) => {
  const consentId = req.query.id || req.query.consentId;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/banking?consent_id=${consentId}`);
});

// All other routes require auth + tenant access
router.use(verifyToken, tenantAccess);
router.post('/consent', ctrl.createConsent);
router.get('/accounts', ctrl.getConnectedAccounts);
router.delete('/consent/:consentId', ctrl.revokeConsent);
router.post('/upload-statement', parserCtrl.uploadMiddleware, parserCtrl.parseStatement);

module.exports = router;
