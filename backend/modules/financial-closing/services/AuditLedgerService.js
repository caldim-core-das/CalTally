const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const logFilePath = path.join(__dirname, '../audit_trail.jsonl');

class AuditLedgerService {
  /**
   * Appends an export or closing event to the audit trail log with a SHA-256 hash link.
   */
  static async logEvent({ companyId, userId, action, reportType, details }) {
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    let index = 0;

    // 1. Read last line to extract the previous hash and index
    if (fs.existsSync(logFilePath)) {
      const fileContent = fs.readFileSync(logFilePath, 'utf8').trim();
      if (fileContent) {
        const lines = fileContent.split('\n');
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          try {
            const lastEvent = JSON.parse(lastLine);
            if (lastEvent.hash) {
              previousHash = lastEvent.hash;
              index = (lastEvent.index || 0) + 1;
            }
          } catch (e) {
            // Treat as fresh if parse fails
          }
        }
      }
    }

    const timestamp = new Date().toISOString();
    const eventPayload = {
      index,
      companyId,
      userId,
      action, // e.g. EXPORT_EXCEL, EXPORT_PDF, PRINT_A4, MONTH_LOCK
      reportType,
      details,
      timestamp,
      previousHash
    };

    // 2. Compute current block hash
    const payloadString = JSON.stringify(eventPayload);
    const hash = crypto
      .createHash('sha256')
      .update(payloadString + previousHash)
      .digest('hex');

    eventPayload.hash = hash;

    // 3. Append to log file
    fs.appendFileSync(logFilePath, JSON.stringify(eventPayload) + '\n');
    return eventPayload;
  }

  /**
   * Verifies the integrity of the append-only audit trail file.
   */
  static async verifyAuditTrail() {
    if (!fs.existsSync(logFilePath)) {
      return { isValid: true, count: 0 };
    }

    const fileContent = fs.readFileSync(logFilePath, 'utf8').trim();
    if (!fileContent) {
      return { isValid: true, count: 0 };
    }

    const lines = fileContent.split('\n');
    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const event = JSON.parse(line);
      const { hash, previousHash, ...rawPayload } = event;

      // Verify chain link
      if (previousHash !== expectedPrevHash) {
        throw new Error(`Audit Trail Integrity Broken: Line ${i} expects previous hash ${expectedPrevHash} but found ${previousHash}.`);
      }

      // Recompute hash
      const payloadString = JSON.stringify({ ...rawPayload, previousHash });
      const recomputed = crypto
        .createHash('sha256')
        .update(payloadString + previousHash)
        .digest('hex');

      if (hash !== recomputed) {
        throw new Error(`Audit Trail Tampering Detected: Line ${i} hash has been altered.`);
      }

      expectedPrevHash = hash;
    }

    return {
      isValid: true,
      count: lines.length
    };
  }
}

module.exports = AuditLedgerService;
