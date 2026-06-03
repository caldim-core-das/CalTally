const { Voucher } = require('c:/Users/USER/Tally_accounting/backend/models');

async function countVouchers() {
  try {
    const vouchers = await Voucher.findAll({ raw: true });
    const counts = {};
    vouchers.forEach(v => {
      counts[v.voucherType] = (counts[v.voucherType] || 0) + 1;
    });
    console.log('Voucher counts by type:', counts);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

countVouchers();
