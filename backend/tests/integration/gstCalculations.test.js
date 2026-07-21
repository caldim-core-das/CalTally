const { Company, Group, Ledger, Voucher, Transaction, sequelize } = require('../../models');
const AccountingService = require('../../services/AccountingService');

describe('GST Calculation Testing Suite', () => {
  let companyId;
  let userId = '82a6fc09-f31b-469d-a742-f822f25d6cec';
  let bankLedgerId;
  let salesLedgerId;
  let cgstLedgerId;
  let sgstLedgerId;
  let igstLedgerId;

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Seed mock company
    const company = await Company.create({
      name: 'GST Test Co',
      email: 'gst@example.com',
      state: 'Tamil Nadu', // Intra-state vs Inter-state determination
      financialYearStart: '2026-04-01'
    });
    companyId = company.id;

    // Seed mock groups
    const assets = await Group.create({ name: 'Current Assets', nature: 'Assets', CompanyId: companyId });
    const revenue = await Group.create({ name: 'Sales Account', nature: 'Income', CompanyId: companyId });
    const duties = await Group.create({ name: 'Duties and Taxes', nature: 'Liabilities', CompanyId: companyId });

    // Seed ledgers
    const bank = await Ledger.create({ name: 'SBI Bank', groupId: assets.id, CompanyId: companyId });
    const sales = await Ledger.create({ name: 'Domestic Sales', groupId: revenue.id, CompanyId: companyId });
    const cgst = await Ledger.create({ name: 'Output CGST @ 9%', groupId: duties.id, CompanyId: companyId });
    const sgst = await Ledger.create({ name: 'Output SGST @ 9%', groupId: duties.id, CompanyId: companyId });
    const igst = await Ledger.create({ name: 'Output IGST @ 18%', groupId: duties.id, CompanyId: companyId });

    bankLedgerId = bank.id;
    salesLedgerId = sales.id;
    cgstLedgerId = cgst.id;
    sgstLedgerId = sgst.id;
    igstLedgerId = igst.id;
  });

  // 1. Intra-State GST splits (CGST + SGST)
  describe('Intra-State GST Calculations (CGST + SGST)', () => {
    it('should split GST equally into CGST and SGST for local transactions within same state', async () => {
      const taxableValue = 10000;
      const gstRate = 18; // 18% total
      const gstAmount = (taxableValue * gstRate) / 100; // 1800
      const cgstVal = gstAmount / 2; // 900
      const sgstVal = gstAmount / 2; // 900
      const totalInvoiceValue = taxableValue + gstAmount; // 11800

      // Record local invoice sale
      const entry = await AccountingService.recordJournalEntry({
        companyId,
        date: new Date(),
        narration: 'Intra-State Local Sale Invoice',
        voucherType: 'Sales',
        userId,
        entries: [
          { ledgerId: bankLedgerId, debit: totalInvoiceValue, credit: 0 },
          { ledgerId: salesLedgerId, debit: 0, credit: taxableValue },
          { ledgerId: cgstLedgerId, debit: 0, credit: cgstVal, hsnCode: '9984', gstRate: 9, gstAmount: cgstVal },
          { ledgerId: sgstLedgerId, debit: 0, credit: sgstVal, hsnCode: '9984', gstRate: 9, gstAmount: sgstVal }
        ]
      });

      expect(entry).toBeDefined();

      // Verify that CGST and SGST were recorded correctly as individual lines
      const txs = await Transaction.findAll({ where: { VoucherId: entry.id } });
      const cgstLine = txs.find(tx => tx.LedgerId === cgstLedgerId);
      const sgstLine = txs.find(tx => tx.LedgerId === sgstLedgerId);

      expect(parseFloat(cgstLine.credit)).toBe(900);
      expect(cgstLine.hsnCode).toBe('9984');
      
      expect(parseFloat(sgstLine.credit)).toBe(900);
      expect(sgstLine.hsnCode).toBe('9984');
    });
  });

  // 2. Inter-State GST splits (IGST)
  describe('Inter-State GST Calculations (IGST)', () => {
    it('should apply integrated IGST for transactions spanning across different states', async () => {
      const taxableValue = 20000;
      const gstRate = 18; // 18% total
      const igstVal = (taxableValue * gstRate) / 100; // 3600
      const totalInvoiceValue = taxableValue + igstVal; // 23600

      // Record out-of-state invoice sale
      const entry = await AccountingService.recordJournalEntry({
        companyId,
        date: new Date(),
        narration: 'Inter-State Out-of-State Sale Invoice',
        voucherType: 'Sales',
        userId,
        entries: [
          { ledgerId: bankLedgerId, debit: totalInvoiceValue, credit: 0 },
          { ledgerId: salesLedgerId, debit: 0, credit: taxableValue },
          { ledgerId: igstLedgerId, debit: 0, credit: igstVal, hsnCode: '8471', gstRate: 18, gstAmount: igstVal }
        ]
      });

      expect(entry).toBeDefined();

      // Verify that integrated IGST was recorded correctly
      const txs = await Transaction.findAll({ where: { VoucherId: entry.id } });
      const igstLine = txs.find(tx => tx.LedgerId === igstLedgerId);

      expect(parseFloat(igstLine.credit)).toBe(3600);
      expect(igstLine.hsnCode).toBe('8471');
      expect(parseFloat(igstLine.gstRate)).toBe(18);
    });
  });
});
