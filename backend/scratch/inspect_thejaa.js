const { Ledger, Group, Transaction, Voucher } = require('../models');

async function inspectLedgers() {
  try {
    const ledgers = await Ledger.findAll({
      where: {
        name: ['Swathi N', 'Ms. Thejaa K t']
      },
      include: [
        { model: Group, attributes: ['name', 'nature'] },
        { 
          model: Transaction,
          include: [{ model: Voucher }]
        }
      ]
    });

    for (const l of ledgers) {
      console.log(`\nLedger: ${l.name}`);
      console.log(`Group: ${l.Group ? l.Group.name : 'None'} (Nature: ${l.Group ? l.Group.nature : 'None'})`);
      console.log(`Opening Balance: ${l.openingBalance} ${l.openingBalanceType}`);
      console.log(`Transactions Count: ${l.Transactions.length}`);
      
      let totalDr = 0;
      let totalCr = 0;

      for (const t of l.Transactions) {
        console.log(`  Tx [${t.id}] | Dr: ${t.debit} | Cr: ${t.credit} | Desc: ${t.description} | Voucher: ${t.Voucher ? t.Voucher.voucherType : 'None'}`);
        totalDr += parseFloat(t.debit || 0);
        totalCr += parseFloat(t.credit || 0);
      }
      
      console.log(`Calculated Total Dr: ${totalDr}, Total Cr: ${totalCr}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

inspectLedgers();
