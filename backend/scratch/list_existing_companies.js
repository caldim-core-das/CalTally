const { sequelize, Company } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');
    
    const companies = await Company.findAll();
    console.log('Existing Companies in DB:');
    companies.forEach(c => {
      console.log(`- ID: ${c.id}, Name: ${c.name}, userId: ${c.userId}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

run();
