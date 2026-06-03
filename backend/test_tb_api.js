const { Ledger, Group, Transaction, Company, sequelize } = require('./models');

async function run() {
  try {
    const companyId = '5f028981-8de4-4c19-9a90-54257dd87f70'; // The MOON Enterprises
    console.log(`Running getTrialBalance logic for companyId: ${companyId}`);

    const ledgers = await Ledger.findAll({
      where: { CompanyId: companyId },
      include: [
        { model: Group, attributes: ['name', 'nature'] },
        {
          model: Transaction,
          attributes: []
        }
      ],
      attributes: {
        include: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('Transactions.debit')), 0), 'totalDebit'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('Transactions.credit')), 0), 'totalCredit']
        ]
      },
      group: ['Ledger.id', 'Group.id'],
      raw: true,
      nest: true
    });

    const trialBalance = ledgers.map(l => {
      const rawOpening = parseFloat(l.openingBalance || 0);
      const openingType = l.openingBalanceType || 'Dr';
      const nature = l.Group?.nature || 'Assets';
      const debit = parseFloat(l.totalDebit || 0);
      const credit = parseFloat(l.totalCredit || 0);

      const isDrNature = ['Assets', 'Expenses'].includes(nature);

      let closingRaw;
      if (isDrNature) {
        const openingDr = openingType === 'Dr' ? rawOpening : -rawOpening;
        closingRaw = openingDr + debit - credit;
      } else {
        const openingCr = openingType === 'Cr' ? rawOpening : -rawOpening;
        closingRaw = openingCr + credit - debit;
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

      return {
        ledgerId: l.id,
        ledgerName: l.name,
        group: l.Group?.name || 'Ungrouped',
        nature,
        openingBalance: rawOpening,
        openingBalanceType: openingType,
        totalDebit: debit,
        totalCredit: credit,
        closingBalance: closingRaw,
        debitBalance,
        creditBalance
      };
    });

    const totalDebitBal = trialBalance.reduce((s, r) => s + r.debitBalance, 0);
    const totalCreditBal = trialBalance.reduce((s, r) => s + r.creditBalance, 0);

    const result = {
      trialBalance,
      summary: {
        totalDebit: totalDebitBal,
        totalCredit: totalCreditBal,
        isBalanced: Math.abs(totalDebitBal - totalCreditBal) < 0.01
      }
    };

    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
