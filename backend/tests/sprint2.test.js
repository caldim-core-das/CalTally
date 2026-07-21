const assert = require('assert');
const GSTCalculationService = require('../modules/financial-closing/services/GSTCalculationService');
const SalesDefinition = require('../modules/financial-closing/reports/definitions/tax/Sales');
const PurchaseDefinition = require('../modules/financial-closing/reports/definitions/tax/Purchase');
const GSTDefinition = require('../modules/financial-closing/reports/definitions/tax/GST');

async function runSprint2Tests() {
  const logs = [];
  const log = (msg) => {
    console.log(`[TEST-LOG-SPRINT2] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  log('Starting Sprint 2 Core Tax Report Tests...');

  try {
    // 1. GSTCalculationService Tests
    log('Test 1: Verifying GST splits for same state (Intra-state)...');
    const intra = GSTCalculationService.calculateGSTSplits({
      taxableAmount: 10000,
      gstRate: 18,
      companyState: 'TAMIL NADU',
      counterpartyState: 'TAMIL NADU'
    });
    assert.strictEqual(intra.cgstRate, 9, 'CGST rate must be 9%');
    assert.strictEqual(intra.sgstRate, 9, 'SGST rate must be 9%');
    assert.strictEqual(intra.igstRate, 0, 'IGST rate must be 0%');
    assert.strictEqual(intra.cgstAmount, 900, 'CGST amount must be 900');
    assert.strictEqual(intra.sgstAmount, 900, 'SGST amount must be 900');
    assert.strictEqual(intra.igstAmount, 0, 'IGST amount must be 0');
    log('Intra-state GST splits verified successfully!');

    log('Test 2: Verifying GST splits for different states (Inter-state)...');
    const inter = GSTCalculationService.calculateGSTSplits({
      taxableAmount: 10000,
      gstRate: 18,
      companyState: 'TAMIL NADU',
      counterpartyState: 'KARNATAKA'
    });
    assert.strictEqual(inter.cgstRate, 0, 'CGST rate must be 0%');
    assert.strictEqual(inter.sgstRate, 0, 'SGST rate must be 0%');
    assert.strictEqual(inter.igstRate, 18, 'IGST rate must be 18%');
    assert.strictEqual(inter.cgstAmount, 0, 'CGST amount must be 0');
    assert.strictEqual(inter.sgstAmount, 0, 'SGST amount must be 0');
    assert.strictEqual(inter.igstAmount, 1800, 'IGST amount must be 1800');
    log('Inter-state GST splits verified successfully!');

    // 2. Report Definitions Structure Validation
    log('Test 3: Verifying Sales Definition fields...');
    assert.strictEqual(SalesDefinition.name, 'Sales Analysis');
    assert.ok(SalesDefinition.columns.find(c => c.field === 'invoice'), 'Sales must have Invoice No column');
    assert.ok(SalesDefinition.columns.find(c => c.field === 'state'), 'Sales must have State column');

    log('Test 4: Verifying Purchase Definition fields...');
    assert.strictEqual(PurchaseDefinition.name, 'Purchase Analysis');
    assert.ok(PurchaseDefinition.columns.find(c => c.field === 'billNo'), 'Purchase must have Bill No column');

    log('Test 5: Verifying GST Definition custom build configuration...');
    assert.strictEqual(GSTDefinition.name, 'GST Analysis');
    assert.strictEqual(typeof GSTDefinition.customBuild, 'function', 'GST must define customBuild');

    log('✅ SPRINT 2 CORE TAX REPORTS TESTS COMPLETED SUCCESSFULLY!');
    require('fs').writeFileSync('sprint2_test_results.log', logs.join('\n') + '\nSUCCESS\n');
  } catch (err) {
    log(`❌ SPRINT 2 TEST FAILED: ${err.message}`);
    log(err.stack);
    require('fs').writeFileSync('sprint2_test_results.log', logs.join('\n') + `\nFAILURE: ${err.message}\n${err.stack}\n`);
  }
}

module.exports = runSprint2Tests;
