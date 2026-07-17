const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const jwt = require('jsonwebtoken');
const { sequelize } = require('./models');
const rateLimit = require('express-rate-limit');
const { logger } = require('./utils/logger');
const correlationId = require('./middleware/correlationId.middleware');
const requestLogger = require('./middleware/requestLogger.middleware');
const securityHeaders = require('./middleware/securityHeaders.middleware');
const { errorHandler } = require('./middleware/errorHandler.middleware');

// --- EA Blueprint Vol 2: EventBus Initialized ---
const eventBus = require('./core/EventBus');
// -------------------------------------------------
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
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disabling temporarily, requires fine-tuning for React apps
}));
app.use(securityHeaders);
app.use(correlationId);
app.use(requestLogger);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests from this IP, please try again later.' } }
});
app.use('/api/', apiLimiter);

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
// app.use(csrfProtection); // TODO: Re-enable after frontend headers are configured

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
app.use('/api/fiscal-years', require('./modules/accounting/fiscalYear.routes'));
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

// Global Error Handler
app.use(errorHandler);

// 6. DB Sync & Boot Strategy
const dialect = process.env.DB_DIALECT || 'sqlite';

sequelize.authenticate().then(async () => {
  logger.info(`✅ Ledger Database Connected [${dialect}]`);

  // Note: sync({ alter: true }) and inline ALTER queries have been removed.
  // Database schema management must now be handled via sequelize-cli migrations.

  // Load Background Jobs
  require('./jobs/inventoryAlerts');

  // Initialize jobs
  try {
    const { initScheduler } = require('./jobs/reportScheduler');
    await initScheduler();
  } catch(err) {
    logger.error({ err }, 'Failed to init report scheduler');
  }

  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}.`);
  });
}).catch(err => {
  logger.fatal({ err }, '❌ Critical Hub Entry Failure');
  process.exit(1);
});
