const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const jwt = require('jsonwebtoken');
const { sequelize } = require('./models');

// 1. Initial Config
dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const corsOptions = {
  origin: true, // Allows any origin to connect (useful for dynamic Vercel preview URLs)
  credentials: true,
  exposedHeaders: ['x-csrf-token']
};

const app = express();
const PORT = process.env.PORT || 5000;

// 2. Middleware Strategy
app.use(cors(corsOptions));
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(require('cookie-parser')()); // Phase 2: needed for httpOnly refresh token cookie
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add global CSRF Protection
const { csrfProtection } = require('./middleware/auth.middleware');
app.use(csrfProtection);

// 3. Authentication Engine (Passport)
require('./config/passport');
app.use(passport.initialize());

// 🚀 CLOUD WORKSPACE HANDLERS (Direct Binding)
app.get('/api/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

app.get('/api/auth/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${CLIENT_URL}/login?error=auth_failed`
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, role: req.user.role, companyId: req.user.activeCompanyId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Phase 2: short-lived access token
    );
    res.redirect(`${CLIENT_URL}/auth-callback?token=${token}`);
  }
);
// 4. Modular Hub Routing
app.use('/api/payment', require('./modules/payment/payment.routes'));
app.use('/api/subscription', require('./modules/subscription/subscription.routes')); // SaaS Razorpay Integration
app.use('/api/support', require('./modules/support/support.routes')); // SaaS Support Ticket System
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/auth/users.routes'));          // User management (ADMIN)
app.use('/api/companies', require('./modules/company/company.routes'));
app.use('/api/groups', require('./modules/accounting/group.routes'));
app.use('/api/ledgers', require('./modules/accounting/ledger.routes'));
app.use('/api/vouchers', require('./modules/accounting/voucher.routes'));
app.use('/api/accounting', require('./modules/accounting/accounting.routes'));
app.use('/api/settings', require('./modules/settings/settings.routes'));
app.use('/api/roles', require('./modules/roles/roles.routes'));

app.use('/api/reports', require('./modules/reports/reports.routes'));
app.use('/api/sales', require('./modules/sales/sales.routes'));
app.use('/api/quotes', require('./modules/sales/quote.routes'));
app.use('/api/inventory', require('./modules/inventory/inventory.routes'));
app.use('/api/reconciliation', require('./modules/reconciliation/reconciliation.routes'));
app.use('/api/bank-feed', require('./modules/bankFeed/bankFeed.routes'));
app.use('/api/cost-centers', require('./modules/accounting/costCenter.routes'));
app.use('/api/currencies', require('./modules/accounting/currency.routes'));
app.use('/api/cost-categories', require('./modules/accounting/costCategory.routes'));
app.use('/api/retainer-invoices', require('./modules/sales/retainerInvoice.routes'));
app.use('/api/recurring-invoices', require('./modules/sales/recurringInvoice.routes'));
app.use('/api/pricelists', require('./modules/inventory/pricelist.routes'));
app.use('/api/:companyId/purchases', require('./modules/purchases/purchases.routes'));
app.use('/api/mail', require('./modules/mail/mail.routes'));
app.use('/api/tax/gst', require('./modules/tax/gst.routes'));
app.use('/api/payroll', require('./modules/payroll/payroll.routes'));
app.use('/api/attendances', require('./modules/payroll/attendance.routes'));
app.use('/api/salary', require('./modules/payroll/salary.routes'));
app.use('/api/fixed-assets', require('./modules/fixed_assets/fixedAssets.routes'));
app.use('/api/manufacturing', require('./modules/manufacturing/manufacturing.routes'));
app.use('/api/budgets', require('./modules/budgeting/budgeting.routes'));
app.use('/api/delivery-challans', require('./modules/sales/deliveryChallan.routes'));
app.use('/api/credit-notes', require('./modules/sales/creditNote.routes'));
app.use('/api/projects', require('./modules/time_tracking/project.routes'));
app.use('/api/timesheets', require('./modules/time_tracking/timesheet.routes'));
// 5. Health Check
app.get('/api/ping', (req, res) => res.json({ status: 'active', platform: 'Tally Replica' }));

app.get('/api/debug-logs', async (req, res) => {
  try {
    const { sequelize } = require('./models');
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT \'COMPLETED\';');
    require('fs').writeFileSync('debug_dump.json', JSON.stringify({ success: "ALTER SUCCESS" }));
    res.json({ success: true });
  } catch (err) {
    require('fs').writeFileSync('debug_dump.json', JSON.stringify({ error: err.message, stack: err.stack }));
    res.json({ error: err.message });
  }
});

// 6. DB Sync & Boot Strategy
const dialect = process.env.DB_DIALECT || 'sqlite';
const syncOptions = dialect === 'sqlite' ? { alter: true } : {}; // Disabled alter for Postgres to avoid Enum cast crashes

sequelize.sync(syncOptions).then(async () => {
  console.log(`✅ Ledger Database Synced [${dialect}]`);
  
  // Auto-migrate missing columns to prevent Sequelize errors
  try {
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT \'COMPLETED\';').catch(() => {});
    console.log('✅ Added status column to AuditLogs');
  } catch (e) {
    if (e.message && !e.message.includes('duplicate column')) {
      console.log('⚠️ Minor DB Migrations (Ignored):', e.message);
    }
  }

  try {
    const queries = [
      'ALTER TABLE "Users" ADD COLUMN "pendingEmail" VARCHAR(255);',
      'ALTER TABLE "Users" ADD COLUMN "emailVerificationToken" VARCHAR(255);',
      'ALTER TABLE "Users" ADD COLUMN "emailVerificationExpiry" TIMESTAMP WITH TIME ZONE;',
      'ALTER TABLE "Users" ADD COLUMN "isEmailVerified" BOOLEAN DEFAULT false;',
      'ALTER TABLE "Users" ADD COLUMN "resetPasswordToken" VARCHAR(255);',
      'ALTER TABLE "Users" ADD COLUMN "resetPasswordExpiry" TIMESTAMP WITH TIME ZONE;',
      'ALTER TABLE "Users" ADD COLUMN "notificationPreferences" JSON;',
      'ALTER TABLE "Users" ADD COLUMN "oauthOnly" BOOLEAN DEFAULT false;',
      'ALTER TABLE "Users" ADD COLUMN "failedLoginAttempts" INTEGER DEFAULT 0;',
      'ALTER TABLE "Users" ADD COLUMN "lockedUntil" TIMESTAMP WITH TIME ZONE;',
      'ALTER TABLE "Ledgers" ADD COLUMN "tdsApplicable" BOOLEAN DEFAULT false;',
      'ALTER TABLE "SalesInvoiceItems" ADD COLUMN "gstRate" FLOAT DEFAULT 0;',
      'ALTER TABLE "SalesOrderItems" ADD COLUMN "gstRate" FLOAT DEFAULT 0;'
    ];
    for (const q of queries) {
      await sequelize.query(q).catch(e => {
        // Ignore column already exists errors
        if (!e.message.includes('already exists') && !e.message.includes('multiple assignments')) {
           console.log('Migration note:', e.message);
        }
      });
    }
  } catch (err) {
    console.error('Migration block error:', err.message);
  }

  // Load Background Jobs
  require('./jobs/inventoryAlerts');

    // Initialize jobs
    try {
      const { initScheduler } = require('./jobs/reportScheduler');
      await initScheduler();
    } catch(err) {
      console.error('Failed to init report scheduler', err);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}.`);
    });
}).catch(err => {
  console.error('❌ Critical Hub Entry Failure:', err.message);
  process.exit(1);
});
