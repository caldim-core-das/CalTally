const { sequelize } = require('../models');

async function initSchemas() {
  const schemas = [
    'identity_tenant',
    'ledger',
    'inventory',
    'sales',
    'purchases',
    'bank_feed',
    'payment',
    'payroll',
    'manufacturing',
    'reports',
    'fixed_assets',
    'budgeting',
    'time_tracking',
    'tax',
    'core'
  ];

  console.log('Initializing Vol 4 PostgreSQL Schemas...');
  
  try {
    for (const schema of schemas) {
      await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
      console.log(`Schema verified: ${schema}`);
    }
    console.log('All schemas initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize schemas:', err);
  } finally {
    await sequelize.close();
  }
}

initSchemas();
