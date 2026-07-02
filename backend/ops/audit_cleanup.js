const { sequelize, AuditLog } = require('../models');

async function cleanupDuplicateAudits() {
  console.log('--- Starting Audit Log Deduplication ---');
  let duplicatesFound = 0;
  let duplicatesRemoved = 0;
  let originalRecordsPreserved = 0;

  try {
    // Attempt to add the status column dynamically if it doesn't exist yet
    // This handles the Postgres schema update safely without requiring a manual migration
    try {
      await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT \'COMPLETED\';');
      console.log('Database Schema Updated: Added "status" column to AuditLogs.');
    } catch (dbErr) {
      // 42701 is Postgres error code for "duplicate_column"
      if (dbErr.parent && dbErr.parent.code === '42701') {
        console.log('Database Schema: "status" column already exists.');
      } else if (dbErr.message.includes('already exists')) {
        console.log('Database Schema: "status" column already exists.');
      } else {
        // If it's a different error, we just log it and continue.
        console.log('Database Schema Update skipped or failed (Column might already exist).', dbErr.message);
      }
    }

    // We group logs by UserId, action, tableName, recordId, and createdAt (to the nearest minute)
    // to identify identical duplicates caused by the logging bug.
    // Since timestamps might vary by a few milliseconds, it's safer to query all and deduplicate in JS.

    const allLogs = await AuditLog.findAll({
      order: [['createdAt', 'ASC']] // Oldest first
    });

    const uniqueSignatures = new Set();
    const idsToDelete = [];

    for (const log of allLogs) {
      // Create a unique signature for this action
      // Ignore millisecond differences by rounding to the nearest second
      const timeSec = Math.floor(new Date(log.createdAt).getTime() / 1000);
      
      const signature = `${log.UserId}-${log.action}-${log.tableName}-${log.recordId}-${timeSec}`;

      if (uniqueSignatures.has(signature)) {
        // It's a duplicate of an action that occurred in the same second by the same user
        idsToDelete.push(log.id);
        duplicatesFound++;
      } else {
        uniqueSignatures.add(signature);
        originalRecordsPreserved++;
      }
    }

    if (idsToDelete.length > 0) {
      console.log(`Found ${idsToDelete.length} duplicates. Deleting...`);
      await AuditLog.destroy({
        where: {
          id: idsToDelete
        }
      });
      duplicatesRemoved = idsToDelete.length;
    } else {
      console.log('No duplicates found in the database.');
    }

    console.log('--- Deduplication Complete ---');
    console.log(`Duplicates Found : ${duplicatesFound}`);
    console.log(`Duplicates Removed : ${duplicatesRemoved}`);
    console.log(`Original Records Preserved : ${originalRecordsPreserved}`);

  } catch (error) {
    console.error('Error during audit cleanup:', error);
  } finally {
    process.exit(0);
  }
}

cleanupDuplicateAudits();
