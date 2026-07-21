const { Company, Group, Ledger, Voucher, Transaction, AuditLog, sequelize } = require('../../models');
const AccountingService = require('../../services/AccountingService');
const AuditService = require('../../services/AuditService');
const AuditVerifier = require('../../jobs/auditVerifier');

describe('Financial Integrity Suite (Volume 8 Section 9.2)', () => {
  let companyId;
  let userId = '82a6fc09-f31b-469d-a742-f822f25d6cec';
  let cashLedgerId;
  let equityLedgerId;

  beforeEach(async () => {
    // Re-sync database to fresh state
    await sequelize.sync({ force: true });

    // Seed mock company
    const company = await Company.create({
      name: 'Integrity Test Co',
      email: 'integrity@example.com',
      financialYearStart: '2026-04-01'
    });
    companyId = company.id;

    // Seed mock groups
    const assets = await Group.create({ name: 'Assets', nature: 'Assets', CompanyId: companyId });
    const equity = await Group.create({ name: 'Equity', nature: 'Equity', CompanyId: companyId });

    // Seed ledgers
    const cash = await Ledger.create({ name: 'Cash', groupId: assets.id, CompanyId: companyId, openingBalance: 0, currentBalance: 0 });
    const capital = await Ledger.create({ name: 'Equity Capital', groupId: equity.id, CompanyId: companyId, openingBalance: 0, currentBalance: 0 });
    
    cashLedgerId = cash.id;
    equityLedgerId = capital.id;
  });

  // 1. Double-Entry Balance Invariant
  describe('Double-Entry Balance Invariant', () => {
    it('should allow posting a balanced journal entry', async () => {
      const entry = await AccountingService.recordJournalEntry({
        companyId,
        date: new Date(),
        narration: 'Balanced Opening Capital',
        voucherType: 'Journal',
        userId,
        entries: [
          { ledgerId: cashLedgerId, debit: 50000, credit: 0 },
          { ledgerId: equityLedgerId, debit: 0, credit: 50000 }
        ]
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();

      // Assert aggregate debits match credits
      const txs = await Transaction.findAll({ where: { VoucherId: entry.id } });
      const sumDebits = txs.reduce((sum, tx) => sum + parseFloat(tx.debit || 0), 0);
      const sumCredits = txs.reduce((sum, tx) => sum + parseFloat(tx.credit || 0), 0);
      expect(sumDebits).toBe(50000);
      expect(sumCredits).toBe(50000);
    });

    it('should reject an unbalanced journal entry', async () => {
      await expect(
        AccountingService.recordJournalEntry({
          companyId,
          date: new Date(),
          narration: 'Unbalanced Entry',
          voucherType: 'Journal',
          userId,
          entries: [
            { ledgerId: cashLedgerId, debit: 50000, credit: 0 },
            { ledgerId: equityLedgerId, debit: 0, credit: 49999 } // Mismatch
          ]
        })
      ).rejects.toThrow(/Unbalanced journal entry/);
    });
  });

  // 2. Append-Only Enforcement
  describe('Append-Only Enforcement', () => {
    it('should reject direct database updates on ledger journal lines (Transactions)', async () => {
      // Create a transaction line
      const voucher = await Voucher.create({
        CompanyId: companyId,
        date: new Date(),
        narration: 'Baseline Entry',
        voucherType: 'Journal',
        CreatedBy: userId
      });

      const txLine = await Transaction.create({
        CompanyId: companyId,
        VoucherId: voucher.id,
        LedgerId: cashLedgerId,
        debit: 1000,
        credit: 0
      });

      // App-level validation prevents direct update/delete on transaction lines
      // Test direct update via Sequelize hooks or standard constraints
      await expect(
        Transaction.update(
          { debit: 2000 },
          { where: { id: txLine.id } }
        )
      ).rejects.toThrow();

      // Test direct deletion
      await expect(
        Transaction.destroy({ where: { id: txLine.id } })
      ).rejects.toThrow();
    });
  });

  // 3. Reversal Correctness
  describe('Reversal Correctness', () => {
    it('should negate the original entry when reversed, leaving both queryable', async () => {
      const original = await AccountingService.recordJournalEntry({
        companyId,
        date: new Date(),
        narration: 'Sales Invoice Inflow',
        voucherType: 'Receipt',
        userId,
        entries: [
          { ledgerId: cashLedgerId, debit: 12000, credit: 0 },
          { ledgerId: equityLedgerId, debit: 0, credit: 12000 }
        ]
      });

      // Execute reversal
      const reversed = await AccountingService.reverseJournalEntry({
        companyId,
        voucherId: original.id,
        narration: 'Reversal of Sales Invoice Inflow',
        userId
      });

      expect(reversed).toBeDefined();

      // Original remains queryable
      const checkOriginal = await Voucher.findByPk(original.id);
      expect(checkOriginal).toBeDefined();

      // Sum of original + reversed balances out to 0
      const allTxs = await Transaction.findAll({
        where: { VoucherId: [original.id, reversed.id] }
      });
      const netSum = allTxs.reduce((sum, tx) => sum + parseFloat(tx.debit || 0) - parseFloat(tx.credit || 0), 0);
      expect(netSum).toBe(0);
    });
  });

  // 4. Idempotent Replay Protection
  describe('Idempotent Replay Protection', () => {
    it('should ignore duplicate domain events or requests with the same eventId', async () => {
      const payload = {
        companyId,
        eventId: 'evt_sales_101_unique',
        date: new Date(),
        narration: 'Sales event',
        voucherType: 'Journal',
        userId,
        entries: [
          { ledgerId: cashLedgerId, debit: 450, credit: 0 },
          { ledgerId: equityLedgerId, debit: 0, credit: 450 }
        ]
      };

      // First replay
      const firstResult = await AccountingService.recordJournalEntry(payload);
      expect(firstResult).toBeDefined();

      // Second replay (duplicate)
      const secondResult = await AccountingService.recordJournalEntry(payload);
      // Assert it returns the same first entry and doesn't double-post
      expect(secondResult.id).toBe(firstResult.id);

      // Verify only 2 transaction lines exist in total
      const count = await Transaction.count({
        where: { CompanyId: companyId }
      });
      expect(count).toBe(2);
    });
  });

  // 5. Audit Hash-Chain Integrity
  describe('Audit Hash-Chain Integrity', () => {
    it('should successfully detect manual database alterations (tampering) in the audit log', async () => {
      // Clear audit log
      await AuditLog.destroy({ where: { CompanyId: companyId } });

      // Create a chain of logs
      await AuditService.log({
        action: 'INVOICE_CREATE',
        tableName: 'SalesInvoices',
        recordId: 'inv-101',
        newData: { amount: 15000 },
        companyId,
        userId
      });

      await AuditService.log({
        action: 'INVOICE_APPROVE',
        tableName: 'SalesInvoices',
        recordId: 'inv-101',
        oldData: { amount: 15000 },
        newData: { amount: 15000, status: 'Approved' },
        companyId,
        userId
      });

      // Assert chain is initially healthy
      const initialReport = await AuditVerifier.verifyTenantAuditLogs(companyId);
      expect(initialReport.verified).toBe(true);
      expect(initialReport.compromisedCount).toBe(0);

      // Simulate tampering by altering a record directly in the DB
      const lastLog = await AuditLog.findOne({
        where: { CompanyId: companyId },
        order: [['createdAt', 'DESC']]
      });

      expect(lastLog).toBeDefined();
      lastLog.action = 'TAMPERED_ACTION';
      await lastLog.save({ silent: true }); // Save without hooks

      // Assert chain detects tampering
      const compromisedReport = await AuditVerifier.verifyTenantAuditLogs(companyId);
      expect(compromisedReport.verified).toBe(false);
      expect(compromisedReport.compromisedCount).toBeGreaterThan(0);
      expect(compromisedReport.compromisedEntries[0].id).toBe(lastLog.id);
    });
  });
});
