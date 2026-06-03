const { Ledger, Transaction, Voucher } = require('c:/Users/USER/Tally_accounting/backend/models');

async function inspectCapital() {
  try {
    const ledgers = await Ledger.findAll({
      where: {
        name: { [require('sequelize').Op.like]: '%Capital%' }
      }
    });

    console.log(`Found ${ledgers.length} Capital ledgers.`);
    for (const l of ledgers) {
      console.log(`- Ledger: ID=${l.id}, Name="${l.name}", Opening=${l.openingBalance} ${l.openingBalanceType}, CompanyId=${l.CompanyId}`);
      const txs = await Transaction.findAll({
        where: { LedgerId: l.id },
        include: [Voucher]
      });
      console.log(`  Transactions: ${txs.length}`);
      txs.forEach(t => {
        console.log(`    - Tx: Debit=${t.debit}, Credit=${t.credit}, VoucherNumber=${t.Voucher?.voucherNumber}`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

inspectCapital();
