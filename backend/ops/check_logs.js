const { sequelize, AuditLog } = require('../models');

async function checkLogs() {
  try {
    const logs = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    console.log('--- Last 10 Audit Logs ---');
    logs.forEach(l => {
      console.log(`[${l.createdAt}] ${l.action} on ${l.tableName} (Status: ${l.status})`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
checkLogs();
