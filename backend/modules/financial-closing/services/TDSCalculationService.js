const { TdsEntry, SalesInvoice, Ledger, Voucher, Transaction } = require('../../../models');
const { Op } = require('sequelize');

class TDSCalculationService {
  /**
   * Aggregates TDS entries from the TdsEntry table for a period.
   */
  static async getTDSSummary({ companyId, fromDate, toDate }) {
    if (!companyId) {
      throw new Error('Company ID is required to fetch TDS summary.');
    }

    const entries = await TdsEntry.findAll({
      where: {
        CompanyId: companyId
      },
      include: [
        {
          model: Ledger,
          as: 'Vendor'
        },
        {
          model: Voucher,
          as: 'PaymentVoucher',
          where: {
            date: {
              [Op.between]: [new Date(fromDate), new Date(toDate)]
            },
            status: {
              [Op.notIn]: ['DRAFT', 'VOID', 'CANCELLED']
            }
          }
        }
      ]
    });

    const totalGross = entries.reduce((sum, e) => sum + (Number(e.grossAmount) || 0), 0);
    const totalTDS = entries.reduce((sum, e) => sum + (Number(e.tdsAmount) || 0), 0);

    return {
      entries,
      totalGross,
      totalTDS
    };
  }

  /**
   * Aggregates TCS details from SalesInvoice records for a period.
   */
  static async getTCSSummary({ companyId, fromDate, toDate }) {
    if (!companyId) {
      throw new Error('Company ID is required to fetch TCS summary.');
    }

    const invoices = await SalesInvoice.findAll({
      where: {
        CompanyId: companyId,
        tcsApplicable: true,
        date: {
          [Op.between]: [new Date(fromDate), new Date(toDate)]
        },
        status: {
          [Op.notIn]: ['Draft', 'Void']
        }
      },
      include: [
        {
          model: Ledger,
          as: 'CustomerLedger'
        }
      ]
    });

    const totalSales = invoices.reduce((sum, inv) => sum + (Number(inv.subTotal) || 0), 0);
    const totalTCS = invoices.reduce((sum, inv) => sum + (Number(inv.tcsAmount) || 0), 0);

    return {
      invoices,
      totalSales,
      totalTCS
    };
  }

  /**
   * Audits general ledger purchases against TDS entries to identify compliance warnings
   * (e.g. cumulative supplier purchases crossing 194C thresholds without TDS deduction).
   */
  static async auditTDSThresholds({ companyId, fromDate, toDate }) {
    const yearStart = new Date(new Date(fromDate).getFullYear(), 3, 1); // April 1st
    
    // Find all purchase vouchers in the financial year
    const purchases = await Voucher.findAll({
      where: {
        CompanyId: companyId,
        voucherType: 'Purchase',
        date: {
          [Op.between]: [yearStart, new Date(toDate)]
        },
        status: {
          [Op.notIn]: ['DRAFT', 'VOID', 'CANCELLED']
        }
      },
      include: [
        {
          model: Transaction,
          include: [{ model: Ledger }]
        }
      ]
    });

    const supplierTotals = {};
    purchases.forEach(v => {
      let supplierId = null;
      let amount = 0;
      v.Transactions.forEach(t => {
        if (t.credit > 0) {
          supplierId = t.LedgerId;
          amount = Number(t.credit) || 0;
        }
      });

      if (supplierId) {
        if (!supplierTotals[supplierId]) {
          supplierTotals[supplierId] = { supplierId, total: 0, vouchers: [] };
        }
        supplierTotals[supplierId].total += amount;
        supplierTotals[supplierId].vouchers.push({ id: v.id, amount, number: v.voucherNumber });
      }
    });

    const warnings = [];
    for (const id of Object.keys(supplierTotals)) {
      const sup = supplierTotals[id];
      // 194C Threshold checks: single bill > 30k OR cumulative > 1Lakh
      const crossedSingle = sup.vouchers.some(v => v.amount > 30000);
      const crossedCumulative = sup.total > 100000;

      if (crossedSingle || crossedCumulative) {
        // Verify if TDS entry exists
        const tdsRecorded = await TdsEntry.findOne({
          where: {
            CompanyId: companyId,
            vendorId: id
          }
        });

        if (!tdsRecorded) {
          warnings.push({
            severity: 'high',
            module: 'TDS',
            voucherId: sup.vouchers[0].id,
            message: `TDS Warning: Supplier has crossed the 194C threshold (Cumulative: ${sup.total}, Limit: 1,00,000) but no TDS deduction was logged.`
          });
        }
      }
    }

    return warnings;
  }
}

module.exports = TDSCalculationService;
