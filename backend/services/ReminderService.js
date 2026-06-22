const { SalesInvoice, Ledger, Company, AuditLog, AppNotification, SystemMail } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const nodemailer = require('nodemailer');

class ReminderService {
  /**
   * Validates email format.
   */
  static isValidEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  /**
   * Process all pending payment reminders
   */
  static async processPaymentReminders(companyId = null) {
    try {
      console.log('--- STARTING SMART PAYMENT REMINDERS ---');
      
      const whereClause = {
        status: { [Op.notIn]: ['Paid', 'Void'] },
        balance: { [Op.gt]: 0 },
        dueDate: { [Op.not]: null }
      };

      if (companyId) {
        whereClause.CompanyId = companyId;
      }

      const invoices = await SalesInvoice.findAll({
        where: whereClause,
        include: [
          { model: Ledger, as: 'CustomerLedger', attributes: ['id', 'name', 'email'] },
          { model: Company, attributes: ['id', 'name', 'email'] }
        ]
      });

      let sentCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      const today = moment().startOf('day');

      for (const invoice of invoices) {
        try {
          const dueDate = moment(invoice.dueDate).startOf('day');
          const daysDiff = today.diff(dueDate, 'days'); // + means overdue, - means upcoming

          let reminderType = null;
          let emailSubject = '';
          let emailBody = '';

          // RULES CONFIGURATION
          if (daysDiff === -3) {
            reminderType = 'UPCOMING';
            emailSubject = `Upcoming Payment Reminder: Invoice ${invoice.invoiceNumber}`;
            emailBody = `Dear ${invoice.CustomerLedger.name},\n\nThis is a friendly reminder that Invoice ${invoice.invoiceNumber} for ${invoice.balance} is due on ${dueDate.format('YYYY-MM-DD')}.`;
          } else if (daysDiff === 1) {
            reminderType = 'OVERDUE';
            emailSubject = `Overdue Notice: Invoice ${invoice.invoiceNumber}`;
            emailBody = `Dear ${invoice.CustomerLedger.name},\n\nYour Invoice ${invoice.invoiceNumber} for ${invoice.balance} was due yesterday. Please arrange for payment at your earliest convenience.`;
          } else if (daysDiff === 7) {
            reminderType = 'FINAL';
            emailSubject = `Final Notice: Invoice ${invoice.invoiceNumber}`;
            emailBody = `Dear ${invoice.CustomerLedger.name},\n\nYour Invoice ${invoice.invoiceNumber} for ${invoice.balance} is 7 days overdue. Please submit payment immediately.`;
          }

          // Not a milestone day
          if (!reminderType) {
            continue;
          }

          // Duplicate protection
          if (invoice.lastReminderType === reminderType) {
            console.log(`Skipping Invoice ${invoice.invoiceNumber}: ${reminderType} reminder already sent.`);
            skippedCount++;
            continue;
          }

          // Email Validation
          const customerEmail = invoice.CustomerLedger.email;
          if (!this.isValidEmail(customerEmail)) {
            const warningMsg = `Failed to send ${reminderType} reminder for Invoice ${invoice.invoiceNumber}. Invalid or missing email for customer ${invoice.CustomerLedger.name}.`;
            console.log(warningMsg);
            
            await AppNotification.create({
              message: warningMsg,
              type: 'WARNING',
              CompanyId: invoice.CompanyId
            });

            await AuditLog.create({
              action: 'REMINDER_FAILED',
              entityType: 'SalesInvoice',
              entityId: invoice.id,
              details: warningMsg,
              CompanyId: invoice.CompanyId
            });
            
            errorCount++;
            continue;
          }

          // DISPATCH EMAIL
          const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
          const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
          const userEmail = process.env.SMTP_USER || process.env.MAIL_USER;
          const userPass = process.env.SMTP_PASS || process.env.MAIL_PASS;

          if (!userEmail || !userPass) {
             throw new Error('SMTP credentials are not configured on the server. Please define SMTP_USER and SMTP_PASS.');
          }

          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: userEmail,
              pass: userPass
            },
            tls: {
                rejectUnauthorized: false
            }
          });

          const mailOptions = {
            from: userEmail,
            to: customerEmail,
            subject: emailSubject,
            text: emailBody,
            html: emailBody.replace(/\n/g, '<br/>')
          };

          await transporter.sendMail(mailOptions);
          
          await SystemMail.create({
            CompanyId: invoice.CompanyId,
            LedgerId: invoice.CustomerLedger.id,
            toEmail: customerEmail,
            fromEmail: userEmail,
            subject: emailSubject,
            body: emailBody,
            status: 'Sent',
            type: 'Reminder'
          });

          console.log(`\n📧 [EMAIL SENT SUCCESSFULLY] to: ${customerEmail}`);

          // Update Status
          invoice.lastReminderDate = new Date();
          invoice.lastReminderType = reminderType;
          invoice.reminderCount += 1;
          await invoice.save();

          // Log Success
          const successMsg = `Successfully sent ${reminderType} reminder for Invoice ${invoice.invoiceNumber} to ${customerEmail}.`;
          
          await AuditLog.create({
            action: 'REMINDER_SENT',
            entityType: 'SalesInvoice',
            entityId: invoice.id,
            details: successMsg,
            CompanyId: invoice.CompanyId
          });

          await AppNotification.create({
            message: `Sent ${reminderType} reminder to ${invoice.CustomerLedger.name} for Invoice ${invoice.invoiceNumber}.`,
            type: 'SUCCESS',
            CompanyId: invoice.CompanyId
          });

          sentCount++;

        } catch (err) {
          console.error(`Error processing reminder for Invoice ${invoice.id}:`, err);
          errorCount++;
        }
      }

      console.log(`--- REMINDERS COMPLETED | Sent: ${sentCount} | Skipped Dupes: ${skippedCount} | Errors/Invalid Emails: ${errorCount} ---`);
      
      return {
        success: true,
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount
      };

    } catch (error) {
      console.error('Fatal Error in ReminderService:', error);
      throw error;
    }
  }
}

module.exports = ReminderService;
