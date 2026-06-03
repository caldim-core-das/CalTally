const { Ledger, Group, Transaction, Voucher } = require('../models');
const { Op } = require('sequelize');

async function inspectCapitalAccount() {
  try {
    const ledgers = await Ledger.findAll({
      include: [
        { model: Group, attributes: ['name', 'nature'] },
        { model: Transaction }
      ],
      where: {
        name: { [Op.like]: '%Capital%' }
      }
    });

    for (const l of ledgers) {
      console.log(`\nLedger: ${l.name}`);
      console.log(`Group: ${l.Group ? l.Group.name : 'None'} (Nature: ${l.Group ? l.Group.nature : 'None'})`);
      console.log(`Opening Balance: ${l.openingBalance} ${l.openingBalanceType}`);
      console.log(`Transactions Count: ${l.Transactions.length}`);
      
      let totalDr = 0;
      let totalCr = 0;
      for (const t of l.Transactions) {
        totalDr += parseFloat(t.debit || 0);
        totalCr += parseFloat(t.credit || 0);
      }
      console.log(`Calculated Total Dr: ${totalDr}, Total Cr: ${totalCr}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

inspectCapitalAccount();
