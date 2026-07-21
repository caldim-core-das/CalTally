const { sequelize } = require('../../models');

describe('Database Migrations Testing Suite', () => {
  it('should successfully run all database table schema migrations', async () => {
    // Sync DB with force to test execution of database migrations/synchronizations
    await expect(sequelize.sync({ force: true })).resolves.toBeDefined();

    // Verify key tables were successfully created
    const tables = await sequelize.getQueryInterface().showAllTables();
    expect(tables).toContain('Companies');
    expect(tables).toContain('Vouchers');
    expect(tables).toContain('Transactions');
    expect(tables).toContain('Ledgers');
    expect(tables).toContain('AuditLogs');
  });

  it('should verify critical columns (hash, previousHash, eventId) exist on their respective tables', async () => {
    // Check AuditLogs schema structure
    const auditLogsSchema = await sequelize.getQueryInterface().describeTable('AuditLogs');
    expect(auditLogsSchema).toHaveProperty('hash');
    expect(auditLogsSchema).toHaveProperty('previousHash');

    // Check Vouchers schema structure
    const vouchersSchema = await sequelize.getQueryInterface().describeTable('Vouchers');
    expect(vouchersSchema).toHaveProperty('eventId');
  });
});
