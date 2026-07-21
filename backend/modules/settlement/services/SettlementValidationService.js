const { SalesInvoice, VoucherSettlement, PeriodLock, Ledger } = require('../../../models');

class SettlementValidationService {
  /**
   * Centralized Validation Engine for Voucher Settlements
   */
  static async validateAllocation({ companyId, invoiceType, invoiceId, allocatedAmount, settlementDate }) {
    // 1. Amount Validation
    const amount = Number(allocatedAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Allocation amount must be a positive number greater than zero.');
    }

    // 2. Invoice Existence & Status Guard
    let invoice = null;
    if (invoiceType === 'SALES_INVOICE' || invoiceType === 'SalesInvoice') {
      invoice = await SalesInvoice.findOne({
        where: { id: invoiceId }
      });
    }

    if (!invoice) {
      throw new Error(`Target invoice not found (ID: ${invoiceId}).`);
    }

    // 3. Status Check (Prevent settlement on cancelled or written off invoices)
    const invalidStatuses = ['Draft', 'Void', 'CANCELLED', 'Written Off'];
    if (invalidStatuses.includes(invoice.status)) {
      throw new Error(`Cannot allocate payments to an invoice with status '${invoice.status}'.`);
    }

    // 4. Over-Allocation & Outstanding Calculation
    const totalAmount = Number(invoice.totalAmount || invoice.total || 0);
    const amountPaid = Number(invoice.amountPaid || invoice.settledAmount || 0);
    const remainingOutstanding = Math.max(0, totalAmount - amountPaid);

    if (amount > remainingOutstanding + 0.01) { // 1 cent buffer for floating point rounding
      throw new Error(
        `Allocation amount (₹${amount.toLocaleString('en-IN')}) exceeds the invoice outstanding balance (₹${remainingOutstanding.toLocaleString('en-IN')}).`
      );
    }

    // 5. Period Locking Verification
    const lockDate = settlementDate ? new Date(settlementDate) : new Date();
    const isLocked = await PeriodLock.findOne({
      where: {
        companyId,
        isLocked: true
      }
    });

    if (isLocked && isLocked.lockDate && lockDate <= new Date(isLocked.lockDate)) {
      throw new Error(`Financial period prior to ${new Date(isLocked.lockDate).toLocaleDateString()} is locked. Settlement allocation rejected.`);
    }

    return {
      valid: true,
      invoice,
      totalAmount,
      amountPaid,
      remainingOutstanding
    };
  }
}

module.exports = SettlementValidationService;
