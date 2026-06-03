const { sequelize } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');
    
    const [results] = await sequelize.query('SELECT * FROM "UserCompanies"');
    console.log('UserCompanies mappings:');
    console.log(results);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

run();
