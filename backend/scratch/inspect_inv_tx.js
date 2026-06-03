const { SalesInvoice, Voucher, Transaction, Ledger } = require('../models');

async function findInvoicesAndBills() {
  try {
    const swathi = await Ledger.findOne({ where: { name: 'Swathi N' } });
    const thejaa = await Ledger.findOne({ where: { name: 'Ms. Thejaa K t' } });

    console.log('Swathi ID:', swathi?.id);
    console.log('Thejaa ID:', thejaa?.id);

    if (swathi) {
      const swathiInvoices = await SalesInvoice.findAll({ where: { customerLedgerId: swathi.id } });
      console.log(`\nFound ${swathiInvoices.length} Sales Invoices for Swathi`);
      for (const inv of swathiInvoices) {
        console.log(` Invoice: ${inv.invoiceNumber}, total: ${inv.totalAmount}, VoucherId: ${inv.VoucherId}`);
        if (inv.VoucherId) {
          const v = await Voucher.findByPk(inv.VoucherId, { include: [Transaction] });
          v.Transactions.forEach(t => {
            console.log(`   Tx Dr: ${t.debit}, Cr: ${t.credit}, LedgerId: ${t.LedgerId}`);
          });
        }
      }
    }

    if (thejaa) {
      // Find bills for Thejaa
      // Purchase bills don't have supplierLedgerId on the Voucher directly, 
      // but let's check narration or transactions
      const bills = await Voucher.findAll({ where: { voucherType: 'Purchase' }, include: [Transaction] });
      console.log(`\nFound ${bills.length} Purchase Bills overall`);
      for (const b of bills) {
        let isThejaa = false;
        if (b.narration && b.narration.includes('Thejaa')) isThejaa = true;
        b.Transactions.forEach(t => {
          if (t.LedgerId === thejaa.id) isThejaa = true;
        });

        if (isThejaa) {
          console.log(` Bill: ${b.voucherNumber}, Narration: ${b.narration}`);
          b.Transactions.forEach(t => {
            console.log(`   Tx Dr: ${t.debit}, Cr: ${t.credit}, LedgerId: ${t.LedgerId}`);
          });
        }
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

findInvoicesAndBills();
