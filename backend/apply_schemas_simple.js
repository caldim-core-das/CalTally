const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');

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

const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.model.js'));

let updatedCount = 0;

for (const file of files) {
  const modelName = file.replace('.model.js', '');
  const targetSchema = schemaMapping[modelName];

  if (!targetSchema) continue;

  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes(`schema: '`)) continue;

  if (content.includes('timestamps:')) {
    content = content.replace(/timestamps:/g, `schema: '${targetSchema}',\n    timestamps:`);
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
  } else if (content.includes('tableName:')) {
    content = content.replace(/tableName:/g, `schema: '${targetSchema}',\n    tableName:`);
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
  } else {
    const lastIndex = content.lastIndexOf('});');
    if (lastIndex !== -1) {
      content = content.substring(0, lastIndex) + `}, { schema: '${targetSchema}' });` + content.substring(lastIndex + 3);
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
    }
  }
}

console.log(`Successfully updated ${updatedCount} models with schema namespaces.`);
