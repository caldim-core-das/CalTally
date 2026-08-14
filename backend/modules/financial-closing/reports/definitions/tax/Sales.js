const SalesRepository = require('../../../repositories/SalesRepository');

function parseStateFromAddress(address) {
  if (!address) return 'N/A';
  // Standard Indian state matches (Tamil Nadu, Karnataka, Delhi, Maharashtra, etc.)
  const states = ['tamil nadu', 'karnataka', 'maharashtra', 'delhi', 'telangana', 'kerala', 'gujarat'];
  const normalized = address.toLowerCase();
  for (const state of states) {
    if (normalized.includes(state)) {
      return state.toUpperCase();
    }
  }
  return 'TAMIL NADU'; // Default fallback matching company registration
}

const SalesDefinition = {
  name: 'Sales Analysis',
  columns: [
    { field: 'invoice', label: 'Invoice No' },
    { field: 'customer', label: 'Customer' },
    { field: 'date', label: 'Date' },
    { field: 'taxable', label: 'Taxable Amount', align: 'right', format: (val) => val.toFixed(2) },
    { field: 'gst', label: 'GST', align: 'right', format: (val) => val.toFixed(2) },
    { field: 'total', label: 'Total', align: 'right', format: (val) => val.toFixed(2) },
    { field: 'state', label: 'State' }
  ],
  repository: SalesRepository,
  formatter: (row) => ({
    invoice: row.invoiceNumber,
    customer: row.CustomerLedger ? row.CustomerLedger.name : 'Unknown Customer',
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : 'N/A',
    taxable: Number(row.subTotal) || 0,
    gst: Number(row.gstAmount) || 0,
    total: Number(row.totalAmount) || 0,
    state: parseStateFromAddress(row.deliveryAddress),
    voucherId: row.VoucherId || null
  }),
  compileKPIs: (rows) => {
    const totalTaxable = rows.reduce((sum, r) => sum + r.taxable, 0);
    const totalGST = rows.reduce((sum, r) => sum + r.gst, 0);
    const totalSales = rows.reduce((sum, r) => sum + r.total, 0);

    return {
      totalTaxable,
      totalGST,
      totalSales
    };
  }
};

module.exports = SalesDefinition;
