const assert = require('assert');
const SalesRepository = require('../modules/financial-closing/repositories/SalesRepository');
const PurchaseRepository = require('../modules/financial-closing/repositories/PurchaseRepository');
const LedgerRepository = require('../modules/financial-closing/repositories/LedgerRepository');
const eventBus = require('../core/EventBus');
const { MonthlyTaxSummary, Company, sequelize } = require('../models');

async function runSprint0Tests() {
  const logs = [];
  const log = (msg) => {
    console.log(`[TEST-LOG] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  log('Starting Sprint 0 Foundation Tests...');

  try {
    // 1. Verify Database Model Exists & Queries
    log('Test 1: Verifying MonthlyTaxSummary Model integration...');
    assert.ok(MonthlyTaxSummary, 'MonthlyTaxSummary model should be loaded');
    const summaryCount = await MonthlyTaxSummary.count();
    log(`Successfully queried MonthlyTaxSummary. Count: ${summaryCount}`);

    // 2. Fetch a dummy or real company to run repository checks
    log('Test 2: Verifying Company context for Repositories...');
    const company = await Company.findOne();
    if (!company) {
      log('No companies found in database, skipping detailed repository checks (Passed basic setup)');
    } else {
      const companyId = company.id;
      log(`Found company ID: ${companyId}. Running Repository queries...`);

      // Test SalesRepository
      log('Querying SalesRepository.getSalesForPeriod...');
      const sales = await SalesRepository.getSalesForPeriod({
        companyId,
        fromDate: '2026-01-01',
        toDate: '2026-12-31'
      });
      log(`Sales query complete. Retrieved: ${sales.length} invoices.`);

      // Test PurchaseRepository
      log('Querying PurchaseRepository.getPurchasesForPeriod...');
      const purchases = await PurchaseRepository.getPurchasesForPeriod({
        companyId,
        fromDate: '2026-01-01',
        toDate: '2026-12-31'
      });
      log(`Purchase query complete. Retrieved: ${purchases.length} bills.`);

      // Test LedgerRepository
      log('Querying LedgerRepository.getLedgersWithPostings...');
      const ledgers = await LedgerRepository.getLedgersWithPostings({
        companyId,
        fromDate: '2026-01-01',
        toDate: '2026-12-31'
      });
      log(`Ledger query complete. Retrieved: ${ledgers.length} accounts.`);
    }

    // 3. Verify Event Bus integrations
    log('Test 3: Verifying Event Bus interfaces...');
    assert.strictEqual(typeof eventBus.publish, 'function', 'EventBus should have publish()');
    assert.strictEqual(typeof eventBus.subscribe, 'function', 'EventBus should have subscribe()');
    
    let eventReceived = false;
    eventBus.subscribe('TEST_EVENT_SPRINT_0', 'sprint0_test_handler', (data) => {
      if (data && data.payload && data.payload.status === 'OK') {
        eventReceived = true;
      }
    });

    eventBus.publish('TEST_EVENT_SPRINT_0', { status: 'OK' });
    
    // Poll up to 2 seconds for event execution in Redis/BullMQ
    for (let i = 0; i < 20; i++) {
      if (eventReceived) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(eventReceived, 'EventBus should correctly dispatch events to subscriber');
    log('EventBus test passed successfully!');

    log('✅ SPRINT 0 FOUNDATION TESTS COMPLETED SUCCESSFULLY!');
    require('fs').writeFileSync('sprint0_test_results.log', logs.join('\n') + '\nSUCCESS\n');
  } catch (err) {
    log(`❌ TEST FAILED: ${err.message}`);
    log(err.stack);
    require('fs').writeFileSync('sprint0_test_results.log', logs.join('\n') + `\nFAILURE: ${err.message}\n${err.stack}\n`);
  }
}

module.exports = runSprint0Tests;
