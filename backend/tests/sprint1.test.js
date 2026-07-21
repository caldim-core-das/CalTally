const assert = require('assert');
const ReportRegistry = require('../modules/financial-closing/engine/ReportRegistry');
const WorkflowEngine = require('../modules/financial-closing/engine/WorkflowEngine');
const ReportEngine = require('../modules/financial-closing/engine/ReportEngine');

async function runSprint1Tests() {
  const logs = [];
  const log = (msg) => {
    console.log(`[TEST-LOG-SPRINT1] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  log('Starting Sprint 1 FCCF Engine Tests...');

  try {
    // 1. ReportRegistry Tests
    log('Test 1: Verifying ReportRegistry configuration mapping...');
    const allReports = ReportRegistry.getAllReports();
    assert.ok(allReports.length >= 3, 'Registry must load report definitions');
    
    const salesReport = ReportRegistry.getReport('sales');
    assert.strictEqual(salesReport.name, 'Sales Analysis', 'Sales registry metadata should match');
    assert.ok(salesReport.permissions.includes('report:view'), 'Permissions array mapped');
    log('ReportRegistry test passed successfully!');

    // 2. WorkflowEngine Tests
    log('Test 2: Verifying WorkflowEngine state transitions & role constraints...');
    
    // Legal transition check
    const step1 = WorkflowEngine.validateTransition('DRAFT', 'REVIEWED', 'ACCOUNTANT');
    assert.ok(step1, 'Draft -> Reviewed transition must succeed');

    // Illegal transition check (Invalid path)
    assert.throws(() => {
      WorkflowEngine.validateTransition('LOCKED', 'APPROVED', 'ADMIN');
    }, /Invalid state transition/, 'Locked -> Approved transition must fail');

    // Role lock check (Accountant trying to lock period)
    assert.throws(() => {
      WorkflowEngine.validateTransition('APPROVED', 'LOCKED', 'ACCOUNTANT');
    }, /Security Error/, 'Accountant role must not be allowed to lock period');

    // Admin role locking period
    const adminLock = WorkflowEngine.validateTransition('APPROVED', 'LOCKED', 'ADMIN');
    assert.ok(adminLock, 'Admin role must be allowed to lock period');
    log('WorkflowEngine state constraints test passed successfully!');

    // 3. ReportEngine Compilation Verification
    log('Test 3: Verifying ReportEngine query orchestrator with Mock definition...');
    const mockDefinition = {
      name: 'Mock Sales Analysis',
      columns: [{ field: 'invoice', label: 'Invoice' }, { field: 'amount', label: 'Amount' }],
      repository: {
        getSalesForPeriod: async () => [
          { invoiceNumber: 'INV-100', totalAmount: 5000, date: new Date() },
          { invoiceNumber: 'INV-101', totalAmount: 12000, date: new Date() }
        ]
      },
      formatter: (row) => ({
        invoice: row.invoiceNumber,
        amount: row.totalAmount
      }),
      compileKPIs: (rows) => ({
        total: rows.reduce((sum, r) => sum + r.amount, 0)
      })
    };

    const reportOutput = await ReportEngine.buildReport(mockDefinition, {
      companyId: 'a8e00bd6-7ff5-47d9-9a74-951950f69b5d',
      fromDate: '2026-01-01',
      toDate: '2026-12-31'
    });

    assert.strictEqual(reportOutput.metadata.reportName, 'Mock Sales Analysis', 'Metadata report name matches');
    assert.strictEqual(reportOutput.rows.length, 2, 'Row counts match formatted database records');
    assert.strictEqual(reportOutput.kpis.total, 17000, 'Aggregations sum correctly');
    log('ReportEngine mock compiler test passed successfully!');

    log('✅ SPRINT 1 ENGINES TESTS COMPLETED SUCCESSFULLY!');
    require('fs').writeFileSync('sprint1_test_results.log', logs.join('\n') + '\nSUCCESS\n');
  } catch (err) {
    log(`❌ SPRINT 1 TEST FAILED: ${err.message}`);
    log(err.stack);
    require('fs').writeFileSync('sprint1_test_results.log', logs.join('\n') + `\nFAILURE: ${err.message}\n${err.stack}\n`);
  }
}

module.exports = runSprint1Tests;
