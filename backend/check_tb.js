const { Ledger, Group, Transaction, Company } = require('./models');
const { Op } = require('sequelize');

async function run() {
  try {
    const companies = await Company.findAll();
    for (const company of companies) {
      const ledgers = await Ledger.findAll({
        where: { CompanyId: company.id },
        include: [
          { model: Group, attributes: ['name', 'nature'] }
        ]
      });
      if (ledgers.length === 0) continue;

      console.log(`\n=========================================`);
      console.log(`Company: ${company.name} (${company.id})`);
      console.log(`=========================================`);

      for (const l of ledgers) {
        // Calculate debit/credit totals
        const txs = await Transaction.findAll({ where: { LedgerId: l.id } });
        const totalDebit = txs.reduce((sum, t) => sum + parseFloat(t.debit || 0), 0);
        const totalCredit = txs.reduce((sum, t) => sum + parseFloat(t.credit || 0), 0);

        const rawOpening = parseFloat(l.openingBalance || 0);
        const openingType = l.openingBalanceType || 'Dr';
        const nature = l.Group?.nature || 'Assets';
        const isDrNature = ['Assets', 'Expenses'].includes(nature);

        let closingRaw;
        if (isDrNature) {
          const openingDr = (openingType.toUpperCase() === 'DR') ? rawOpening : -rawOpening;
          closingRaw = openingDr + totalDebit - totalCredit;
        } else {
          const openingCr = (openingType.toUpperCase() === 'CR') ? rawOpening : -rawOpening;
          closingRaw = openingCr + totalCredit - totalDebit;
        }

        let debitBalance = 0;
        let creditBalance = 0;
        if (isDrNature) {
          if (closingRaw >= 0) debitBalance = closingRaw;
          else creditBalance = Math.abs(closingRaw);
        } else {
          if (closingRaw >= 0) creditBalance = closingRaw;
          else debitBalance = Math.abs(closingRaw);
        }

        if (rawOpening !== 0 || totalDebit !== 0 || totalCredit !== 0 || closingRaw !== 0) {
          console.log(`Ledger: ${l.name}`);
          console.log(`  Group: ${l.Group?.name || 'none'} (${nature})`);
          console.log(`  Opening: ${rawOpening} (${openingType})`);
          console.log(`  Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`);
          console.log(`  Closing (Raw): ${closingRaw}`);
          console.log(`  Debit Bal: ${debitBalance}, Credit Bal: ${creditBalance}`);
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
