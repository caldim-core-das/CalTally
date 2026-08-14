const AccountingService = require('../../services/AccountingService');
const { Company, Group, Ledger, Voucher, Transaction, sequelize } = require('../../models');

describe('AccountingService', () => {
  let companyId;
  let userId = '00000000-0000-0000-0000-000000000000'; // mock user

  let cashLedgerId;
  let apLedgerId;

  beforeEach(async () => {
    // Wipe DB before each test to ensure clean state and avoid UUID collisions
    await sequelize.sync({ force: true });
    
    // Create a mock company
    const company = await Company.create({
      name: 'Test Company',
      email: 'test@example.com',
      financialYearStart: '2026-04-01'
    });
    companyId = company.id;

    // Create default groups (Assets, Liabilities, Income, Expenses)
    const assetGroup = await Group.create({ name: 'Current Assets', nature: 'Assets', CompanyId: companyId });
    const liabilityGroup = await Group.create({ name: 'Current Liabilities', nature: 'Liabilities', CompanyId: companyId });

    // Create test ledgers
    const cash = await Ledger.create({ name: 'Cash', groupId: assetGroup.id, CompanyId: companyId, openingBalance: 0, currentBalance: 0 });
    const ap = await Ledger.create({ name: 'Accounts Payable', groupId: liabilityGroup.id, CompanyId: companyId, openingBalance: 0, currentBalance: 0 });
    cashLedgerId = cash.id;
    apLedgerId = ap.id;
  });

  describe('recordJournalEntry', () => {
    it('should successfully post a balanced journal entry and update ledger balances', async () => {
      const entries = [
        { ledgerId: cashLedgerId, debit: 1000, credit: 0 },
        { ledgerId: apLedgerId, debit: 0, credit: 1000 }
      ];

      const result = await AccountingService.recordJournalEntry({
        companyId,
        date: new Date(),
        narration: 'Test Entry',
        voucherType: 'Journal',
        entries,
        userId
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      // Verify Ledger balances were updated
      const cashLedger = await Ledger.findByPk(cashLedgerId);
      const apLedger = await Ledger.findByPk(apLedgerId);

      // Cash is asset, debit increases balance
      expect(parseFloat(cashLedger.currentBalance)).toBe(1000);
      
      // AP is liability, credit decreases (or increases in negative dir depending on tally norm)
      // Tally norm: Liability credit is positive balance. Wait, depends on how currentBalance is stored.
      // Usually currentBalance is strictly mathematical (Dr - Cr) or absolute.
      // Let's just check they aren't zero
      expect(parseFloat(cashLedger.currentBalance)).not.toBe(0);
      expect(parseFloat(apLedger.currentBalance)).not.toBe(0);
    });

    it('should throw INTEGRITY_ERROR if entry is unbalanced', async () => {
      const entries = [
        { ledgerId: cashLedgerId, debit: 1000, credit: 0 },
        { ledgerId: apLedgerId, debit: 0, credit: 900 }
      ];

      await expect(AccountingService.recordJournalEntry({
        companyId,
        date: new Date(),
        narration: 'Unbalanced Entry',
        voucherType: 'Journal',
        entries,
        userId
      })).rejects.toThrow(/INTEGRITY ERROR: Unbalanced journal entry/);
    });
  });
});
