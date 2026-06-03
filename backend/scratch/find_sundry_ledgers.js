const { Ledger, Group, Transaction, Voucher } = require('../models');

async function checkGenericLedgers() {
  try {
    const debtorsLedger = await Ledger.findOne({
      where: { name: 'Sundry Debtors' }
    });
    
    const creditorsLedger = await Ledger.findOne({
      where: { name: 'Sundry Creditors' }
    });

    console.log('Debtors Ledger ID:', debtorsLedger?.id);
    console.log('Creditors Ledger ID:', creditorsLedger?.id);

    if (debtorsLedger) {
      const txs = await Transaction.findAll({ where: { LedgerId: debtorsLedger.id }, include: [Voucher] });
      console.log(`Transactions pointing to generic Sundry Debtors: ${txs.length}`);
      txs.forEach(t => {
        console.log(`  Tx ${t.id} - Dr: ${t.debit}, Cr: ${t.credit}, Voucher: ${t.Voucher?.voucherNumber} (${t.Voucher?.voucherType})`);
      });
    }

    if (creditorsLedger) {
      const txs = await Transaction.findAll({ where: { LedgerId: creditorsLedger.id }, include: [Voucher] });
      console.log(`Transactions pointing to generic Sundry Creditors: ${txs.length}`);
      txs.forEach(t => {
        console.log(`  Tx ${t.id} - Dr: ${t.debit}, Cr: ${t.credit}, Voucher: ${t.Voucher?.voucherNumber} (${t.Voucher?.voucherType})`);
      });
    }
    
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkGenericLedgers();
