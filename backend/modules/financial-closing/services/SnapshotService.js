const crypto = require('crypto');
const { ReportSnapshot } = require('../../../models');
const { Op } = require('sequelize');

class SnapshotService {
  /**
   * Generates a tamper-proof SHA-256 hash-chained JSON snapshot of a financial report.
   */
  static async createSnapshot({ companyId, reportType, periodStart, periodEnd, reportPayload, userId }) {
    if (!companyId || !reportType || !reportPayload) {
      throw new Error('companyId, reportType, and reportPayload are required.');
    }

    // 1. Fetch the last snapshot to get the previous block hash
    const lastSnapshot = await ReportSnapshot.findOne({
      where: {
        CompanyId: companyId,
        isFinalized: true
      },
      order: [['createdAt', 'DESC']]
    });

    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis hash
    let lastIndex = 0;

    if (lastSnapshot) {
      const lastData = lastSnapshot.snapshotData;
      if (lastData && lastData.auditEnvelope) {
        previousHash = lastData.auditEnvelope.hash;
        lastIndex = lastData.auditEnvelope.index || 0;
      }
    }

    const nextIndex = lastIndex + 1;
    const timestamp = new Date().toISOString();

    // 2. Compute the current SHA-256 block hash
    const payloadString = JSON.stringify(reportPayload);
    const hash = crypto
      .createHash('sha256')
      .update(payloadString + previousHash + nextIndex + timestamp)
      .digest('hex');

    const snapshotData = {
      reportPayload,
      auditEnvelope: {
        index: nextIndex,
        previousHash,
        hash,
        timestamp
      }
    };

    // 3. Save the snapshot record
    const snapshot = await ReportSnapshot.create({
      CompanyId: companyId,
      reportType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      snapshotData,
      isFinalized: true,
      generatedBy: userId
    });

    return snapshot;
  }

  /**
   * Verifies the cryptographic chain integrity of all snapshots for a company.
   * Traverses the list and asserts that each block's previousHash matches the preceding block's hash.
   */
  static async verifyChainIntegrity(companyId) {
    const snapshots = await ReportSnapshot.findAll({
      where: {
        CompanyId: companyId,
        isFinalized: true
      },
      order: [['createdAt', 'ASC']]
    });

    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    let verifiedCount = 0;

    for (let i = 0; i < snapshots.length; i++) {
      const snap = snapshots[i];
      const data = snap.snapshotData;

      if (!data || !data.auditEnvelope) {
        throw new Error(`Integrity Error: Snapshot block at Index ${i} has no cryptographic envelope.`);
      }

      const { previousHash, hash, index, timestamp } = data.auditEnvelope;

      // Assert chain link matches the previous block hash
      if (previousHash !== expectedPrevHash) {
        throw new Error(`Cryptographic Chain Broken: Block at Index ${snap.id} expected previous hash ${expectedPrevHash} but found ${previousHash}.`);
      }

      // Recompute hash to verify no payload tampering has occurred
      const payloadString = JSON.stringify(data.reportPayload);
      const recomputedHash = crypto
        .createHash('sha256')
        .update(payloadString + previousHash + index + timestamp)
        .digest('hex');

      if (hash !== recomputedHash) {
        throw new Error(`Data Tampering Detected: Block at Index ${snap.id} hash mismatch. Data has been altered.`);
      }

      expectedPrevHash = hash;
      verifiedCount++;
    }

    return {
      isValid: true,
      verifiedCount
    };
  }
}

module.exports = SnapshotService;
