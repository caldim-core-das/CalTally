const { BankFeedConsent, BankFeedAccount, BankTransaction } = require('../../models');
const setuClient = require('../../utils/setuClient');
const crypto = require('crypto');

// ─── STEP 1: Create Consent ───────────────────────────────────────────────
// Called when user clicks "Connect Bank Account"
exports.createConsent = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;

    // Date range: fetch last 12 months of transactions
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 1);

    const payload = {
      consentDuration: { unit: 'YEAR', value: 1 },
      dataRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      },
      context: [{ key: 'accounttype', value: 'SAVINGS' }],
      redirectUrl: `${process.env.SETU_CALLBACK_BASE_URL}/api/bank-feed/consent-redirect`
    };

    const { data } = await setuClient.post('/consents', payload);

    // Save consent record locally
    const consent = await BankFeedConsent.create({
      CompanyId: companyId,
      UserId: userId,
      setuConsentId: data.id,
      consentUrl: data.url,
      status: 'PENDING',
      dataRange: { from: fromDate.toISOString(), to: toDate.toISOString() }
    });

    // Return the consent URL — frontend redirects user to this URL
    res.json({ consentId: consent.id, consentUrl: data.url });
  } catch (err) {
    next(err);
  }
};

// ─── STEP 2: Webhook Handler (from Setu) ─────────────────────────────────
// Setu posts CONSENT_STATUS_UPDATE and SESSION_STATUS_UPDATE here
exports.handleWebhook = async (req, res, next) => {
  try {
    // Verify webhook authenticity (Setu signs the payload using HMAC-SHA256)
    const webhookSecret = process.env.SETU_WEBHOOK_SECRET;
    const signature = req.headers['x-setu-signature'];

    if (webhookSecret && webhookSecret !== 'your_webhook_secret_here') {
      if (!signature) {
        return res.status(401).json({ error: 'Signature header x-setu-signature is missing.' });
      }
      
      const computedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.rawBody || '')
        .digest('hex');

      const signatureBuf = Buffer.from(signature, 'utf8');
      const computedBuf = Buffer.from(computedHash, 'utf8');

      if (signatureBuf.length !== computedBuf.length || !crypto.timingSafeEqual(signatureBuf, computedBuf)) {
        console.warn(`[SECURITY WARNING] Invalid signature received on Setu bank feed webhook.`);
        return res.status(401).json({ error: 'Invalid webhook signature.' });
      }
    } else {
      console.log('⚠️ [Setu Webhook Warning]: SETU_WEBHOOK_SECRET is not configured or is using default placeholder. Skipping signature verification.');
    }

    const { type, consentId, data } = req.body;

    if (type === 'CONSENT_STATUS_UPDATE') {
      const consent = await BankFeedConsent.findOne({
        where: { setuConsentId: consentId }
      });
      if (!consent) return res.status(200).json({ ok: true }); // Setu requires 200

      await consent.update({ status: data.status });

      if (data.status === 'ACTIVE') {
        // Save linked bank accounts
        if (data.detail && data.detail.accounts) {
          for (const acc of data.detail.accounts) {
            await BankFeedAccount.findOrCreate({
              where: { linkRefNumber: acc.linkRefNumber, ConsentId: consent.id },
              defaults: {
                CompanyId: consent.CompanyId,
                ConsentId: consent.id,
                maskedAccNumber: acc.maskedAccNumber,
                fipId: acc.fipId,
                fiType: acc.fiType,
                linkRefNumber: acc.linkRefNumber,
                accountType: acc.accType
              }
            });
          }
        }

        // With Auto-Fetch disabled: trigger data session manually
        // With Auto-Fetch enabled: Setu does this automatically — skip
        if (process.env.SETU_AUTO_FETCH !== 'true') {
          await createDataSession(consent);
        }
      }
    }

    if (type === 'SESSION_STATUS_UPDATE') {
      const { dataSessionId, data: sessionData } = req.body;
      if (sessionData.status === 'COMPLETED' || sessionData.status === 'PARTIAL') {
        await fetchAndImportTransactions(consentId, dataSessionId);
      }
    }

    // Auto-Fetch mode: Setu posts FI_DATA_READY with data inline
    if (type === 'FI_DATA_READY') {
      const consent = await BankFeedConsent.findOne({
        where: { setuConsentId: consentId }
      });
      if (consent && req.body.fiData) {
        await importFiData(consent, req.body.fiData);
      }
    }

    res.status(200).json({ ok: true }); // Always return 200 to Setu
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).json({ ok: true }); // Still return 200 — log and handle async
  }
};

// ─── STEP 3: Create Data Session (manual fetch path) ─────────────────────
async function createDataSession(consent) {
  const { data } = await setuClient.post('/sessions', {
    consentId: consent.setuConsentId,
    dataRange: consent.dataRange,
    format: 'json'
  });
  return data.id; // sessionId
}

// ─── STEP 4: Fetch FI Data & Import ──────────────────────────────────────
async function fetchAndImportTransactions(setuConsentId, sessionId) {
  const { data } = await setuClient.get(`/sessions/${sessionId}`);
  const consent = await BankFeedConsent.findOne({
    where: { setuConsentId },
    include: [{ model: BankFeedAccount }]
  });
  if (!consent) return;
  await importFiData(consent, data.fips);
}

// ─── Import helper — maps Setu transactions to BankTransaction rows ───────
async function importFiData(consent, fips) {
  if (!fips) return;

  for (const fip of fips) {
    for (const accountData of fip.accounts || fip.data || []) {
      const acctRef = accountData.linkRefNumber;
      const feedAccount = await BankFeedAccount.findOne({
        where: { linkRefNumber: acctRef, CompanyId: consent.CompanyId }
      });

      const rawAccount = accountData.data?.account || accountData.decryptedFI?.account;
      const transactions = rawAccount?.transactions?.transaction || [];

      for (const tx of transactions) {
        // Deduplicate using external txnId
        await BankTransaction.findOrCreate({
          where: { externalTxnId: tx.txnId },
          defaults: {
            CompanyId: consent.CompanyId,
            BankFeedAccountId: feedAccount?.id || null,
            date: new Date(tx.transactionTimestamp || tx.valueDate),
            description: tx.narration,
            amount: parseFloat(tx.amount),
            type: tx.type === 'CREDIT' ? 'Credit' : 'Debit',
            isMatched: false,
            sourceType: 'AA_IMPORT',
            externalTxnId: tx.txnId
          }
        });
      }
    }
  }

  // Try to auto-match the imported transactions with existing vouchers
  try {
    const autoMatchService = require('../reconciliation/autoMatch.service');
    await autoMatchService.autoMatchImported(consent.CompanyId);
  } catch (err) {
    console.error('Auto match error after import:', err);
  }

  await consent.update({ lastFetchedAt: new Date() });
}

// ─── GET: List all connected bank accounts for a company ──────────────────
exports.getConnectedAccounts = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const consents = await BankFeedConsent.findAll({
      where: { CompanyId: companyId },
      include: [{ model: BankFeedAccount, where: { isActive: true }, required: false }],
      order: [['createdAt', 'DESC']]
    });
    res.json(consents);
  } catch (err) { next(err); }
};

// ─── DELETE: Revoke consent ───────────────────────────────────────────────
exports.revokeConsent = async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const companyId = req.user.companyId;
    const consent = await BankFeedConsent.findOne({
      where: { id: consentId, CompanyId: companyId }
    });
    if (!consent) return res.status(404).json({ error: 'Consent not found' });

    // Tell Setu to revoke
    await setuClient.delete(`/consents/${consent.setuConsentId}`).catch(() => {});
    await consent.update({ status: 'REVOKED' });
    res.json({ message: 'Bank feed disconnected' });
  } catch (err) { next(err); }
};
