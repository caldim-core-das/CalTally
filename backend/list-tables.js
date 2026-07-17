require('dotenv').config();
const { sequelize } = require('./models');

async function listTables() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    console.log('Existing tables:', tables);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

listTables();
