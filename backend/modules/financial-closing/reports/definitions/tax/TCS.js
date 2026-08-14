const TDSCalculationService = require('../../../services/TDSCalculationService');

const TCSDefinition = {
  name: 'TCS Analysis',
  columns: [
    { field: 'invoice', label: 'Invoice No' },
    { field: 'customer', label: 'Customer' },
    { field: 'amount', label: 'Gross Amount', align: 'right', format: (val) => val.toFixed(2) },
    { field: 'tcs', label: 'TCS Collected', align: 'right', format: (val) => val.toFixed(2) }
  ],
  customBuild: async (filters) => {
    const { companyId, fromDate, toDate } = filters;
    const summary = await TDSCalculationService.getTCSSummary({ companyId, fromDate, toDate });

    const rows = summary.invoices.map(inv => ({
      invoice: inv.invoiceNumber,
      customer: inv.CustomerLedger ? inv.CustomerLedger.name : 'Unknown Customer',
      amount: Number(inv.subTotal) || 0,
      tcs: Number(inv.tcsAmount) || 0,
      voucherId: inv.VoucherId || null
    }));

    return {
      metadata: {
        reportName: 'TCS Analysis',
        companyId,
        fromDate,
        toDate,
        generatedAt: new Date().toISOString(),
        columns: TCSDefinition.columns
      },
      kpis: {
        applicableSales: summary.totalSales,
        tcsCollected: summary.totalTCS,
        pendingCollection: 0.0
      },
      rows
    };
  }
};

module.exports = TCSDefinition;
