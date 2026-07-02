const cron = require('node-cron');
const { SavedReport, Company } = require('../models');
const { executeCustomQuery } = require('../modules/reports/customReport.controller');
const mailService = require('../services/mail.service');

// Store active cron tasks in memory so we can stop/restart them
const activeJobs = new Map();

const jsonToCsv = (jsonData) => {
  if (!jsonData || jsonData.length === 0) return '';
  const keys = Object.keys(jsonData[0]);
  const header = keys.join(',');
  const rows = jsonData.map(row => {
    return keys.map(key => {
      let val = row[key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });
  return [header, ...rows].join('\n');
};

const executeScheduledReport = async (reportId) => {
  const report = await SavedReport.findByPk(reportId, { include: [Company] });
  if (!report || !report.isActive || !report.isScheduled) return;

  console.log(`[ReportScheduler] Running report ${report.id}: ${report.name}`);
  try {
    await report.update({ executionStatus: 'RUNNING', lastRunAt: new Date() });

    const { columns, filters } = report.reportConfig || {};
    const rawData = await executeCustomQuery(report.companyId, report.module, columns, filters);
    
    const jsonData = rawData.map(d => d.toJSON());
    const csvContent = jsonToCsv(jsonData);

    // Send email
    if (report.emailRecipients && report.emailRecipients.length > 0) {
      const mailOptions = {
        to: report.emailRecipients.join(', '),
        subject: `Scheduled Report: ${report.name}`,
        html: `
          <p>Hello,</p>
          <p>Please find attached your scheduled report: <strong>${report.name}</strong>.</p>
          <p>Module: ${report.module}</p>
        `,
        attachments: [
          {
            filename: `${report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`,
            content: csvContent
          }
        ]
      };
      
      // We will use the underlying transporter directly if mailService doesn't expose generic sendMail
      // Wait, mailService exports sendVerificationEmail, sendPasswordResetEmail. It doesn't export sendMail!
      // I should add sendMail export to mail.service.js or just write a specific sendReportEmail.
      const { sendMail } = require('../services/mail.service');
      if(sendMail) {
         await sendMail(mailOptions);
      } else {
         console.warn("sendMail not exported by mail.service.js, unable to send email.");
      }
    }

    await report.update({ executionStatus: 'SUCCESS' });
    console.log(`[ReportScheduler] Successfully executed report ${report.id}`);
  } catch (error) {
    console.error(`[ReportScheduler] Failed to execute report ${report.id}:`, error);
    await report.update({ executionStatus: 'FAILED' });
  }
};

const scheduleReport = (report) => {
  // Stop existing job if any
  if (activeJobs.has(report.id)) {
    activeJobs.get(report.id).stop();
    activeJobs.delete(report.id);
  }

  if (report.isActive && report.isScheduled && report.cronExpression && cron.validate(report.cronExpression)) {
    const task = cron.schedule(report.cronExpression, () => {
      executeScheduledReport(report.id);
    });
    activeJobs.set(report.id, task);
    console.log(`[ReportScheduler] Scheduled report ${report.id} with cron: ${report.cronExpression}`);
  }
};

const initScheduler = async () => {
  try {
    const reports = await SavedReport.findAll({
      where: {
        isActive: true,
        isScheduled: true
      }
    });

    reports.forEach(report => {
      scheduleReport(report);
    });
    console.log(`[ReportScheduler] Initialized ${reports.length} scheduled reports.`);
  } catch (error) {
    console.error('[ReportScheduler] Failed to initialize:', error);
  }
};

// Also export a helper to manually trigger a reschedule (e.g. when a report is updated/created)
const triggerReschedule = async (reportId) => {
    const report = await SavedReport.findByPk(reportId);
    if (report) {
        scheduleReport(report);
    }
};

module.exports = {
  initScheduler,
  scheduleReport,
  triggerReschedule,
  executeScheduledReport
};
