const { sequelize } = require('../models');

async function syncDb() {
  console.log('Syncing database schemas...');
  try {
    const schemas = ['identity_tenant', 'ledger', 'inventory', 'sales', 'purchases', 'bank_feed', 'payment', 'payroll', 'manufacturing', 'reports', 'fixed_assets', 'budgeting', 'time_tracking', 'tax', 'core', 'public'];
    for (const schema of schemas) {
        await sequelize.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
        await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
    }
    await sequelize.sync({ force: true });
    console.log('Database synced successfully.');
  } catch (err) {
    console.error('Failed to sync database:', err);
  } finally {
    await sequelize.close();
  }
}

syncDb();
