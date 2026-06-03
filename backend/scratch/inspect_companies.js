const { sequelize, Company } = require('../models');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');
    
    // Check columns in Companies table
    const queryInterface = sequelize.getQueryInterface();
    const tableDesc = await queryInterface.describeTable('Companies');
    console.log('Columns in "Companies" table:');
    console.log(Object.keys(tableDesc));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

check();
