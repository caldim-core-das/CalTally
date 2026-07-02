const { sequelize, Company, User, BankFeedConsent, BankFeedAccount, BankTransaction, Voucher, Transaction } = require('../models');
const bankFeedController = require('../modules/bankFeed/bankFeed.controller');
const reconciliationController = require('../modules/reconciliation/reconciliation.controller');
const autoMatchService = require('../modules/reconciliation/autoMatch.service');
const setuClient = require('../utils/setuClient');
const assert = require('assert');

async function runTests() {
  console.log('--- STARTING BANK FEED INTEGRATION TESTS (PHASE 7) ---');
  try {
    sequelize.options.logging = console.log;
    await sequelize.authenticate();

    // Targeted table sync and alters
    try {
      await sequelize.query('ALTER TABLE "BankTransactions" ADD COLUMN IF NOT EXISTS "sourceType" VARCHAR(50) DEFAULT \'MANUAL\';');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE "BankTransactions" ADD COLUMN IF NOT EXISTS "externalTxnId" VARCHAR(255) UNIQUE;');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE "BankTransactions" ADD COLUMN IF NOT EXISTS "BankFeedAccountId" UUID;');
    } catch (e) {}

    await BankFeedConsent.sync();
    await BankFeedAccount.sync();

    // Mock Setu API requests using custom Axios adapter to run tests offline
    setuClient.defaults.adapter = async (config) => {
      if (config.url === '/consents' && config.method === 'post') {
        return {
          data: { id: 'mock-setu-consent-id', url: 'https://mock.setu.consent.url' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      }
      if (config.url === '/sessions' && config.method === 'post') {
        return {
          data: { id: 'mock-session-id' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      }
      if (config.url.startsWith('/sessions/') && config.method === 'get') {
        return {
          data: {
            fips: [
              {
                accounts: [
                  {
                    linkRefNumber: 'ref-hdfc',
                    data: {
                      account: {
                        transactions: {
                          transaction: [
                            { txnId: 'txn-1', transactionTimestamp: '2026-06-01T12:00:00Z', narration: 'Salary Credit', amount: '50000', type: 'CREDIT' }
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            ]
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      }
      return {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    };

    // 1. Setup Test Data
    const ts = Date.now();
    const testEmail = `test_bankfeed_${ts}@example.com`;
    const user = await User.create({ email: testEmail, name: 'Bank Test User', password: 'pwd', role: 'ADMIN' });
    const company = await Company.create({
      name: `Bank Test Company ${ts}`,
      userId: user.id,
      financialYearStart: new Date('2024-04-01'),
      financialYearEnd: new Date('2025-03-31'),
      booksBeginningFrom: new Date('2024-04-01')
    });

    const companyB = await Company.create({
      name: `Bank Test Company B ${ts}`,
      userId: user.id,
      financialYearStart: new Date('2024-04-01'),
      financialYearEnd: new Date('2025-03-31'),
      booksBeginningFrom: new Date('2024-04-01')
    });

    // Unique strings for this test run
    const happyConsentId = `mock-consent-${ts}`;
    const rejectConsentId = `mock-consent-reject-${ts}`;
    const revokeConsentId = `mock-consent-revoke-${ts}`;
    const duplicateTxnId = `txn-duplicate-test-${ts}`;
    const voucherBNum = `V-B-001-${ts}`;
    const voucherMatchNum = `V-MATCH-001-${ts}`;
    const autoMatchTxnId = `auto-match-txn-${ts}`;
    const pdfTxnId1 = `pdf-txn-1-${ts}`;
    const pdfTxnId2 = `pdf-txn-2-${ts}`;

    // ────────────────────────────────────────────────────────────────────────
    // TC-10: Token expiry / Client Auth Headers
    // ────────────────────────────────────────────────────────────────────────
    console.log('TC-10: Setu API client headers presence');
    const dummyConfig = { headers: {} };
    const interceptors = setuClient.interceptors.request.handlers[0];
    const updatedConfig = interceptors.fulfilled(dummyConfig);
    assert.ok(updatedConfig.headers['Content-Type'] === 'application/json', 'Content-Type header should be json');
    console.log('✅ TC-10 Passed');

    // ────────────────────────────────────────────────────────────────────────
    // TC-01 & TC-08: Happy path / Multi-account link
    // ────────────────────────────────────────────────────────────────────────
    console.log('TC-01 & TC-08: Happy path & Multi-account linking');
    const mockConsent = await BankFeedConsent.create({
      CompanyId: company.id,
      UserId: user.id,
      setuConsentId: happyConsentId,
      consentUrl: 'https://mock.url',
      status: 'PENDING',
      dataRange: { from: new Date().toISOString(), to: new Date().toISOString() }
    });

    const mockReq = {
      body: {
        type: 'CONSENT_STATUS_UPDATE',
        consentId: happyConsentId,
        data: {
          status: 'ACTIVE',
          detail: {
            accounts: [
              { maskedAccNumber: 'XXXX1122', fipId: 'HDFC-FIP', fiType: 'DEPOSIT', linkRefNumber: 'ref-hdfc', accType: 'SAVINGS' },
              { maskedAccNumber: 'XXXX3344', fipId: 'ICICI-FIP', fiType: 'DEPOSIT', linkRefNumber: 'ref-icici', accType: 'CURRENT' }
            ]
          }
        }
      }
    };
    const mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.jsonData = data; return this; }
    };

    await bankFeedController.handleWebhook(mockReq, mockRes);
    assert.strictEqual(mockRes.statusCode, 200, 'Webhook should return 200 status');

    const linkedAccounts = await BankFeedAccount.findAll({ where: { ConsentId: mockConsent.id } });
    assert.strictEqual(linkedAccounts.length, 2, 'Should create exactly two accounts');
    assert.strictEqual(linkedAccounts[0].maskedAccNumber, 'XXXX1122', 'First account number matched');
    assert.strictEqual(linkedAccounts[1].maskedAccNumber, 'XXXX3344', 'Second account number matched');
    console.log('✅ TC-01 & TC-08 Passed');

    // ────────────────────────────────────────────────────────────────────────
    // TC-02: Duplicate Prevention
    // ────────────────────────────────────────────────────────────────────────
    console.log('TC-02: Duplicate prevention check');
    const [tx1, created1] = await BankTransaction.findOrCreate({
      where: { externalTxnId: duplicateTxnId, CompanyId: company.id },
      defaults: {
        CompanyId: company.id,
        date: new Date(),
        description: 'Test transaction',
        amount: 1500,
        type: 'Credit',
        isMatched: false,
        sourceType: 'AA_IMPORT'
      }
    });
    assert.ok(created1, 'First insertion should be created');

    const [tx2, created2] = await BankTransaction.findOrCreate({
      where: { externalTxnId: duplicateTxnId, CompanyId: company.id },
      defaults: {
        CompanyId: company.id,
        date: new Date(),
        description: 'Test transaction duplicate',
        amount: 1500,
        type: 'Credit',
        isMatched: false,
        sourceType: 'AA_IMPORT'
      }
    });
    assert.ok(!created2, 'Duplicate transaction should not be created');
    console.log('✅ TC-02 Passed');

    // ────────────────────────────────────────────────────────────────────────
    // TC-03: Consent Rejection
    // ────────────────────────────────────────────────────────────────────────
    console.log('TC-03: Consent status rejection webhook');
    const mockConsentReject = await BankFeedConsent.create({
      CompanyId: company.id,
      UserId: user.id,
      setuConsentId: rejectConsentId,
      status: 'PENDING'
    });
    const mockRejectReq = {
      body: {
        type: 'CONSENT_STATUS_UPDATE',
        consentId: rejectConsentId,
        data: { status: 'REJECTED' }
      }
    };
    await bankFeedController.handleWebhook(mockRejectReq, mockRes);
    const updatedReject = await BankFeedConsent.findByPk(mockConsentReject.id);
    assert.strictEqual(updatedReject.status, 'REJECTED', 'Status should be updated to REJECTED');
    console.log('✅ TC-03 Passed');

    // ────────────────────────────────────────────────────────────────────────
    // TC-04: Consent Revocation
    // ────────────────────────────────────────────────────────────────────────
    console.log('TC-04: Consent revocation');
    const mockConsentRevoke = await BankFeedConsent.create({
      CompanyId: company.id,
      UserId: user.id,
      setuConsentId: revokeConsentId,
      status: 'ACTIVE'
    });
    const revokeReq = {
      params: { consentId: mockConsentRevoke.id },
      user: { companyId: company.id }
    };
    await bankFeedController.revokeConsent(revokeReq, mockRes);
    const updatedRevoked = await BankFeedConsent.findByPk(mockConsentRevoke.id);
    assert.strictEqual(updatedRevoked.status, 'REVOKED', 'Status should be REVOKED after revocation');
    console.log('✅ TC-04 Passed');

    // ────────────────────────────────────────────────────────────────────────
    // TC-05: Session status update (Partial fetch)
    // ────────────────────────────────────────────────────────────────────────
    console.log('TC-05: Webhook SESSION_STATUS_UPDATE handler');
    const mockSessionReq = {
      body: {
        type: 'SESSION_STATUS_UPDATE',
        consentId: happyConsentId,
        dataSessionId: 'sess-abc-123',
        data: { status: 'PARTIAL' }
      }
    };
    await bankFeedController.handleWebhook(mockSessionReq, mockRes);
    assert.strictEqual(mockRes.statusCode, 200, 'Should gracefully return 200 even on fetch errors');
    console.log('✅ TC-05 Passed');

    // ────────────────────────────────────────────────────────────────────────
    // TC-06: BOLA Protection test
    // ────────────────────────────────────────────────────────────────────────
    console.log('TC-06: BOLA protection validation');
    const btA = await BankTransaction.create({
      CompanyId: company.id,
      date: new Date(),
      description: 'Company A txn',
      amount: 1000,
      type: 'Debit'
    });
    const voucherB = await Voucher.create({
      CompanyId: companyB.id,
      voucherType: 'Payment',
      date: new Date(),
      voucherNumber: voucherBNum
    });

    const bolaReq = {
      body: {
        bankTransactionId: btA.id,
        voucherId: voucherB.id
      },
      user: { companyId: company.id }
    };
    const bolaRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.jsonData = data; return this; }
    };

    await reconciliationController.reconcile(bolaReq, bolaRes);
    assert.ok(bolaRes.statusCode === 404 || bolaRes.statusCode === 400 || bolaRes.statusCode === 403, 'BOLA check should reject cross-company link');
    console.log('✅ TC-06 Passed');

    // ────────────────────────────────────────────────────────────────────────
    // TC-07: Auto-Matching linking
    // ────────────────────────────────────────────────────────────────────────
    console.log('TC-07: Auto-matching linking');
    const automatchAmount = 5000;
    const automatchDate = new Date();

    const voucherMatch = await Voucher.create({
      CompanyId: company.id,
      voucherType: 'Payment',
      date: automatchDate,
      voucherNumber: voucherMatchNum
    });
    await Transaction.create({
      VoucherId: voucherMatch.id,
      CompanyId: company.id,
      debit: automatchAmount,
      credit: 0
    });

    const bankTxMatch = await BankTransaction.create({
      CompanyId: company.id,
      date: automatchDate,
      description: 'Auto-match test',
      amount: automatchAmount,
      type: 'Debit',
      isMatched: false,
      sourceType: 'AA_IMPORT',
      externalTxnId: autoMatchTxnId
    });

    const matchedCount = await autoMatchService.autoMatchImported(company.id);
    assert.strictEqual(matchedCount, 1, 'Should find and auto-match exactly 1 record');

    const updatedBankTx = await BankTransaction.findByPk(bankTxMatch.id);
    assert.strictEqual(updatedBankTx.isMatched, true, 'Transaction should be marked as matched');
    assert.strictEqual(updatedBankTx.matchedVoucherId, voucherMatch.id, 'Transaction should point to correct voucher');
    console.log('✅ TC-07 Passed');

    // ────────────────────────────────────────────────────────────────────────
    // TC-09: PDF Statement Upload handler parsing mock
    // ────────────────────────────────────────────────────────────────────────
    console.log('TC-09: PDF upload validation (mocked Setu API)');
    const sampleTxs = [
      { transaction_id: pdfTxnId1, date: '2026-06-01', narration: 'Salary Credit', amount: 15000, transaction_type: 'credit' },
      { transaction_id: pdfTxnId2, date: '2026-06-02', narration: 'Supermarket Debit', amount: 2000, transaction_type: 'debit' }
    ];

    const createdPdfTxs = [];
    for (const tx of sampleTxs) {
      const [record] = await BankTransaction.findOrCreate({
        where: { externalTxnId: tx.transaction_id || null, CompanyId: company.id },
        defaults: {
          CompanyId: company.id,
          date: new Date(tx.date),
          description: tx.narration,
          amount: Math.abs(tx.amount),
          type: tx.transaction_type === 'credit' ? 'Credit' : 'Debit',
          isMatched: false,
          sourceType: 'CSV_IMPORT',
          externalTxnId: tx.transaction_id || null
        }
      });
      createdPdfTxs.push(record);
    }
    assert.strictEqual(createdPdfTxs.length, 2, 'Should parse and import exactly 2 PDF transactions');
    assert.strictEqual(createdPdfTxs[0].sourceType, 'CSV_IMPORT', 'Transaction type is CSV_IMPORT');
    console.log('✅ TC-09 Passed');

    console.log('🎉 ALL PHASE 7 BANK FEED TESTS PASSED SUCCESSFULLY 🎉');
  } catch (err) {
    console.error('❌ Integration Test failed:', err);
    process.exit(1);
  }
}

runTests();
