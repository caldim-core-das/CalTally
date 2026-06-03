const { sequelize, Group, Ledger } = require('../models');

async function run() {
  const companyId = '5f028981-8de4-4c19-9a90-54257dd87f70'; // The MOON Enterprises
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');
    
    const groupCount = await Group.count({ where: { CompanyId: companyId } });
    const ledgerCount = await Ledger.count({ where: { CompanyId: companyId } });
    console.log(`Company ID: ${companyId}`);
    console.log(`Group count: ${groupCount}`);
    console.log(`Ledger count: ${ledgerCount}`);
    
    if (groupCount > 0) {
      const groups = await Group.findAll({ where: { CompanyId: companyId }, limit: 5 });
      console.log('Sample groups:');
      groups.forEach(g => console.log(`- ${g.name} (${g.nature})`));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

run();
