const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');
    const queryInterface = sequelize.getQueryInterface();
    
    console.log('Adding column "userId" to "Companies" table...');
    await queryInterface.addColumn('Companies', 'userId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    console.log('✅ Column "userId" successfully added with foreign key constraint.');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await sequelize.close();
  }
}

run();
