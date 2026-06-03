const { SalesInvoice, Ledger } = require('c:/Users/USER/Tally_accounting/backend/models');

async function checkInvoices() {
  try {
    const invoices = await SalesInvoice.findAll({
      include: [{ model: Ledger, as: 'CustomerLedger' }]
    });

    console.log('--- Sales Invoices ---');
    for (const inv of invoices) {
      console.log(`Invoice: ${inv.invoiceNumber}, ID: ${inv.id}, customerLedgerId: ${inv.customerLedgerId}, CustomerLedgerName: ${inv.CustomerLedger?.name || 'NONE'}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkInvoices();
