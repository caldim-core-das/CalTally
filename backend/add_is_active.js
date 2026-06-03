const { sequelize } = require('./models');
const { DataTypes } = require('sequelize');

async function run() {
  try {
    console.log('Altering Ledgers table to add isActive column if not exists...');
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('Ledgers');
    
    if (!tableInfo.isActive) {
      await queryInterface.addColumn('Ledgers', 'isActive', {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      });
      console.log('✅ Added isActive column successfully.');
    } else {
      console.log('ℹ️ isActive column already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to add column:', err);
    process.exit(1);
  }
}

run();
