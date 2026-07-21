const TDSCalculationService = require('../../../services/TDSCalculationService');

const TDSDefinition = {
  name: 'TDS Analysis',
  columns: [
    { field: 'voucher', label: 'Voucher' },
    { field: 'supplier', label: 'Supplier' },
    { field: 'section', label: 'Section' },
    { field: 'amount', label: 'Amount', align: 'right', format: (val) => val.toFixed(2) },
    { field: 'tds', label: 'TDS Deducted', align: 'right', format: (val) => val.toFixed(2) },
    { field: 'pan', label: 'PAN' }
  ],
  customBuild: async (filters) => {
    const { companyId, fromDate, toDate } = filters;
    const summary = await TDSCalculationService.getTDSSummary({ companyId, fromDate, toDate });

    const rows = summary.entries.map(e => ({
      voucher: e.PaymentVoucher ? e.PaymentVoucher.voucherNumber : 'N/A',
      supplier: e.Vendor ? e.Vendor.name : 'Unknown Supplier',
      section: e.tdsSection,
      amount: Number(e.grossAmount) || 0,
      tds: Number(e.tdsAmount) || 0,
      pan: e.pan || 'N/A',
      voucherId: e.paymentVoucherId
    }));

    return {
      metadata: {
        reportName: 'TDS Analysis',
        companyId,
        fromDate,
        toDate,
        generatedAt: new Date().toISOString(),
        columns: TDSDefinition.columns
      },
      kpis: {
        applicablePurchases: summary.totalGross,
        tdsDeducted: summary.totalTDS,
        pendingDeduction: 0.0
      },
      rows
    };
  }
};

module.exports = TDSDefinition;
