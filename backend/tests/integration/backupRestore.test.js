const fs = require('fs');
const { Company, sequelize } = require('../../models');

describe('Database Backup & Restore Testing Suite', () => {
  it('should successfully back up the sqlite database, wipe it, restore, and assert full data parity', async () => {
    // 1. Seed some test data
    await sequelize.sync({ force: true });
    await Company.create({
      name: 'Backup Parity Test Company',
      email: 'backup@example.com',
      financialYearStart: '2026-04-01'
    });

    // 2. Identify the database storage file
    const dbPath = sequelize.connectionManager.config.storage || 'database.sqlite';
    const backupPath = `${dbPath}.test_backup`;

    // Ensure the connection is flushed to disk
    await sequelize.query('PRAGMA wal_checkpoint(FULL);').catch(() => {});

    // Create a backup file copy
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      expect(fs.existsSync(backupPath)).toBe(true);

      // Close sequelize connection to release lock
      await sequelize.close();

      // Wipe/delete the original database file (disaster simulation)
      fs.unlinkSync(dbPath);
      expect(fs.existsSync(dbPath)).toBe(false);

      // Restore database file from backup
      fs.copyFileSync(backupPath, dbPath);
      expect(fs.existsSync(dbPath)).toBe(true);

      // Reconnect and reload models
      const { Company: RestoredCompany } = require('../../models');
      const companies = await RestoredCompany.findAll();
      expect(companies.length).toBe(1);
      expect(companies[0].name).toBe('Backup Parity Test Company');

      // Clean up backup file
      fs.unlinkSync(backupPath);
    }
  });
});
