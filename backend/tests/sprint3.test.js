const assert = require('assert');
const TDSCalculationService = require('../modules/financial-closing/services/TDSCalculationService');
const TDSDefinition = require('../modules/financial-closing/reports/definitions/tax/TDS');
const TCSDefinition = require('../modules/financial-closing/reports/definitions/tax/TCS');
const { Company } = require('../models');

async function runSprint3Tests() {
  const logs = [];
  const log = (msg) => {
    console.log(`[TEST-LOG-SPRINT3] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  log('Starting Sprint 3 TDS/TCS Report Tests...');

  try {
    // 1. TDSCalculationService Checks
    log('Test 1: Verifying TDSCalculationService mappings...');
    assert.strictEqual(typeof TDSCalculationService.getTDSSummary, 'function', 'TDS aggregation must exist');
    assert.strictEqual(typeof TDSCalculationService.getTCSSummary, 'function', 'TCS aggregation must exist');

    const company = await Company.findOne();
    if (company) {
      const companyId = company.id;
      const tdsRes = await TDSCalculationService.getTDSSummary({ companyId, fromDate: '2026-01-01', toDate: '2026-12-31' });
      assert.ok(Array.isArray(tdsRes.entries), 'TDS entries array returned');
      
      const tcsRes = await TDSCalculationService.getTCSSummary({ companyId, fromDate: '2026-01-01', toDate: '2026-12-31' });
      assert.ok(Array.isArray(tcsRes.invoices), 'TCS invoices array returned');
      log(`Calculations ran successfully. TDS sum: ${tdsRes.totalTDS}, TCS sum: ${tcsRes.totalTCS}`);

      // Test TDS threshold audit execution
      log('Running TDSCalculationService.auditTDSThresholds check...');
      const warnings = await TDSCalculationService.auditTDSThresholds({ companyId, fromDate: '2026-01-01', toDate: '2026-12-31' });
      assert.ok(Array.isArray(warnings), 'TDS threshold warnings array returned');
      log(`Audit ran successfully. Found ${warnings.length} threshold warnings.`);
    }

    // 2. Definitions Structures
    log('Test 2: Verifying TDS report definition schemas...');
    assert.strictEqual(TDSDefinition.name, 'TDS Analysis');
    assert.ok(TDSDefinition.columns.find(c => c.field === 'section'), 'TDS must have Section column');

    log('Test 3: Verifying TCS report definition schemas...');
    assert.strictEqual(TCSDefinition.name, 'TCS Analysis');
    assert.ok(TCSDefinition.columns.find(c => c.field === 'tcs'), 'TCS must have TCS Collected column');

    log('✅ SPRINT 3 WITHHOLDING TESTS COMPLETED SUCCESSFULLY!');
    require('fs').writeFileSync('sprint3_test_results.log', logs.join('\n') + '\nSUCCESS\n');
  } catch (err) {
    log(`❌ SPRINT 3 TEST FAILED: ${err.message}`);
    log(err.stack);
    require('fs').writeFileSync('sprint3_test_results.log', logs.join('\n') + `\nFAILURE: ${err.message}\n${err.stack}\n`);
  }
}

module.exports = runSprint3Tests;
