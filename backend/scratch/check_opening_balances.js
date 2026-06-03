const { Ledger, Company } = require('../models');

async function checkOpeningBalances() {
  try {
    const company = await Company.findOne({ where: { name: 'The MOON Enterprises' } });
    if (!company) {
      console.log('Company not found');
      return;
    }

    const ledgers = await Ledger.findAll({ where: { CompanyId: company.id } });
    let totalOpeningDr = 0;
    let totalOpeningCr = 0;
    
    for (const l of ledgers) {
      const ob = parseFloat(l.openingBalance || 0);
      const type = (l.openingBalanceType || 'Dr').trim().toUpperCase();
      if (type === 'DR') {
        totalOpeningDr += ob;
      } else {
        totalOpeningCr += ob;
      }
    }
    
    console.log(`Company: ${company.name}`);
    console.log(`Total Opening Debit: ${totalOpeningDr}`);
    console.log(`Total Opening Credit: ${totalOpeningCr}`);
    console.log(`Difference: ${Math.abs(totalOpeningDr - totalOpeningCr)}`);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkOpeningBalances();
