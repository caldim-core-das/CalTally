const assert = require('assert');
const ExceptionEngine = require('../modules/financial-closing/engine/ExceptionEngine');
const { Company } = require('../models');

async function runSprint5Tests() {
  const logs = [];
  const log = (msg) => {
    console.log(`[TEST-LOG-SPRINT5] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  log('Starting Sprint 5 Exception Diagnostics Tests...');

  try {
    const company = await Company.findOne();
    if (!company) {
      log('No company found, skipping diagnostics tests');
      return;
    }

    const companyId = company.id;

    log('Test 1: Running ExceptionEngine diagnostic validation...');
    const exceptions = await ExceptionEngine.runDiagnostics({
      companyId,
      fromDate: '2026-07-01',
      toDate: '2026-07-31'
    });

    assert.ok(Array.isArray(exceptions), 'Diagnostics returns exceptions array');
    log(`Diagnostics completed. Isolated ${exceptions.length} exceptions.`);

    // Verify exception sorting severity orders
    if (exceptions.length > 1) {
      const first = exceptions[0].severity;
      const last = exceptions[exceptions.length - 1].severity;
      const priority = { critical: 4, high: 3, medium: 2, low: 1 };
      assert.ok(priority[first] >= priority[last], 'Exceptions must be sorted by priority');
    }

    log('✅ SPRINT 5 EXCEPTION DIAGNOSTICS TESTS COMPLETED SUCCESSFULLY!');
    require('fs').writeFileSync('sprint5_test_results.log', logs.join('\n') + '\nSUCCESS\n');
  } catch (err) {
    log(`❌ SPRINT 5 TEST FAILED: ${err.message}`);
    log(err.stack);
    require('fs').writeFileSync('sprint5_test_results.log', logs.join('\n') + `\nFAILURE: ${err.message}\n${err.stack}\n`);
  }
}

module.exports = runSprint5Tests;
