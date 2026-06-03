const { sequelize, User } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');
    
    const users = await User.findAll();
    console.log('Users in DB:');
    users.forEach(u => {
      console.log(`- ID: ${u.id}, Name: ${u.name || 'N/A'}, Email: ${u.email}, activeCompanyId: ${u.activeCompanyId}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

run();
