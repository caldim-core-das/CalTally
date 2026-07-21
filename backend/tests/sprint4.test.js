const assert = require('assert');
const SnapshotService = require('../modules/financial-closing/services/SnapshotService');
const AuditLedgerService = require('../modules/financial-closing/services/AuditLedgerService');
const { Company, ReportSnapshot } = require('../models');

async function runSprint4Tests() {
  const logs = [];
  const log = (msg) => {
    console.log(`[TEST-LOG-SPRINT4] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  log('Starting Sprint 4 Snapshots & Audit Trail Tests...');

  try {
    const company = await Company.findOne();
    if (!company) {
      log('No company record found, skipping execution tests');
      return;
    }

    const companyId = company.id;

    // Clean any old test snapshots
    await ReportSnapshot.destroy({ where: { CompanyId: companyId } });

    // 1. Write genesis block (Block 1)
    log('Test 1: Writing first report snapshot (Block 1)...');
    const snap1 = await SnapshotService.createSnapshot({
      companyId,
      reportType: 'TrialBalance',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      reportPayload: { testMetric: 42000 },
      userId: null
    });

    assert.ok(snap1.id, 'Block 1 created');
    assert.strictEqual(snap1.snapshotData.auditEnvelope.index, 1, 'Block 1 index is 1');
    assert.strictEqual(snap1.snapshotData.auditEnvelope.previousHash, '0000000000000000000000000000000000000000000000000000000000000000', 'Genesis hash matches');

    // 2. Write Block 2 linked to Block 1
    log('Test 2: Writing second report snapshot (Block 2)...');
    const snap2 = await SnapshotService.createSnapshot({
      companyId,
      reportType: 'TrialBalance',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      reportPayload: { testMetric: 58000 },
      userId: null
    });

    assert.strictEqual(snap2.snapshotData.auditEnvelope.index, 2, 'Block 2 index is 2');
    assert.strictEqual(snap2.snapshotData.auditEnvelope.previousHash, snap1.snapshotData.auditEnvelope.hash, 'Block 2 link matches Block 1 hash');

    // 3. Cryptographic Verification check
    log('Test 3: Checking ledger integrity verification passes successfully...');
    const verifyPass = await SnapshotService.verifyChainIntegrity(companyId);
    assert.strictEqual(verifyPass.isValid, true, 'Integrity verification succeeds');
    assert.strictEqual(verifyPass.verifiedCount, 2, 'Two blocks verified');

    // 4. Tampering detection check
    log('Test 4: Artificially tampering with Block 1 data to verify detect capabilities...');
    // Fetch directly from database and modify JSON payload bypassing service encapsulation
    const rawRecord = await ReportSnapshot.findByPk(snap1.id);
    const tamperedData = rawRecord.snapshotData;
    tamperedData.reportPayload.testMetric = 999999; // Malicious modification
    
    // Bypassing setter to save raw modified string
    await ReportSnapshot.update(
      { snapshotData: JSON.stringify(tamperedData) },
      { where: { id: snap1.id } }
    );

    // Verify verification engine detects the payload edit and rejects it
    await assert.rejects(async () => {
      await SnapshotService.verifyChainIntegrity(companyId);
    }, /Data Tampering Detected/, 'Engine must throw anomaly exception on tampered records');
    log('Tampering detected correctly by the audit service!');

    // 5. AuditLedgerService checks
    log('Test 5: Testing export audit log trail...');
    const event1 = await AuditLedgerService.logEvent({
      companyId,
      userId: null,
      action: 'EXPORT_EXCEL',
      reportType: 'gst',
      details: { exportRows: 12 }
    });
    assert.ok(event1.hash, 'Event log hash generated');

    const verifyAudit = await AuditLedgerService.verifyAuditTrail();
    assert.strictEqual(verifyAudit.isValid, true, 'Audit log verification succeeds');

    // 6. Voucher Period Lock Enforcement tests
    log('Test 6: Verifying Voucher database Period Lock enforcement hooks...');
    const { FinancialPeriod, Voucher } = require('../models');
    
    // Clean old periods covering test date
    await FinancialPeriod.destroy({ where: { CompanyId: companyId } });

    // Create a locked period
    const fp = await FinancialPeriod.create({
      CompanyId: companyId,
      periodName: 'July 2026 Test',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-31'),
      isLocked: true
    });

    // Try to create voucher in locked period - must fail
    await assert.rejects(async () => {
      await Voucher.create({
        CompanyId: companyId,
        voucherType: 'Journal',
        date: new Date('2026-07-15'),
        voucherNumber: 'V-LOCKED-01',
        narration: 'This should fail'
      });
    }, /Cannot create or modify transaction voucher in locked financial period/, 'Locked period must block voucher creation');
    log('Voucher creation correctly blocked in locked period!');

    // Unlock period
    await fp.update({ isLocked: false });

    // Retry creation - must succeed
    const v2 = await Voucher.create({
      CompanyId: companyId,
      voucherType: 'Journal',
      date: new Date('2026-07-15'),
      voucherNumber: 'V-LOCKED-02',
      narration: 'This should pass'
    });
    assert.ok(v2.id, 'Voucher created successfully after unlocking period');
    log('Voucher creation succeeds after unlocking period!');

    log('✅ SPRINT 4 SNAPSHOT & COMPLIANCE TESTS COMPLETED SUCCESSFULLY!');
    require('fs').writeFileSync('sprint4_test_results.log', logs.join('\n') + '\nSUCCESS\n');
  } catch (err) {
    log(`❌ SPRINT 4 TEST FAILED: ${err.message}`);
    log(err.stack);
    require('fs').writeFileSync('sprint4_test_results.log', logs.join('\n') + `\nFAILURE: ${err.message}\n${err.stack}\n`);
  }
}

module.exports = runSprint4Tests;
