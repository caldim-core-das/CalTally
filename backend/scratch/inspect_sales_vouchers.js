const { Voucher, Transaction, Ledger } = require('c:/Users/USER/Tally_accounting/backend/models');

async function inspectSalesVouchers() {
  try {
    const vouchers = await Voucher.findAll({
      where: { voucherType: 'Sales' },
      include: [{ model: Transaction, include: [Ledger] }]
    });

    console.log(`Found ${vouchers.length} Sales vouchers.`);
    vouchers.forEach(v => {
      console.log(`\nVoucher: ${v.voucherNumber}, ID: ${v.id}, Date: ${v.date}, Narration: ${v.narration}`);
      if (v.Transactions) {
        v.Transactions.forEach(t => {
          console.log(`  - Line: LedgerId=${t.LedgerId} (${t.Ledger?.name} | groupName=${t.Ledger?.groupName}), Debit=${t.debit}, Credit=${t.credit}`);
        });
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

inspectSalesVouchers();
