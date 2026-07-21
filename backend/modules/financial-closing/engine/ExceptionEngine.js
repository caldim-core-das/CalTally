const SalesRepository = require('../repositories/SalesRepository');
const PurchaseRepository = require('../repositories/PurchaseRepository');
const TDSCalculationService = require('../services/TDSCalculationService');

class ExceptionEngine {
  /**
   * Scans a company's ledger and vouchers for a given period to identify compliance exceptions.
   */
  static async runDiagnostics({ companyId, fromDate, toDate }) {
    const exceptions = [];

    // 1. Fetch Sales & Purchases datasets
    const sales = await SalesRepository.getSalesForPeriod({ companyId, fromDate, toDate });
    const purchases = await PurchaseRepository.getPurchasesForPeriod({ companyId, fromDate, toDate });

    // 2. Validate Sales Invoices
    sales.forEach(inv => {
      // Rule 1: Missing GSTIN (Critical)
      const customerGstin = inv.CustomerLedger ? inv.CustomerLedger.gstin : null;
      if (!customerGstin) {
        exceptions.push({
          severity: 'critical',
          module: 'Sales',
          voucherId: inv.VoucherId,
          message: `Compliance Violation: GSTIN is missing for Customer '${inv.CustomerLedger ? inv.CustomerLedger.name : 'Unknown'}' on Sales Invoice ${inv.invoiceNumber}.`
        });
      }

      // Rule 2: Missing Address (Low)
      if (!inv.deliveryAddress || inv.deliveryAddress.trim() === '') {
        exceptions.push({
          severity: 'low',
          module: 'Sales',
          voucherId: inv.VoucherId,
          message: `Address Missing: Delivery address is not specified on Sales Invoice ${inv.invoiceNumber}.`
        });
      }

      // Rule 3: Missing HSN (Medium)
      if (inv.items) {
        inv.items.forEach(item => {
          if (!item.hsnCode && !item.hsn) {
            exceptions.push({
              severity: 'medium',
              module: 'Sales',
              voucherId: inv.VoucherId,
              message: `HSN Missing: HSN/SAC code is missing for item line on Sales Invoice ${inv.invoiceNumber}.`
            });
          }
        });
      }
    });

    // 3. Validate Purchase Bills
    purchases.forEach(bill => {
      let supplierLedger = null;
      if (bill.Transactions) {
        bill.Transactions.forEach(t => {
          if (t.credit > 0 && t.Ledger) {
            supplierLedger = t.Ledger;
          }
        });
      }

      // Rule 4: PAN Missing for Supplier (High)
      const pan = supplierLedger ? supplierLedger.pan : null;
      if (!pan) {
        exceptions.push({
          severity: 'high',
          module: 'Purchase',
          voucherId: bill.id,
          message: `PAN Missing: Permanent Account Number (PAN) is missing for Supplier '${supplierLedger ? supplierLedger.name : 'Unknown'}' on Bill ${bill.voucherNumber}.`
        });
      }

      // Rule 5: Draft Status Bill (Medium)
      if (bill.status && (bill.status.toUpperCase() === 'DRAFT' || bill.status.toLowerCase() === 'draft')) {
        exceptions.push({
          severity: 'medium',
          module: 'Purchase',
          voucherId: bill.id,
          message: `Unposted Bill: Purchase Bill ${bill.voucherNumber} is currently in DRAFT status.`
        });
      }
    });

    // 4. Run TDS Threshold Warnings
    const tdsWarnings = await TDSCalculationService.auditTDSThresholds({ companyId, fromDate, toDate });
    exceptions.push(...tdsWarnings);

    // Sort exceptions by severity priority
    const priority = { critical: 4, high: 3, medium: 2, low: 1 };
    return exceptions.sort((a, b) => priority[b.severity] - priority[a.severity]);
  }
}

module.exports = ExceptionEngine;
