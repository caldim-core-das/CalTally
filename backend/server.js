// Forced reload for nodemon configuration updates
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
app.use('/api/v1/financial-closing', require('./modules/financial-closing/routes/financialClosing.routes'));
app.use('/api/v1/user-access', require('./modules/user-access/userAccess.routes'));
app.use('/api/v1/reports/product-registers', require('./modules/reports/routes/productRegisters.routes'));
app.use('/api/v1/settlements', require('./modules/settlement/routes/settlement.routes'));
// 5. Health Check
app.get('/api/ping', (req, res) => res.json({ status: 'active', platform: 'Tally Replica' }));

// 5.1 Interactive API Documentation (OpenAPI / Swagger Spec)
const openapiSpecification = {
  openapi: "3.0.0",
  info: {
    title: "CalBooks Cloud Accounting Platform API Reference",
    version: "1.0.0",
    description: "Interactive API Catalogue covering Identity, Ledgers, Receivables, Payables, and Reporting modules."
  },
  paths: {
    "/api/auth/login": {
      post: {
        summary: "User Authentication",
        description: "Logs in a user and returns an authentication token.",
        responses: {
          200: { description: "Successful login" }
        }
      }
    },
    "/api/ledgers": {
      get: {
        summary: "List Ledgers",
        description: "Retrieves a list of accounts (Ledgers) for the company.",
        responses: {
          200: { description: "List of ledgers" }
        }
      }
    },
    "/api/sales-invoices": {
      post: {
        summary: "Create Invoice",
        description: "Records a new customer sales invoice.",
        responses: {
          201: { description: "Invoice created" }
        }
      }
    },
    "/api/bills": {
      post: {
        summary: "Record Purchase Bill",
        description: "Records an incoming vendor bill.",
        responses: {
          201: { description: "Bill recorded" }
        }
      }
    },
    "/api/reports/trial-balance/:companyId": {
      get: {
        summary: "Fetch Trial Balance",
        description: "Generates the company's real-time Trial Balance report.",
        responses: {
          200: { description: "Trial Balance payload" }
        }
      }
    }
  }
};

app.get('/api/docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>CalBooks API Specifications Reference</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    </head>
    <body style="margin: 0; background: #fafafa;">
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            spec: ${JSON.stringify(openapiSpecification)},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.presets.SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout"
          });
        };
      </script>
    </body>
    </html>
  `);
});

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

app.get('/api/test-sprint0', async (req, res) => {
  try {
    const testPath = require.resolve('./tests/sprint0.test');
    delete require.cache[testPath];
    const runSprint0Tests = require('./tests/sprint0.test');
    await runSprint0Tests();
    const fs = require('fs');
    let results = 'NO LOG FILE FOUND';
    if (fs.existsSync('sprint0_test_results.log')) {
      results = fs.readFileSync('sprint0_test_results.log', 'utf8');
    }
    res.json({ success: true, logs: results });
  } catch (err) {
    res.json({ success: false, error: err.message, stack: err.stack });
  }
});

app.get('/api/test-sprint1', async (req, res) => {
  try {
    const testPath = require.resolve('./tests/sprint1.test');
    delete require.cache[testPath];
    const runSprint1Tests = require('./tests/sprint1.test');
    await runSprint1Tests();
    const fs = require('fs');
    let results = 'NO LOG FILE FOUND';
    if (fs.existsSync('sprint1_test_results.log')) {
      results = fs.readFileSync('sprint1_test_results.log', 'utf8');
    }
    res.json({ success: true, logs: results });
  } catch (err) {
    res.json({ success: false, error: err.message, stack: err.stack });
  }
});

app.get('/api/test-sprint2', async (req, res) => {
  try {
    const testPath = require.resolve('./tests/sprint2.test');
    delete require.cache[testPath];
    const runSprint2Tests = require('./tests/sprint2.test');
    await runSprint2Tests();
    const fs = require('fs');
    let results = 'NO LOG FILE FOUND';
    if (fs.existsSync('sprint2_test_results.log')) {
      results = fs.readFileSync('sprint2_test_results.log', 'utf8');
    }
    res.json({ success: true, logs: results });
  } catch (err) {
    res.json({ success: false, error: err.message, stack: err.stack });
  }
});

app.get('/api/test-sprint3', async (req, res) => {
  try {
    const testPath = require.resolve('./tests/sprint3.test');
    delete require.cache[testPath];
    const runSprint3Tests = require('./tests/sprint3.test');
    await runSprint3Tests();
    const fs = require('fs');
    let results = 'NO LOG FILE FOUND';
    if (fs.existsSync('sprint3_test_results.log')) {
      results = fs.readFileSync('sprint3_test_results.log', 'utf8');
    }
    res.json({ success: true, logs: results });
  } catch (err) {
    res.json({ success: false, error: err.message, stack: err.stack });
  }
});

app.get('/api/test-sprint4', async (req, res) => {
  try {
    const testPath = require.resolve('./tests/sprint4.test');
    delete require.cache[testPath];
    const runSprint4Tests = require('./tests/sprint4.test');
    await runSprint4Tests();
    const fs = require('fs');
    let results = 'NO LOG FILE FOUND';
    if (fs.existsSync('sprint4_test_results.log')) {
      results = fs.readFileSync('sprint4_test_results.log', 'utf8');
    }
    res.json({ success: true, logs: results });
  } catch (err) {
    res.json({ success: false, error: err.message, stack: err.stack });
  }
});

app.get('/api/test-sprint5', async (req, res) => {
  try {
    const testPath = require.resolve('./tests/sprint5.test');
    delete require.cache[testPath];
    const runSprint5Tests = require('./tests/sprint5.test');
    await runSprint5Tests();
    const fs = require('fs');
    let results = 'NO LOG FILE FOUND';
    if (fs.existsSync('sprint5_test_results.log')) {
      results = fs.readFileSync('sprint5_test_results.log', 'utf8');
    }
    res.json({ success: true, logs: results });
  } catch (err) {
    res.json({ success: false, error: err.message, stack: err.stack });
  }
});

app.get('/api/test-sprint6', async (req, res) => {
  try {
    const testPath = require.resolve('./tests/sprint6.test');
    delete require.cache[testPath];
    const runSprint6Tests = require('./tests/sprint6.test');
    await runSprint6Tests();
    const fs = require('fs');
    let results = 'NO LOG FILE FOUND';
    if (fs.existsSync('sprint6_test_results.log')) {
      results = fs.readFileSync('sprint6_test_results.log', 'utf8');
    }
    res.json({ success: true, logs: results });
  } catch (err) {
    res.json({ success: false, error: err.message, stack: err.stack });
  }
});

// 6. DB Sync & Boot Strategy
const dialect = process.env.DB_DIALECT || 'sqlite';

sequelize.sync(syncOptions).then(async () => {
  console.log(`✅ Ledger Database Synced [${dialect}]`);

  // Auto-migrate missing columns to prevent Sequelize errors
  try {
    await sequelize.query('ALTER TABLE "AuditLogs" ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT \'COMPLETED\';').catch(() => { });
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
      'ALTER TABLE "Users" ADD COLUMN "department" VARCHAR(255) DEFAULT \'Accounts\';',
      'ALTER TABLE "Users" ADD COLUMN "status" VARCHAR(255) DEFAULT \'ACTIVE\';',
      'ALTER TABLE "Users" ADD COLUMN "lastLoginAt" TIMESTAMP WITH TIME ZONE;',
      'ALTER TABLE "Ledgers" ADD COLUMN "tdsApplicable" BOOLEAN DEFAULT false;',
      'ALTER TABLE "SalesInvoiceItems" ADD COLUMN "gstRate" FLOAT DEFAULT 0;',
      'ALTER TABLE "SalesOrderItems" ADD COLUMN "gstRate" FLOAT DEFAULT 0;',
      'ALTER TABLE "SalesInvoices" ADD COLUMN "lastReminderDate" TIMESTAMP WITH TIME ZONE;',
      'ALTER TABLE "SalesInvoices" ADD COLUMN "reminderCount" INTEGER DEFAULT 0;',
      'ALTER TABLE "SalesInvoices" ADD COLUMN "lastReminderType" VARCHAR(255);',
      'ALTER TABLE "UserCompanies" ADD COLUMN "customRoleId" INTEGER;',
      'ALTER TABLE "AuditLogs" ADD COLUMN "hash" VARCHAR(255);',
      'ALTER TABLE "AuditLogs" ADD COLUMN "previousHash" VARCHAR(255);',
      'ALTER TABLE "Vouchers" ADD COLUMN "eventId" VARCHAR(255);',
      'CREATE TABLE IF NOT EXISTS "MonthlyTaxSummaries" (' +
      ' "id" VARCHAR(255) PRIMARY KEY,' +
      ' "CompanyId" VARCHAR(255) NOT NULL,' +
      ' "month" INTEGER NOT NULL,' +
      ' "year" INTEGER NOT NULL,' +
      ' "sales" DOUBLE PRECISION DEFAULT 0,' +
      ' "purchase" DOUBLE PRECISION DEFAULT 0,' +
      ' "outputGST" DOUBLE PRECISION DEFAULT 0,' +
      ' "inputGST" DOUBLE PRECISION DEFAULT 0,' +
      ' "tds" DOUBLE PRECISION DEFAULT 0,' +
      ' "tcs" DOUBLE PRECISION DEFAULT 0,' +
      ' "version" INTEGER DEFAULT 1,' +
      ' "lastVoucherIncluded" VARCHAR(255),' +
      ' "generatedBy" VARCHAR(255),' +
      ' "generatedAt" TIMESTAMP WITH TIME ZONE,' +
      ' "isLocked" BOOLEAN DEFAULT false,' +
      ' "createdAt" TIMESTAMP WITH TIME ZONE,' +
      ' "updatedAt" TIMESTAMP WITH TIME ZONE' +
      ');'
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

  // Initialize FCCF closing scheduler
  try {
    const ClosingScheduler = require('./modules/financial-closing/scheduler/ClosingScheduler');
    ClosingScheduler.initialize();
  } catch (err) {
    console.error('Failed to initialize FCCF scheduler', err);
  }

  // Initialize jobs
  try {
    const { initScheduler } = require('./jobs/reportScheduler');
    await initScheduler();
  } catch (err) {
    console.error('Failed to init report scheduler', err);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
    
    // Run Sprint 0 tests on boot
    const runSprint0Tests = require('./tests/sprint0.test');
    runSprint0Tests().catch(err => console.error('Sprint 0 test boot failed:', err));
  });
}).catch(err => {
  console.error('❌ Critical Hub Entry Failure:', err.message);
  try {
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, 'sync_error.log'), `Sync Error at ${new Date().toISOString()}:\n${err.message}\n${err.stack}\n`);
  } catch (e) {}
  process.exit(1);
});

// Nodemon trigger comment for Sprint 0 tests rerun
