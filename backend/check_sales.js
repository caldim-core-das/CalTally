const { Voucher, Transaction, sequelize } = require('./models');

async function check() {
  const vouchers = await Voucher.findAll({ 
    where: { voucherType: 'Sales' },
    include: [{ model: Transaction }],
    order: [['createdAt', 'DESC']]
  });
  console.log(`Sales Vouchers:`);
  vouchers.forEach(v => {
    console.log(`- Voucher Date: ${v.date}, Total Amount: ${v.totalAmount}, CreatedAt: ${v.createdAt}`);
    v.Transactions.forEach(tx => {
       if (tx.ItemId) {
         console.log(`   -> Tx Qty: ${tx.quantity}, ItemId: ${tx.ItemId}`);
       }
    });
  });
}

check().then(() => process.exit(0)).catch(e => console.error(e));
