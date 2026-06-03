const { Transaction, Ledger, Voucher } = require('c:/Users/USER/Tally_accounting/backend/models');
const { Op } = require('sequelize');

async function findGenericTransactions() {
  try {
    const txs = await Transaction.findAll({
      include: [
        {
          model: Ledger,
          where: {
            [Op.or]: [
              { name: { [Op.iLike || Op.like]: '%debtor%' } },
              { name: { [Op.iLike || Op.like]: '%creditor%' } },
              { name: { [Op.iLike || Op.like]: '%sundry%' } },
              { name: { [Op.iLike || Op.like]: '%Debtor%' } },
              { name: { [Op.iLike || Op.like]: '%Creditor%' } },
              { name: { [Op.iLike || Op.like]: '%Sundry%' } }
            ]
          }
        },
        Voucher
      ]
    });

    console.log(`Found ${txs.length} transactions pointing to generic group-like ledgers.`);
    txs.forEach(t => {
      console.log(`- Tx: ID=${t.id}, LedgerName="${t.Ledger?.name}", Debit=${t.debit}, Credit=${t.credit}, VoucherNumber=${t.Voucher?.voucherNumber}, VoucherType=${t.Voucher?.voucherType}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

findGenericTransactions();
