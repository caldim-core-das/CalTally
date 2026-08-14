const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const modelsDir = path.join(__dirname, 'models');
const jscodeshiftPath = path.join(__dirname, 'node_modules', '.bin', 'jscodeshift');
const transformPath = path.join(__dirname, 'transform.js');

const schemaMapping = {
  // identity_tenant
  'user': 'identity_tenant',
  'role': 'identity_tenant',
  'permission': 'identity_tenant',
  'company': 'identity_tenant',
  'userCompany': 'identity_tenant',
  'subscriptionPlan': 'identity_tenant',
  'companySubscription': 'identity_tenant',
  'customRole': 'identity_tenant',
  'refreshToken': 'identity_tenant',
  'mfaSecret': 'identity_tenant',
  'appNotification': 'identity_tenant',
  'systemMail': 'identity_tenant',
  'supportTicket': 'identity_tenant',

  // ledger
  'ledger': 'ledger',
  'group': 'ledger',
  'voucher': 'ledger',
  'transaction': 'ledger',
  'costCenter': 'ledger',
  'costCategory': 'ledger',
  'costCenterAllocation': 'ledger',
  'currency': 'ledger',
  'financialPeriod': 'ledger',
  'fiscalYear': 'ledger',
  'periodLock': 'ledger',
  'ledgerReconciliationLog': 'ledger',

  // inventory
  'item': 'inventory',
  'stockGroup': 'inventory',
  'stockCategory': 'inventory',
  'unitOfMeasure': 'inventory',
  'godown': 'inventory',
  'stockMovement': 'inventory',
  'pricelist': 'inventory',

  // sales
  'salesOrder': 'sales',
  'salesOrderItem': 'sales',
  'salesInvoice': 'sales',
  'salesInvoiceItem': 'sales',
  'creditNote': 'sales',
  'creditNoteItem': 'sales',
  'quote': 'sales',
  'deliveryChallan': 'sales',
  'deliveryChallanItem': 'sales',
  'recurringInvoice': 'sales',
  'retainerInvoice': 'sales',
  'retainerAdjustment': 'sales',

  // purchases
  'purchaseOrder': 'purchases',
  'vendorCredit': 'purchases',
  'vendorCreditItem': 'purchases',
  'recurringExpense': 'purchases',

  // bankFeed
  'bankTransaction': 'bank_feed',
  'bankFeedConsent': 'bank_feed',
  'bankFeedAccount': 'bank_feed',

  // payment
  'paymentGateway': 'payment',
  'paymentTransaction': 'payment',
  'invoicePayment': 'payment',
  'paymentWebhookLog': 'payment',

  // payroll
  'employee': 'payroll',
  'attendance': 'payroll',
  'salarySlip': 'payroll',
  'salaryComponent': 'payroll',
  'salaryStructure': 'payroll',
  'salaryStructureComponent': 'payroll',
  'employeeSalaryAssignment': 'payroll',
  'payrollSettings': 'payroll',

  // manufacturing
  'bom': 'manufacturing',
  'bomItem': 'manufacturing',
  'productionOrder': 'manufacturing',

  // reports
  'savedReport': 'reports',
  'reportSnapshot': 'reports',
  'audit': 'reports',

  // fixed_assets
  'fixedAsset': 'fixed_assets',
  'depreciationLog': 'fixed_assets',

  // budgeting
  'budget': 'budgeting',
  'budgetItem': 'budgeting',

  // time_tracking
  'project': 'time_tracking',
  'projectTask': 'time_tracking',
  'projectUser': 'time_tracking',
  'timesheet': 'time_tracking',

  // tax
  'tdsEntry': 'tax',

  // core
  'processedEvent': 'core'
};

const schemaGroups = {};
for (const [modelName, schema] of Object.entries(schemaMapping)) {
  if (!schemaGroups[schema]) schemaGroups[schema] = [];
  
  const fileName = `${modelName}.model.js`;
  const fullPath = path.join(modelsDir, fileName);
  if (fs.existsSync(fullPath)) {
    schemaGroups[schema].push(fullPath);
  }
}

let jscodeshiftCmd = 'jscodeshift';
if (process.platform === 'win32') {
  jscodeshiftCmd = 'npx jscodeshift';
}

for (const [schema, files] of Object.entries(schemaGroups)) {
  if (files.length === 0) continue;
  
  const filesArg = files.map(f => `"${f}"`).join(' ');
  const cmd = `${jscodeshiftCmd} -t "${transformPath}" --schema="${schema}" ${filesArg}`;
  console.log(`Applying schema '${schema}' to ${files.length} files...`);
  try {
    const out = execSync(cmd, { stdio: 'pipe' });
    // console.log(out.toString());
  } catch (e) {
    console.error(`Error applying schema ${schema}:`, e.stdout?.toString(), e.stderr?.toString());
  }
}

console.log('Finished applying schemas via jscodeshift.');
