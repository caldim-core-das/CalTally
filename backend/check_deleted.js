const { Voucher, Transaction, StockMovement, sequelize } = require('./models');

async function check() {
  const vouchers = await Voucher.findAll({ 
    where: { voucherType: 'Sales' },
    paranoid: false,
    include: [{ model: Transaction, paranoid: false }]
  });
  console.log(`Sales Vouchers (including deleted):`);
  vouchers.forEach(v => {
    console.log(`- Voucher ID: ${v.id}, DeletedAt: ${v.deletedAt}`);
    v.Transactions.forEach(tx => {
       if (tx.ItemId) {
         console.log(`   -> Tx Qty: ${tx.quantity}, ItemId: ${tx.ItemId}, DeletedAt: ${tx.deletedAt}`);
       }
    });
  });
}

check().then(() => process.exit(0)).catch(e => console.error(e));
