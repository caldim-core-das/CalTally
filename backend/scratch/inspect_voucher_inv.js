const { SalesInvoice, Voucher, Transaction, Ledger } = require('c:/Users/USER/Tally_accounting/backend/models');

async function inspectVoucherInvoices() {
  try {
    const invoices = await SalesInvoice.findAll({
      where: { VoucherId: { [require('sequelize').Op.ne]: null } },
      include: [{ model: Ledger, as: 'CustomerLedger' }]
    });
    
    console.log(`Found ${invoices.length} invoices with VoucherId.`);
    for (const inv of invoices) {
      console.log(`\nInvoice: ${inv.invoiceNumber}, ID: ${inv.id}, customerLedgerId: ${inv.customerLedgerId} (${inv.CustomerLedger?.name})`);

      const transactions = await Transaction.findAll({
        where: { VoucherId: inv.VoucherId },
        include: [Ledger]
      });
      console.log('Transaction Lines:');
      transactions.forEach(t => {
        console.log(`- Tx: LedgerId=${t.LedgerId} (${t.Ledger?.name} | groupName=${t.Ledger?.groupName}), Debit=${t.debit}, Credit=${t.credit}`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

inspectVoucherInvoices();
