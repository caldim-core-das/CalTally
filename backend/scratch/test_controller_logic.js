const { sequelize, Group, Ledger } = require('../models');

async function test() {
  const companyId = '5f028981-8de4-4c19-9a90-54257dd87f70'; // The MOON Enterprises
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    const groups = await Group.findAll({
      where: { CompanyId: companyId },
      include: [
        { model: Group, as: 'SubGroups' },
        { model: Ledger, as: 'Ledgers' }
      ],
      order: [['name', 'ASC']]
    });

    console.log(`Successfully fetched ${groups.length} groups.`);
    if (groups.length > 0) {
      console.log('First few groups with sub-groups and ledgers counts:');
      groups.slice(0, 5).forEach(g => {
        console.log(`- Group: ${g.name} (${g.nature})`);
        console.log(`  SubGroups count: ${g.SubGroups ? g.SubGroups.length : 0}`);
        console.log(`  Ledgers count: ${g.Ledgers ? g.Ledgers.length : 0}`);
      });
    }
  } catch (err) {
    console.error('Error during simulation:', err);
  } finally {
    await sequelize.close();
  }
}

test();
