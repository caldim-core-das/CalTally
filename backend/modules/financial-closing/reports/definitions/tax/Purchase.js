const PurchaseRepository = require('../../../repositories/PurchaseRepository');

const PurchaseDefinition = {
  name: 'Purchase Analysis',
  columns: [
    { field: 'billNo', label: 'Bill No' },
    { field: 'supplier', label: 'Supplier' },
    { field: 'date', label: 'Date' },
    { field: 'taxable', label: 'Taxable Amount', align: 'right', format: (val) => val.toFixed(2) },
    { field: 'gst', label: 'GST Paid', align: 'right', format: (val) => val.toFixed(2) },
    { field: 'total', label: 'Total', align: 'right', format: (val) => val.toFixed(2) }
  ],
  repository: PurchaseRepository,
  formatter: (row) => {
    let taxable = 0;
    let gst = 0;
    let total = 0;
    let supplier = 'Unknown Supplier';

    if (row.Transactions) {
      row.Transactions.forEach(t => {
        const ledgerName = t.Ledger ? t.Ledger.name.toLowerCase() : '';
        const isTaxLedger = ledgerName.includes('cgst') || ledgerName.includes('sgst') || ledgerName.includes('igst') || ledgerName.includes('gst');
        
        const creditVal = Number(t.credit) || 0;
        const debitVal = Number(t.debit) || 0;

        if (creditVal > 0) {
          total = creditVal;
          supplier = t.Ledger ? t.Ledger.name : 'Supplier Ledger';
        } else if (debitVal > 0) {
          if (isTaxLedger) {
            gst += debitVal;
          } else {
            taxable += debitVal;
          }
        }
      });
    }

    return {
      billNo: row.voucherNumber,
      supplier,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : 'N/A',
      taxable: taxable || Math.max(0, total - gst),
      gst,
      total: total > 0 ? total : (taxable + gst),
      voucherId: row.id
    };
  },
  compileKPIs: (rows) => {
    const totalTaxable = rows.reduce((sum, r) => sum + r.taxable, 0);
    const totalGST = rows.reduce((sum, r) => sum + r.gst, 0);
    const totalPurchase = rows.reduce((sum, r) => sum + r.total, 0);

    return {
      totalTaxable,
      totalGST,
      totalPurchase
    };
  }
};

module.exports = PurchaseDefinition;
