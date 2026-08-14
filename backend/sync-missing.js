require('dotenv').config();
const { sequelize } = require('./models');

async function syncMissing() {
  try {
    console.log('Creating missing tables...');
    // force: false, alter: false means it will ONLY create tables that do not exist yet.
    // It will calculate the correct dependency order automatically.
    await sequelize.sync({ force: false, alter: false });
    
    console.log('Missing tables synced successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to sync missing tables:', err);
    process.exit(1);
  }
}

syncMissing();
