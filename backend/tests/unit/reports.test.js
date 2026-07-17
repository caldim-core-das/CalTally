const { Company, Group, Ledger, Voucher, Transaction, ReportSnapshot, sequelize } = require('../../models');
const reportsController = require('../../modules/reports/reports.controller');

describe('Reports (Unit)', () => {
  let companyId;
  
  beforeEach(async () => {
    const company = await Company.create({ name: 'Test Reports Co', email: 'reports@test.com', financialYearStart: '2026-04-01' });
    companyId = company.id;
  });

  describe('Trial Balance', () => {
    it('should generate a trial balance from live transactions', async () => {
      // Create groups
      const assetGroup = await Group.create({ name: 'Current Assets', nature: 'Assets', CompanyId: companyId });
      const capitalGroup = await Group.create({ name: 'Capital Account', nature: 'Equity', CompanyId: companyId });

      // Create ledgers
      const cash = await Ledger.create({ name: 'Cash', groupId: assetGroup.id, CompanyId: companyId, currentBalance: 5000 });
      const capital = await Ledger.create({ name: 'Capital', groupId: capitalGroup.id, CompanyId: companyId, currentBalance: -5000 });
      
      // We are testing the logic inside customReportController directly or via supertest.
      // Since it's a unit test, we can mock the req/res objects
      const req = {
        params: { companyId },
        query: {}
      };
      const res = {
        json: jest.fn()
      };
      const next = jest.fn();

      await reportsController.getTrialBalance(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      
      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveProperty('trialBalance');
    });
  });
});
