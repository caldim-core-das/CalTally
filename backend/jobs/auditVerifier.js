const { AuditLog } = require('../models');
const crypto = require('crypto');

/**
 * Audit trail integrity verification service.
 * Loops through the audit logs of a tenant chronologically and validates the hash-chain.
 */
class AuditVerifier {
  /**
   * Verifies the integrity of the audit logs for a specific company (tenant).
   * 
   * @param {string} companyId - The ID of the company/tenant context
   * @returns {Promise<Object>} Verification results containing verified state and any compromised logs.
   */
  static async verifyTenantAuditLogs(companyId) {
    try {
      // Fetch all audit logs for this tenant in chronological order (oldest first)
      const logs = await AuditLog.findAll({
        where: { CompanyId: companyId },
        order: [['createdAt', 'ASC']]
      });

      let totalLogsChecked = 0;
      let compromisedCount = 0;
      const compromisedEntries = [];
      let expectedPreviousHash = '0';

      for (const log of logs) {
        totalLogsChecked++;

        // 1. Verify previous hash matching expected previous hash in sequence
        if (log.previousHash !== expectedPreviousHash) {
          compromisedCount++;
          compromisedEntries.push({
            id: log.id,
            action: log.action,
            tableName: log.tableName,
            recordId: log.recordId,
            createdAt: log.createdAt,
            reason: `Previous hash mismatch. Stored: ${log.previousHash}, Expected: ${expectedPreviousHash}`
          });
          // Update expectation so we can try to verify subsequent records relative to this current record
          expectedPreviousHash = log.hash;
          continue;
        }

        // 2. Re-compute current hash using the deterministic payload logic used in AuditService.js
        const payload = {
          action: log.action || '',
          tableName: log.tableName || '',
          recordId: log.recordId?.toString() || '',
          oldData: log.oldData ? JSON.stringify(log.oldData) : '',
          newData: log.newData ? JSON.stringify(log.newData) : '',
          CompanyId: log.CompanyId || '',
          UserId: log.UserId || '',
          ipAddress: log.ipAddress || '',
          userAgent: log.userAgent || '',
          status: log.status || 'COMPLETED',
          previousHash: log.previousHash
        };

        const recomputedHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

        // 3. Verify computed hash matches the stored hash
        if (log.hash !== recomputedHash) {
          compromisedCount++;
          compromisedEntries.push({
            id: log.id,
            action: log.action,
            tableName: log.tableName,
            recordId: log.recordId,
            createdAt: log.createdAt,
            reason: `Record content has been altered. Recomputed hash: ${recomputedHash}, Stored hash: ${log.hash}`
          });
        }

        // Advance expected previous hash
        expectedPreviousHash = log.hash;
      }

      return {
        companyId,
        verified: compromisedCount === 0,
        totalLogsChecked,
        compromisedCount,
        compromisedEntries
      };
    } catch (err) {
      console.error(`[AuditVerifier Error] Failed to verify logs for company ${companyId}:`, err);
      throw err;
    }
  }
}

module.exports = AuditVerifier;
