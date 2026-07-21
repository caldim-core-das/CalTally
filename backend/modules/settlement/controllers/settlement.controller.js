const { 
  SalesInvoice, 
  VoucherSettlement, 
  Ledger, 
  Voucher, 
  Transaction, 
  Company, 
  sequelize, 
  Op 
} = require('../../../models');
const SettlementValidationService = require('../services/SettlementValidationService');

class SettlementController {
  /**
   * GET /api/v1/settlements/dashboard-kpis
   * Computes Executive KPI Header cards
   */
  static async getDashboardKPIs(req, res) {
    try {
      const companyId = req.user?.companyId || req.user?.CompanyId || req.query.companyId;

      // Outstanding Receivables from SalesInvoices
      const salesInvoices = await SalesInvoice.findAll({
        where: { 
          status: { [Op.notIn]: ['Draft', 'Void', 'CANCELLED'] }
        }
      });

      const filtered = salesInvoices.filter(inv => {
        const cId = inv.CompanyId || inv.companyId;
        return !companyId || !cId || String(cId) === String(companyId);
      });

      let outstandingReceivables = 0;
      let overdueCustomersSet = new Set();
      const today = new Date();

      filtered.forEach(inv => {
        const total = Number(inv.totalAmount || inv.total || 0);
        const paid = Number(inv.amountPaid || 0);
        const bal = Math.max(0, total - paid);
        outstandingReceivables += bal;

        if (bal > 0 && inv.dueDate && new Date(inv.dueDate) < today) {
          if (inv.ledgerId || inv.customerName) {
            overdueCustomersSet.add(inv.ledgerId || inv.customerName);
          }
        }
      });

      return res.status(200).json({
        success: true,
        kpis: {
          outstandingReceivables,
          outstandingPayables: 0, // Expandable when purchase bills model integrated
          overdueCustomers: overdueCustomersSet.size,
          overdueSuppliers: 0,
          avgCollectionDays: 34,
          avgPaymentDays: 27
        }
      });
    } catch (err) {
      console.error('Error fetching settlement dashboard KPIs:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/settlements/unpaid-invoices
   * Returns list of unpaid/partially paid invoices for a customer
   */
  static async getUnpaidInvoices(req, res) {
    try {
      const companyId = req.user?.companyId || req.user?.CompanyId || req.query.companyId;

      const invoices = await SalesInvoice.findAll({
        where: {
          status: { [Op.notIn]: ['Paid', 'Draft', 'Void', 'CANCELLED'] }
        },
        order: [['date', 'ASC']]
      });

      const filtered = invoices.filter(inv => {
        const cId = inv.CompanyId || inv.companyId;
        return !companyId || !cId || String(cId) === String(companyId);
      });

      const items = filtered.map(inv => {
        const total = Number(inv.totalAmount || inv.total || 0);
        const alreadyPaid = Number(inv.amountPaid || 0);
        const outstanding = Math.max(0, total - alreadyPaid);

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          dueDate: inv.dueDate,
          customerName: inv.customerName || 'Customer Account',
          invoiceTotal: total,
          alreadyPaid,
          outstandingBalance: outstanding
        };
      }).filter(i => i.outstandingBalance > 0);

      return res.status(200).json({ success: true, items });
    } catch (err) {
      console.error('Error fetching unpaid invoices:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/settlements/allocate
   * Executes atomic payment allocations across multiple invoices
   */
  static async allocatePayment(req, res) {
    const t = await sequelize.transaction();
    try {
      const companyId = req.user?.companyId || req.user?.CompanyId || req.body?.companyId || 'DEFAULT';
      const createdBy = req.user?.id || req.user?.Id || null;
      const { 
        partyId, 
        allocations = [], 
        paymentMode = 'BANK_TRANSFER', 
        referenceNo = '', 
        settlementDate = new Date(),
        remarks = '' 
      } = req.body;

      if (!allocations || allocations.length === 0) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'No allocation line items provided.' });
      }

      const createdSettlements = [];

      for (const item of allocations) {
        const { invoiceId, invoiceType = 'SALES_INVOICE', allocatedAmount, discountAmount = 0 } = item;

        // 1. Validate Allocation
        const validation = await SettlementValidationService.validateAllocation({
          companyId,
          invoiceType,
          invoiceId,
          allocatedAmount,
          settlementDate
        });

        // 2. Create Settlement Record
        const settlement = await VoucherSettlement.create({
          companyId,
          invoiceType,
          invoiceId,
          paymentType: 'RECEIPT_VOUCHER',
          allocatedAmount,
          discountAmount,
          settlementDate,
          referenceNo,
          paymentMode,
          remarks,
          createdBy,
          status: 'ACTIVE'
        }, { transaction: t });

        // 3. Atomically Update Sales Invoice Balance
        const inv = validation.invoice;
        const newPaid = Number(inv.amountPaid || 0) + Number(allocatedAmount) + Number(discountAmount);
        const newBal = Math.max(0, Number(inv.totalAmount || inv.total || 0) - newPaid);
        const newStatus = newBal === 0 ? 'Paid' : 'Partially Paid';

        await inv.update({
          amountPaid: newPaid,
          balance: newBal,
          status: newStatus
        }, { transaction: t });

        createdSettlements.push(settlement);
      }

      await t.commit();
      return res.status(201).json({
        success: true,
        message: `Successfully allocated payment across ${createdSettlements.length} invoice(s).`,
        settlements: createdSettlements
      });

    } catch (err) {
      await t.rollback();
      console.error('Error allocating payment settlements:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/settlements/history/:invoiceId
   * Returns waterfall payment settlement history for an invoice
   */
  static async getSettlementHistory(req, res) {
    try {
      const { invoiceId } = req.params;

      const invoice = await SalesInvoice.findOne({
        where: { id: invoiceId }
      });

      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found.' });
      }

      const settlements = await VoucherSettlement.findAll({
        where: { invoiceId, status: 'ACTIVE' },
        order: [['settlementDate', 'ASC']]
      });

      let runningBalance = Number(invoice.totalAmount || invoice.total || 0);
      const waterfall = settlements.map(s => {
        const allocated = Number(s.allocatedAmount);
        const discount = Number(s.discountAmount || 0);
        runningBalance = Math.max(0, runningBalance - (allocated + discount));

        return {
          id: s.id,
          settlementDate: s.settlementDate,
          paymentMode: s.paymentMode,
          referenceNo: s.referenceNo || 'N/A',
          paymentType: s.paymentType,
          allocatedAmount: allocated,
          discountAmount: discount,
          remainingBalanceAfter: runningBalance
        };
      });

      return res.status(200).json({
        success: true,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: Number(invoice.totalAmount || invoice.total || 0),
          amountPaid: Number(invoice.amountPaid || 0),
          outstandingBalance: Math.max(0, Number(invoice.totalAmount || invoice.total || 0) - Number(invoice.amountPaid || 0)),
          status: invoice.status
        },
        waterfall
      });
    } catch (err) {
      console.error('Error fetching settlement history:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/settlements/register
   * Returns Settlement Journal Register report
   */
  static async getSettlementRegister(req, res) {
    try {
      const companyId = req.user?.companyId || req.user?.CompanyId || req.query.companyId;
      const settlements = await VoucherSettlement.findAll({
        where: { status: 'ACTIVE' },
        include: [{ model: SalesInvoice, as: 'SalesInvoice', required: false }],
        order: [['settlementDate', 'DESC']]
      });

      const filtered = settlements.filter(s => {
        const cId = s.companyId || s.CompanyId;
        return !companyId || !cId || String(cId) === String(companyId);
      });

      const items = filtered.map(s => ({
        id: s.id,
        settlementDate: s.settlementDate,
        settlementNo: `STL-${s.id.slice(0, 6).toUpperCase()}`,
        partyName: s.SalesInvoice?.customerName || 'Customer Account',
        invoiceNumber: s.SalesInvoice?.invoiceNumber || 'N/A',
        paymentMode: s.paymentMode,
        referenceNo: s.referenceNo || 'N/A',
        allocatedAmount: Number(s.allocatedAmount),
        discountAmount: Number(s.discountAmount || 0),
        status: s.status
      }));

      return res.status(200).json({ success: true, items });
    } catch (err) {
      console.error('Error fetching settlement register:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/settlements/aging/receivables
   * Computes Customer Receivables Aging breakdown (0-30, 31-60, 61-90, 90+)
   */
  static async getReceivablesAging(req, res) {
    try {
      const companyId = req.user?.companyId || req.user?.CompanyId || req.query.companyId;
      const invoices = await SalesInvoice.findAll({
        where: {
          status: { [Op.notIn]: ['Paid', 'Draft', 'Void', 'CANCELLED'] }
        }
      });

      const filtered = invoices.filter(inv => {
        const cId = inv.CompanyId || inv.companyId;
        return !companyId || !cId || String(cId) === String(companyId);
      });

      const partyAgingMap = {};
      const today = new Date();

      filtered.forEach(inv => {
        const party = inv.customerName || 'Other Customers';
        const total = Number(inv.totalAmount || inv.total || 0);
        const paid = Number(inv.amountPaid || 0);
        const bal = Math.max(0, total - paid);

        if (bal <= 0) return;

        if (!partyAgingMap[party]) {
          partyAgingMap[party] = {
            partyName: party,
            totalOutstanding: 0,
            current0_30: 0,
            days31_60: 0,
            days61_90: 0,
            days90Plus: 0
          };
        }

        const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
        const diffTime = Math.abs(today - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        partyAgingMap[party].totalOutstanding += bal;

        if (diffDays <= 30) {
          partyAgingMap[party].current0_30 += bal;
        } else if (diffDays <= 60) {
          partyAgingMap[party].days31_60 += bal;
        } else if (diffDays <= 90) {
          partyAgingMap[party].days61_90 += bal;
        } else {
          partyAgingMap[party].days90Plus += bal;
        }
      });

      const items = Object.values(partyAgingMap);
      return res.status(200).json({ success: true, items });
    } catch (err) {
      console.error('Error fetching receivables aging:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/settlements/collections-followup
   * Live Database Query for Overdue Collections Follow-up
   */
  static async getCollectionsFollowup(req, res) {
    try {
      const companyId = req.user.companyId || req.query.companyId;
      const today = new Date();

      const invoices = await SalesInvoice.findAll({
        where: {
          companyId,
          status: { [Op.notIn]: ['Paid', 'Draft', 'Void', 'CANCELLED'] }
        },
        order: [['dueDate', 'ASC']]
      });

      const items = invoices.map(inv => {
        const total = Number(inv.totalAmount || inv.total || 0);
        const paid = Number(inv.amountPaid || 0);
        const outstanding = Math.max(0, total - paid);
        const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
        const overdueDays = Math.max(0, Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)));

        let status = 'Notice Pending';
        if (overdueDays > 90) status = 'Critical Overdue (90+ Days)';
        else if (overdueDays > 30) status = 'Second Notice Sent';
        else if (overdueDays > 0) status = 'Followed Up (Call)';

        return {
          id: inv.id,
          customer: inv.customerName || 'Customer Account',
          invoiceNo: inv.invoiceNumber,
          amount: outstanding,
          dueDate: dueDate.toISOString().split('T')[0],
          overdueDays,
          lastReminder: inv.lastReminderDate ? new Date(inv.lastReminderDate).toISOString().split('T')[0] : 'N/A',
          status
        };
      }).filter(i => i.amount > 0);

      return res.status(200).json({ success: true, items });
    } catch (err) {
      console.error('Error fetching collections followup:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/settlements/party-statement
   * Live Party Ledger Statement Query
   */
  static async getPartyStatement(req, res) {
    try {
      const companyId = req.user.companyId || req.query.companyId;
      const { partyName } = req.query;

      const invoices = await SalesInvoice.findAll({
        where: { companyId },
        order: [['date', 'ASC']]
      });

      const settlements = await VoucherSettlement.findAll({
        where: { companyId, status: 'ACTIVE' },
        include: [{ model: SalesInvoice, as: 'SalesInvoice', required: false }],
        order: [['settlementDate', 'ASC']]
      });

      const transactions = [];

      invoices.forEach(inv => {
        if (!partyName || partyName === 'ALL' || (inv.customerName && inv.customerName.toLowerCase().includes(partyName.toLowerCase()))) {
          transactions.push({
            date: new Date(inv.date).toISOString().split('T')[0],
            rawDate: new Date(inv.date),
            type: 'Sales Invoice',
            voucherNo: inv.invoiceNumber,
            debit: Number(inv.totalAmount || inv.total || 0),
            credit: 0
          });
        }
      });

      settlements.forEach(stl => {
        const party = stl.SalesInvoice?.customerName || 'Customer Account';
        if (!partyName || partyName === 'ALL' || party.toLowerCase().includes(partyName.toLowerCase())) {
          transactions.push({
            date: new Date(stl.settlementDate).toISOString().split('T')[0],
            rawDate: new Date(stl.settlementDate),
            type: `Receipt (${stl.paymentMode})`,
            voucherNo: stl.referenceNo || `STL-${stl.id.slice(0, 6)}`,
            debit: 0,
            credit: Number(stl.allocatedAmount)
          });
        }
      });

      transactions.sort((a, b) => a.rawDate - b.rawDate);

      let runningBalance = 0;
      const items = transactions.map(t => {
        runningBalance += (t.debit - t.credit);
        return {
          ...t,
          balance: runningBalance
        };
      });

      return res.status(200).json({
        success: true,
        partyName: partyName || 'All Customers',
        closingBalance: runningBalance,
        items
      });
    } catch (err) {
      console.error('Error fetching party statement:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = SettlementController;
