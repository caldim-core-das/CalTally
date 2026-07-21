const ReportEngine = require('../engine/ReportEngine');
const ReportRegistry = require('../engine/ReportRegistry');
const WorkflowEngine = require('../engine/WorkflowEngine');
const SalesDefinition = require('../reports/definitions/tax/Sales');
const PurchaseDefinition = require('../reports/definitions/tax/Purchase');
const GSTDefinition = require('../reports/definitions/tax/GST');
const TDSDefinition = require('../reports/definitions/tax/TDS');
const TCSDefinition = require('../reports/definitions/tax/TCS');
const { MonthlyTaxSummary, FinancialPeriod, SalesInvoice, Voucher, Transaction, Ledger, Group } = require('../../../models');
const { Op } = require('sequelize');

const definitions = {
  sales: SalesDefinition,
  purchases: PurchaseDefinition,
  gst: GSTDefinition,
  tds: TDSDefinition,
  tcs: TCSDefinition
};

class FinancialClosingController {
  /**
   * GET /api/v1/financial-closing/month-end
   * Compiles or fetches cached closing metrics for the dashboard.
   */
  static async getMonthEndSummary(req, res) {
    try {
      const { companyId, month, year, fromDate, toDate } = req.query;

      if (!companyId || !fromDate || !toDate) {
        return res.status(400).json({ error: 'companyId, fromDate, and toDate are required.' });
      }

      // Check if there is a cached summary locked
      const cached = await MonthlyTaxSummary.findOne({
        where: {
          CompanyId: companyId,
          month: Number(month) || new Date(fromDate).getMonth() + 1,
          year: Number(year) || new Date(fromDate).getFullYear()
        }
      });

      if (cached) {
        return res.json({
          status: cached.isLocked ? 'LOCKED' : 'DRAFT',
          version: cached.version,
          generatedBy: 'Admin',
          generatedOn: cached.generatedAt,
          lastVoucher: cached.lastVoucherIncluded || 'N/A',
          kpis: {
            sales: cached.sales,
            purchase: cached.purchase,
            outputGST: cached.outputGST,
            inputGST: cached.inputGST,
            tds: cached.tds,
            tcs: cached.tcs
          }
        });
      }

      // Live compilation if cache doesn't exist
      const salesReport = await ReportEngine.buildReport(SalesDefinition, { companyId, fromDate, toDate });
      const purchaseReport = await ReportEngine.buildReport(PurchaseDefinition, { companyId, fromDate, toDate });
      const gstReport = await ReportEngine.buildReport(GSTDefinition, { companyId, fromDate, toDate });
      const tdsReport = await ReportEngine.buildReport(TDSDefinition, { companyId, fromDate, toDate });
      const tcsReport = await ReportEngine.buildReport(TCSDefinition, { companyId, fromDate, toDate });

      res.json({
        status: 'DRAFT',
        version: 1,
        generatedBy: 'Admin',
        generatedOn: new Date().toISOString(),
        lastVoucher: 'N/A',
        kpis: {
          sales: salesReport.kpis.totalSales || 0,
          purchase: purchaseReport.kpis.totalPurchase || 0,
          outputGST: gstReport.kpis.outputGST || 0,
          inputGST: gstReport.kpis.inputGST || 0,
          tds: tdsReport.kpis.tdsDeducted || 0,
          tcs: tcsReport.kpis.tcsCollected || 0
        }
      });
    } catch (err) {
      console.error('[FCCF Controller Error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/v1/financial-closing/month-end/trends
   * Compiles live 3-month trend metrics (M-2, M-1, This) from database registers.
   */
  static async getMonthEndTrends(req, res) {
    try {
      const { companyId, toDate } = req.query;

      if (!companyId || !toDate) {
        return res.status(400).json({ error: 'companyId and toDate are required.' });
      }

      const refDate = new Date(toDate);
      if (isNaN(refDate.getTime())) {
        return res.status(400).json({ error: 'Invalid toDate format.' });
      }

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const months = [];

      for (let i = 2; i >= 0; i--) {
        const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();

        const pad = (n) => String(n).padStart(2, '0');
        const firstDay = `${y}-${pad(m + 1)}-01`;
        const lastDayNum = new Date(y, m + 1, 0).getDate();
        const lastDay = `${y}-${pad(m + 1)}-${pad(lastDayNum)}`;

        const tag = i === 0 ? 'This' : `M-${i}`;
        const label = monthNames[m];

        months.push({ tag, label, fromDate: firstDay, toDate: lastDay });
      }

      const trendResults = await Promise.all(
        months.map(async (mInfo) => {
          const filters = { companyId, fromDate: mInfo.fromDate, toDate: mInfo.toDate };
          const [salesReport, purchaseReport, gstReport] = await Promise.all([
            ReportEngine.buildReport(SalesDefinition, filters),
            ReportEngine.buildReport(PurchaseDefinition, filters),
            ReportEngine.buildReport(GSTDefinition, filters)
          ]);

          const sales = salesReport?.kpis?.totalSales || 0;
          const purchases = purchaseReport?.kpis?.totalPurchase || 0;
          const outputGST = gstReport?.kpis?.outputGST || 0;
          const inputGST = gstReport?.kpis?.inputGST || 0;

          return {
            salesVsPurchase: {
              name: `${mInfo.tag} (${mInfo.label})`,
              month: mInfo.label,
              Sales: sales,
              Purchases: purchases
            },
            gstTrend: {
              name: `${mInfo.tag} (${mInfo.label})`,
              month: mInfo.label,
              Output: outputGST,
              Input: inputGST
            }
          };
        })
      );

      res.json({
        salesVsPurchaseData: trendResults.map(t => t.salesVsPurchase),
        gstTrendData: trendResults.map(t => t.gstTrend)
      });
    } catch (err) {
      console.error('[FCCF Trends Controller Error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/v1/financial-closing/month-end/:reportKey
   * Compiles detailed records for a sub-report (sales, purchases, gst).
   */
  static async getReportDetails(req, res) {
    try {
      const { reportKey } = req.params;
      const { companyId, fromDate, toDate } = req.query;

      const registryEntry = ReportRegistry.getReport(reportKey);
      const definition = definitions[reportKey];

      if (!registryEntry || !definition) {
        return res.status(404).json({ error: `Report ${reportKey} not found in FCCF Registry.` });
      }

      const reportOutput = await ReportEngine.buildReport(definition, { companyId, fromDate, toDate });
      res.json(reportOutput);
    } catch (err) {
      console.error('[FCCF Details Controller Error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/v1/financial-closing/month-end/diagnostics
   * Compiles compliance anomalies and exception warnings for audit tables.
   */
  static async runDiagnostics(req, res) {
    try {
      const { companyId, fromDate, toDate } = req.query;
      if (!companyId || !fromDate || !toDate) {
        return res.status(400).json({ error: 'companyId, fromDate, and toDate are required.' });
      }

      const ExceptionEngine = require('../engine/ExceptionEngine');
      const exceptions = await ExceptionEngine.runDiagnostics({ companyId, fromDate, toDate });
      res.json({ success: true, exceptions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/v1/financial-closing/snapshots
   * Freezes a report output as an immutable JSON snapshot.
   */
  static async createSnapshot(req, res) {
    try {
      const { companyId, reportType, periodStart, periodEnd, reportPayload } = req.body;
      const userId = req.user ? req.user.id : null;

      const SnapshotService = require('../services/SnapshotService');
      const snapshot = await SnapshotService.createSnapshot({
        companyId,
        reportType,
        periodStart,
        periodEnd,
        reportPayload,
        userId
      });

      res.status(201).json({ success: true, id: snapshot.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/v1/financial-closing/snapshots/verify
   * Verifies the cryptographic database snapshots hash-chain.
   */
  static async verifySnapshots(req, res) {
    try {
      const { companyId } = req.query;
      if (!companyId) {
        return res.status(400).json({ error: 'companyId is required.' });
      }

      const SnapshotService = require('../services/SnapshotService');
      const result = await SnapshotService.verifyChainIntegrity(companyId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/v1/financial-closing/audit-log
   * Appends an export or closing event to the hash-chained audit log.
   */
  static async logExportEvent(req, res) {
    try {
      const { companyId, action, reportType, details } = req.body;
      const userId = req.user ? req.user.id : null;

      const AuditLedgerService = require('../services/AuditLedgerService');
      const event = await AuditLedgerService.logEvent({
        companyId,
        userId,
        action,
        reportType,
        details
      });

      res.status(201).json({ success: true, hash: event.hash });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = FinancialClosingController;
