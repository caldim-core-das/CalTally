const SetuService = require('../../services/SetuService');
const { SetuConsent } = require('../../models');

exports.createConsent = async (req, res, next) => {
  try {
    const companyId = req.user.companyId; // from tenantAccess middleware
    const { ledgerId, bankName } = req.body;

    if (!ledgerId) {
      return res.status(400).json({ error: 'ledgerId is required' });
    }

    const consentData = await SetuService.createConsentRequest(companyId, ledgerId, bankName);
    res.status(201).json(consentData);
  } catch (err) {
    next(err);
  }
};

exports.getConsentStatus = async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const consent = await SetuService.getConsentStatus(consentId);
    
    // BOLA validation: ensure consent request belongs to this tenant/company
    if (consent.CompanyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Access denied: consent does not belong to this company' });
    }

    res.json(consent);
  } catch (err) {
    next(err);
  }
};

exports.getConsentByLedger = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { ledgerId } = req.params;
    
    const consent = await SetuConsent.findOne({
      where: { CompanyId: companyId, LedgerId: ledgerId }
    });
    
    res.json(consent || null);
  } catch (err) {
    next(err);
  }
};

exports.approveConsent = async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const consent = await SetuConsent.findOne({ where: { consentId } });
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent request not found' });
    }

    if (consent.CompanyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const approvedConsent = await SetuService.approveConsent(consentId);
    res.json({ message: 'Consent approved successfully', consent: approvedConsent });
  } catch (err) {
    next(err);
  }
};

exports.syncTransactions = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { consentId, ledgerId } = req.body;

    if (!consentId || !ledgerId) {
      return res.status(400).json({ error: 'consentId and ledgerId are required' });
    }

    const result = await SetuService.syncTransactions(consentId, companyId, ledgerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
