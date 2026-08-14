const { Company, Group, Ledger, Voucher, Transaction, sequelize } = require('../../models');
const reportsController = require('../../modules/reports/reports.controller');

describe('Performance Load Testing Suite', () => {
  let companyId;
  let cashLedgerId;
  let salesLedgerId;

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Seed mock company
    const company = await Company.create({
      name: 'Performance Test Co',
      email: 'performance@example.com',
      financialYearStart: '2026-04-01'
    });
    companyId = company.id;

    // Seed mock groups
    const assets = await Group.create({ name: 'Assets', nature: 'Assets', CompanyId: companyId });
    const income = await Group.create({ name: 'Income', nature: 'Income', CompanyId: companyId });

    // Seed ledgers
    const cash = await Ledger.create({ name: 'Cash', groupId: assets.id, CompanyId: companyId });
    const sales = await Ledger.create({ name: 'Sales', groupId: income.id, CompanyId: companyId });

    cashLedgerId = cash.id;
    salesLedgerId = sales.id;
  });

  it('should seed 1,000 transaction lines and generate Trial Balance within 500ms threshold', async () => {
    // Seed 500 balanced journal vouchers (1,000 transaction lines total)
    const vouchersToCreate = [];
    const transactionsToCreate = [];

    const now = new Date();
    for (let i = 0; i < 500; i++) {
      const vId = sequelize.Utils?.generateUUID ? sequelize.Utils.generateUUID() : `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
      const tx1Id = sequelize.Utils?.generateUUID ? sequelize.Utils.generateUUID() : `10000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
      const tx2Id = sequelize.Utils?.generateUUID ? sequelize.Utils.generateUUID() : `20000000-0000-0000-0000-${String(i).padStart(12, '0')}`;

      vouchersToCreate.push({
        id: vId,
        CompanyId: companyId,
        voucherType: 'Journal',
        voucherNumber: `JOU-${String(i).padStart(5, '0')}`,
        date: now,
        narration: `Bulk seed entry ${i}`
      });

      transactionsToCreate.push({
        id: tx1Id,
        VoucherId: vId,
        LedgerId: cashLedgerId,
        debit: 100,
        credit: 0,
        CompanyId: companyId
      });

      transactionsToCreate.push({
        id: tx2Id,
        VoucherId: vId,
        LedgerId: salesLedgerId,
        debit: 0,
        credit: 100,
        CompanyId: companyId
      });
    }

    // Perform bulk insertion to minimize database overhead during test setup
    await Voucher.bulkCreate(vouchersToCreate);
    await Transaction.bulkCreate(transactionsToCreate);

    // Measure Trial Balance report generation latency
    const req = {
      params: { companyId },
      query: {}
    };
    const res = {
      json: jest.fn()
    };
    const next = jest.fn();

    const start = process.hrtime();
    await reportsController.getTrialBalance(req, res, next);
    const diff = process.hrtime(start);
    
    const durationMs = (diff[0] * 1000) + (diff[1] / 1000000);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    
    // P95 Performance target benchmark: Trial Balance must render within 500ms
    expect(durationMs).toBeLessThan(500);
    console.log(`⏱️ Trial Balance generated in ${durationMs.toFixed(2)}ms for 1,000 transaction lines.`);
  });
});
