/**
 * Fiscal Year Controller
 * ──────────────────────
 * Manages fiscal year lifecycle: create, close (year-end), reopen.
 * Year-end close posts closing entries (P&L → Retained Earnings),
 * snapshots financial statements, and marks the period as Closed.
 */

const { createModuleLogger } = require('../../utils/logger');
const log = createModuleLogger('fiscal-year');

// GET /api/fiscal-years
exports.getFiscalYears = async (req, res, next) => {
  try {
    const { FiscalYear } = require('../../models');
    const years = await FiscalYear.findAll({
      where: { CompanyId: req.companyId },
      order: [['startDate', 'DESC']],
    });
    res.json({ data: years });
  } catch (err) {
    next(err);
  }
};

// GET /api/fiscal-years/:id
exports.getFiscalYearById = async (req, res, next) => {
  try {
    const { FiscalYear } = require('../../models');
    const fy = await FiscalYear.findOne({
      where: { id: req.params.id, CompanyId: req.companyId },
    });
    if (!fy) {
      const err = new Error('Fiscal year not found');
      err.statusCode = 404;
      throw err;
    }
    res.json({ data: fy });
  } catch (err) {
    next(err);
  }
};

// POST /api/fiscal-years
exports.createFiscalYear = async (req, res, next) => {
  try {
    const { FiscalYear, sequelize } = require('../../models');
    const { Op } = require('sequelize');
    const { name, startDate, endDate } = req.body;

    // Validate date range
    if (new Date(startDate) >= new Date(endDate)) {
      const err = new Error('Start date must be before end date');
      err.statusCode = 400;
      throw err;
    }

    // Check for overlapping fiscal years
    const overlap = await FiscalYear.findOne({
      where: {
        CompanyId: req.companyId,
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } },
            ],
          },
        ],
      },
    });

    if (overlap) {
      const err = new Error(`Fiscal year overlaps with existing year: "${overlap.name}"`);
      err.statusCode = 409;
      throw err;
    }

    const fy = await FiscalYear.create({
      CompanyId: req.companyId,
      name,
      startDate,
      endDate,
      status: 'Open',
    });

    log.info(
      { companyId: req.companyId, fiscalYearId: fy.id, userId: req.user.id },
      `Fiscal year created: ${name}`
    );

    res.status(201).json({ data: fy });
  } catch (err) {
    next(err);
  }
};

// POST /api/fiscal-years/:id/close
exports.closeFiscalYear = async (req, res, next) => {
  try {
    const { FiscalYear, Ledger, Transaction, Group, Voucher, AuditLog, sequelize } = require('../../models');
    const { Op } = require('sequelize');
    const AccountingService = require('../../services/AccountingService');

    const fy = await FiscalYear.findOne({
      where: { id: req.params.id, CompanyId: req.companyId },
    });

    if (!fy) {
      const err = new Error('Fiscal year not found');
      err.statusCode = 404;
      throw err;
    }

    if (fy.status === 'Closed') {
      const err = new Error('Fiscal year is already closed');
      err.statusCode = 400;
      throw err;
    }

    // Check that there are no prior open fiscal years
    const priorOpen = await FiscalYear.findOne({
      where: {
        CompanyId: req.companyId,
        startDate: { [Op.lt]: fy.startDate },
        status: { [Op.ne]: 'Closed' },
      },
    });

    if (priorOpen) {
      const err = new Error(`Cannot close this fiscal year — prior year "${priorOpen.name}" is still open. Close it first.`);
      err.statusCode = 400;
      throw err;
    }

    // Mark as Closing
    fy.status = 'Closing';
    await fy.save();

    const t = await sequelize.transaction();

    try {
      // 1. Compute net P&L for the year
      const incomeGroups = await Group.findAll({
        where: { CompanyId: req.companyId, nature: 'Income' },
        transaction: t,
      });
      const expenseGroups = await Group.findAll({
        where: { CompanyId: req.companyId, nature: 'Expenses' },
        transaction: t,
      });

      const incomeGroupIds = incomeGroups.map(g => g.id);
      const expenseGroupIds = expenseGroups.map(g => g.id);

      // Get total income
      const incomeLedgers = await Ledger.findAll({
        where: { CompanyId: req.companyId, groupId: { [Op.in]: incomeGroupIds } },
        transaction: t,
      });
      const totalIncome = incomeLedgers.reduce((sum, l) => sum + (parseFloat(l.currentBalance) || 0), 0);

      // Get total expenses
      const expenseLedgers = await Ledger.findAll({
        where: { CompanyId: req.companyId, groupId: { [Op.in]: expenseGroupIds } },
        transaction: t,
      });
      const totalExpenses = expenseLedgers.reduce((sum, l) => sum + (parseFloat(l.currentBalance) || 0), 0);

      const netPL = totalIncome - totalExpenses;

      // 2. Find or create Retained Earnings ledger
      let retainedEarningsLedger = await Ledger.findOne({
        where: { CompanyId: req.companyId, name: 'Retained Earnings' },
        transaction: t,
      });

      if (!retainedEarningsLedger) {
        // Try to find the Capital Account or Equity group
        let equityGroup = await Group.findOne({
          where: { CompanyId: req.companyId, name: { [Op.like]: '%Capital%' } },
          transaction: t,
        });
        if (!equityGroup) {
          equityGroup = await Group.findOne({
            where: { CompanyId: req.companyId, nature: 'Equity' },
            transaction: t,
          });
        }
        if (!equityGroup) {
          equityGroup = await Group.findOne({
            where: { CompanyId: req.companyId, name: { [Op.like]: '%Liabilities%' } },
            transaction: t,
          });
        }

        if (equityGroup) {
          retainedEarningsLedger = await Ledger.create({
            name: 'Retained Earnings',
            CompanyId: req.companyId,
            groupId: equityGroup.id,
            openingBalance: 0,
            currentBalance: 0,
          }, { transaction: t });
        }
      }

      // 3. Post closing journal entry if there's a net P&L and retained earnings ledger exists
      let closingVoucherId = null;
      if (retainedEarningsLedger && Math.abs(netPL) > 0.01) {
        // Build closing entries: zero out all income and expense ledger balances
        const closingEntries = [];

        // Debit income ledgers (to zero them out)
        for (const ledger of incomeLedgers) {
          const balance = parseFloat(ledger.currentBalance) || 0;
          if (Math.abs(balance) > 0.01) {
            closingEntries.push({
              ledgerId: ledger.id,
              debit: balance > 0 ? balance : 0,
              credit: balance < 0 ? Math.abs(balance) : 0,
            });
          }
        }

        // Credit expense ledgers (to zero them out)
        for (const ledger of expenseLedgers) {
          const balance = parseFloat(ledger.currentBalance) || 0;
          if (Math.abs(balance) > 0.01) {
            closingEntries.push({
              ledgerId: ledger.id,
              debit: balance < 0 ? Math.abs(balance) : 0,
              credit: balance > 0 ? balance : 0,
            });
          }
        }

        // Transfer net to Retained Earnings
        if (netPL > 0) {
          closingEntries.push({ ledgerId: retainedEarningsLedger.id, debit: 0, credit: netPL });
        } else {
          closingEntries.push({ ledgerId: retainedEarningsLedger.id, debit: Math.abs(netPL), credit: 0 });
        }

        if (closingEntries.length >= 2) {
          const result = await AccountingService.recordJournalEntry({
            companyId: req.companyId,
            date: fy.endDate,
            narration: `Year-end closing entry for ${fy.name} — P&L transferred to Retained Earnings`,
            reference: `YE-CLOSE-${fy.name}`,
            voucherType: 'Journal',
            entries: closingEntries,
            userId: req.user.id,
          }, t);

          closingVoucherId = result?.voucher?.id || null;
        }
      }

      // 4. Finalize fiscal year
      fy.status = 'Closed';
      fy.closedBy = req.user.id;
      fy.closedAt = new Date();
      fy.retainedEarningsVoucherId = closingVoucherId;
      await fy.save({ transaction: t });

      // 5. Audit log
      await AuditLog.create({
        action: 'FISCAL_YEAR_CLOSE',
        tableName: 'FiscalYear',
        recordId: fy.id,
        newData: JSON.stringify({ status: 'Closed', netPL, closingVoucherId }),
        CompanyId: req.companyId,
        UserId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }, { transaction: t });

      await t.commit();

      log.info(
        { companyId: req.companyId, fiscalYearId: fy.id, userId: req.user.id, netPL },
        `Fiscal year closed: ${fy.name} (Net P&L: ${netPL})`
      );

      res.json({
        data: fy,
        message: `Fiscal year "${fy.name}" closed successfully. Net P&L of ₹${netPL.toFixed(2)} transferred to Retained Earnings.`,
      });
    } catch (innerErr) {
      await t.rollback();
      // Revert status
      fy.status = 'Open';
      await fy.save();
      throw innerErr;
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/fiscal-years/:id/reopen
exports.reopenFiscalYear = async (req, res, next) => {
  try {
    const { FiscalYear, AuditLog, Voucher, sequelize } = require('../../models');
    const { Op } = require('sequelize');

    const fy = await FiscalYear.findOne({
      where: { id: req.params.id, CompanyId: req.companyId },
    });

    if (!fy) {
      const err = new Error('Fiscal year not found');
      err.statusCode = 404;
      throw err;
    }

    if (fy.status !== 'Closed') {
      const err = new Error('Only closed fiscal years can be reopened');
      err.statusCode = 400;
      throw err;
    }

    const reason = req.body.reason;
    if (!reason || reason.trim().length < 5) {
      const err = new Error('A detailed reason is required to reopen a closed fiscal year');
      err.statusCode = 400;
      throw err;
    }

    // Check if there's a subsequent closed FY — can only reopen the latest closed
    const laterClosed = await FiscalYear.findOne({
      where: {
        CompanyId: req.companyId,
        startDate: { [Op.gt]: fy.startDate },
        status: 'Closed',
      },
    });

    if (laterClosed) {
      const err = new Error(`Cannot reopen — a later fiscal year "${laterClosed.name}" is already closed. Reopen it first.`);
      err.statusCode = 400;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      // Reverse the closing journal entry if it exists
      if (fy.retainedEarningsVoucherId) {
        const closingVoucher = await Voucher.findByPk(fy.retainedEarningsVoucherId, { transaction: t });
        if (closingVoucher) {
          // Soft-delete or cancel the closing voucher
          closingVoucher.status = 'Cancelled';
          await closingVoucher.save({ transaction: t });

          // TODO: Reverse the balance changes — this is a simplification.
          // In production, use AccountingService.reverseJournalEntry()
          log.warn(
            { companyId: req.companyId, voucherId: fy.retainedEarningsVoucherId },
            'Closing voucher cancelled — manual balance reversal may be needed'
          );
        }
      }

      fy.status = 'Open';
      fy.closedBy = null;
      fy.closedAt = null;
      fy.retainedEarningsVoucherId = null;
      fy.openingBalancesCarriedForward = false;
      await fy.save({ transaction: t });

      await AuditLog.create({
        action: 'FISCAL_YEAR_REOPEN',
        tableName: 'FiscalYear',
        recordId: fy.id,
        newData: JSON.stringify({ status: 'Open', reason }),
        CompanyId: req.companyId,
        UserId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }, { transaction: t });

      await t.commit();

      log.warn(
        { companyId: req.companyId, fiscalYearId: fy.id, userId: req.user.id, reason },
        `Fiscal year reopened: ${fy.name} — Reason: ${reason}`
      );

      res.json({
        data: fy,
        message: `Fiscal year "${fy.name}" has been reopened. Note: Manual balance adjustments may be needed.`,
      });
    } catch (innerErr) {
      await t.rollback();
      throw innerErr;
    }
  } catch (err) {
    next(err);
  }
};

// DELETE /api/fiscal-years/:id
exports.deleteFiscalYear = async (req, res, next) => {
  try {
    const { FiscalYear } = require('../../models');

    const fy = await FiscalYear.findOne({
      where: { id: req.params.id, CompanyId: req.companyId },
    });

    if (!fy) {
      const err = new Error('Fiscal year not found');
      err.statusCode = 404;
      throw err;
    }

    if (fy.status !== 'Open') {
      const err = new Error('Cannot delete a fiscal year that is closing or closed');
      err.statusCode = 400;
      throw err;
    }

    await fy.destroy();

    log.info(
      { companyId: req.companyId, fiscalYearId: fy.id, userId: req.user.id },
      `Fiscal year deleted: ${fy.name}`
    );

    res.json({ message: `Fiscal year "${fy.name}" deleted` });
  } catch (err) {
    next(err);
  }
};
