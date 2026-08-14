const cron = require('node-cron');
const { Company } = require('../../../models');
const ExceptionEngine = require('../engine/ExceptionEngine');
const NotificationService = require('../services/NotificationService');

class ClosingScheduler {
  /**
   * Initializes background cron schedules to execute compliance checks.
   */
  static initialize() {
    console.log('[FCCF Scheduler] Initializing background compliance schedules...');

    // Run monthly on the 1st day of the month at 00:00 (midnight)
    cron.schedule('0 0 1 * *', async () => {
      console.log('[FCCF Scheduler] Running monthly month-end closing check...');
      try {
        const companies = await Company.findAll();
        const now = new Date();
        
        // Target preceding month date ranges
        const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const fromDate = firstDayPrevMonth.toISOString().split('T')[0];
        const toDate = lastDayPrevMonth.toISOString().split('T')[0];

        for (const company of companies) {
          const companyId = company.id;
          const exceptions = await ExceptionEngine.runDiagnostics({ companyId, fromDate, toDate });
          
          const criticalCount = exceptions.filter(e => e.severity === 'critical').length;
          const warningCount = exceptions.filter(e => ['high', 'medium'].includes(e.severity)).length;

          if (criticalCount > 0) {
            await NotificationService.triggerNotification({
              companyId,
              message: `FCCF Alert: Found ${criticalCount} critical compliance violations during month-end diagnostics. Resolve immediately to close books.`,
              type: 'ERROR',
              actionLink: '/financial-closing/wizard'
            });
          } else if (warningCount > 0) {
            await NotificationService.triggerNotification({
              companyId,
              message: `FCCF Warning: Month-end close diagnostics flagged ${warningCount} warnings. Review exceptions list.`,
              type: 'WARNING',
              actionLink: '/financial-closing/wizard'
            });
          } else {
            await NotificationService.triggerNotification({
              companyId,
              message: `FCCF Check: Ledger records are 100% compliant. Books are ready for closing.`,
              type: 'SUCCESS',
              actionLink: '/financial-closing/wizard'
            });
          }
        }
      } catch (err) {
        console.error('[FCCF Scheduler Error]:', err.message);
      }
    });
  }
}

module.exports = ClosingScheduler;
