const { Transaction, Voucher, Company } = require('c:/Users/USER/Tally_accounting/backend/models');

async function checkVouchers() {
  try {
    const vouchers = await Voucher.findAll({
      include: [{ model: Transaction }]
    });

    let totalChecked = 0;
    let balancedCount = 0;
    let unbalancedCount = 0;

    for (const v of vouchers) {
      totalChecked++;
      let totalDr = 0;
      let totalCr = 0;

      if (v.Transactions) {
        v.Transactions.forEach(t => {
          totalDr += parseFloat(t.debit || 0);
          totalCr += parseFloat(t.credit || 0);
        });
      }

      const diff = Math.abs(totalDr - totalCr);
      if (diff > 0.01) {
        unbalancedCount++;
        console.log(`UNBALANCED VOUCHER: voucherId=${v.id} (Number: ${v.voucherNumber}, Type: ${v.voucherType})
        Total Dr=${totalDr}, Total Cr=${totalCr}, Difference=${diff}`);
      } else {
        balancedCount++;
      }
    }

    console.log(`\nTotal vouchers checked: ${totalChecked}`);
    console.log(`Balanced: ${balancedCount}`);
    console.log(`Unbalanced: ${unbalancedCount}`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkVouchers();
