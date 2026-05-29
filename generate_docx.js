const fs = require('fs');
const docx = require('docx');
const { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    HeadingLevel, 
    AlignmentType, 
    Table, 
    TableRow, 
    TableCell, 
    WidthType, 
    BorderStyle, 
    PageBreak 
} = docx;

// Color constants for professional styling
const PRIMARY_COLOR = "003366";  // Navy blue for headers
const SECONDARY_COLOR = "4682B4"; // Steel blue for subheaders
const CHARCOAL = "333333";        // Charcoal for body text
const LIGHT_GREY = "F2F2F2";      // Background for table headers/shading
const BORDER_GREY = "CCCCCC";      // Border color

// Helper for section headers
function createHeading1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 120 },
        children: [
            new TextRun({
                text: text,
                bold: true,
                color: PRIMARY_COLOR,
                size: 28, // 14pt
            }),
        ],
    });
}

function createHeading2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [
            new TextRun({
                text: text,
                bold: true,
                color: SECONDARY_COLOR,
                size: 24, // 12pt
            }),
        ],
    });
}

function createHeading3(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 60 },
        children: [
            new TextRun({
                text: text,
                bold: true,
                italics: true,
                color: CHARCOAL,
                size: 20, // 10pt
            }),
        ],
    });
}

// Helper for standard paragraphs
function createBodyParagraph(text, isItalic = false) {
    return new Paragraph({
        spacing: { after: 120, line: 276 }, // 1.15 line spacing
        children: [
            new TextRun({
                text: text,
                color: CHARCOAL,
                size: 22, // 11pt
                italics: isItalic
            }),
        ],
    });
}

// Helper for bullet lists
function createBulletParagraph(bulletPoints) {
    return bulletPoints.map(point => {
        return new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60, line: 240 },
            children: [
                new TextRun({
                    text: point.label + ": ",
                    bold: true,
                    color: CHARCOAL,
                    size: 22,
                }),
                new TextRun({
                    text: point.desc,
                    color: CHARCOAL,
                    size: 22,
                })
            ]
        });
    });
}

// Helper for table cells
function createTableCell(text, isHeader = false, widthPercent = 100, align = AlignmentType.LEFT) {
    return new TableCell({
        children: [
            new Paragraph({
                alignment: align,
                children: [
                    new TextRun({
                        text: text,
                        bold: isHeader,
                        color: isHeader ? "FFFFFF" : CHARCOAL,
                        size: 20, // 10pt
                    }),
                ],
            }),
        ],
        shading: {
            fill: isHeader ? PRIMARY_COLOR : "FFFFFF",
        },
        width: {
            size: widthPercent,
            type: WidthType.PERCENTAGE,
        },
        margins: {
            top: 120,
            bottom: 120,
            left: 120,
            right: 120,
        },
    });
}

// Start Document construction
const doc = new Document({
    sections: [{
        properties: {},
        children: [
            // ==========================================
            // COVER PAGE
            // ==========================================
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 1800 },
                children: [
                    new TextRun({
                        text: "CLOUD TALLY REPLICA",
                        bold: true,
                        color: PRIMARY_COLOR,
                        size: 56, // 28pt
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                    new TextRun({
                        text: "Multi-Tenant Enterprise Accounting & SaaS Blueprint",
                        size: 28, // 14pt
                        color: SECONDARY_COLOR,
                        italics: true
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 1200 },
                children: [
                    new TextRun({
                        text: "A Comprehensive Review of Architecture, Existing Modules, Solved Engineering Flaws, and high-level SaaS Roadmap.",
                        size: 22, // 11pt
                        color: CHARCOAL,
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 2400 },
                children: [
                    new TextRun({
                        text: "Prepared for: Caldimengg / Tally Accounting Team\n",
                        bold: true,
                        color: CHARCOAL,
                        size: 20,
                    }),
                    new TextRun({
                        text: "Prepared by: Antigravity AI Co-Pilot\n",
                        bold: true,
                        color: CHARCOAL,
                        size: 20,
                    }),
                    new TextRun({
                        text: "Date: May 2026",
                        color: CHARCOAL,
                        size: 20,
                    }),
                ],
            }),

            new PageBreak(),

            // ==========================================
            // SECTION 1: EXECUTIVE SUMMARY
            // ==========================================
            createHeading1("1. Executive Summary"),
            createBodyParagraph(
                "This document presents a comprehensive evaluation of the Cloud Tally Replica platform, a highly scalable, multi-tenant Software-as-a-Service (SaaS) accounting application. Drawing inspiration from standard desktop accounting patterns, the application bridges the gap between classic desktop ledger behaviors and modern cloud scalability."
            ),
            createBodyParagraph(
                "The core engineering philosophy revolves around a Unified Ledger Engine which guarantees rigid double-entry accounting integrity, dynamic multi-tenant workspace isolation, and extensive role-based security. This analysis covers the system architecture, breaks down all active modules, details the resolutions of major transaction flow gaps, and provides an actionable engineering roadmap to elevate the platform to a premium global SaaS product."
            ),

            // ==========================================
            // SECTION 2: SYSTEM ARCHITECTURE
            // ==========================================
            createHeading1("2. Technical & Security Architecture"),
            createBodyParagraph(
                "The platform uses a decoupled backend and frontend stack to separate calculations and rendering. It operates on a multi-tenant scoping pattern that guarantees full data isolation at the ORM query level."
            ),
            
            createHeading2("2.1 Backend Architecture (Node.js & Express)"),
            createBodyParagraph(
                "The backend is built with Node.js and Express.js using a modular domain design. Each functional area (Sales, Purchases, Inventory, Reports) is self-contained with its own routes, controllers, and specific middlewares. The database layer uses Sequelize ORM, which is database-agnostic. Locally, it runs on SQLite for fast development, and in production, it scopes automatically to PostgreSQL or MySQL, ensuring high concurrent transaction throughput."
            ),

            createHeading2("2.2 Frontend Architecture (React & Vite)"),
            createBodyParagraph(
                "The user interface is powered by React 18 built with Vite for optimal build and development speed. It features a modern design language that utilizes Framer Motion for smooth visual state transitions, Redux Toolkit for complex ledger operations, and Zustand for global UI context. High-volume tabular ledger data is rendered via AG-Grid (Enterprise-grade grid system), providing real-time client-side sorting, column filtering, and bulk cell manipulation."
            ),

            createHeading2("2.3 Strict Multi-Tenant Isolation"),
            createBodyParagraph(
                "Multi-tenancy is structured around a Shared Database, Shared Process pattern. Strict tenant segregation is enforced via two primary mechanisms:"
            ),
            ...createBulletParagraph([
                { label: "Company Scoping", desc: "Every database model (Ledger, Item, Voucher, Transaction, PurchaseOrder) is bound to a CompanyId foreign key." },
                { label: "Scoping Middleware", desc: "The tenantAccess middleware intercepts all incoming requests and injects activeCompanyId. This overrides ORM queries to enforce 'where: { CompanyId: req.user.activeCompanyId }', preventing accidental data exposure." },
                { label: "Multi-Company Toggle", desc: "Users can register or belong to multiple corporate workspaces, switching company contexts with one click. This dynamically updates their JWT token without forcing a full logout." }
            ]),

            createHeading2("2.4 Granular Role-Based Access Control (RBAC)"),
            createBodyParagraph(
                "To ensure division of labor and prevent fraudulent entries, a multi-tier RBAC system is enforced. Roles and access rights are summarized in the matrix below:"
            ),

            // Table summarizing RBAC Roles
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            createTableCell("Role Name", true, 20),
                            createTableCell("Scope", true, 20),
                            createTableCell("Key Permissions", true, 60),
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell("SUPER_ADMIN", false, 20),
                            createTableCell("Global Platform", false, 20),
                            createTableCell("Manage multi-tenant billing, cross-company reporting, and system configurations."),
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell("ADMIN", false, 20),
                            createTableCell("Single Company", false, 20),
                            createTableCell("Full company configurations, manage users, audit trails, delete ledger histories."),
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell("ACCOUNTANT", false, 20),
                            createTableCell("Single Company", false, 20),
                            createTableCell("Create and edit Vouchers, Ledger entries, Invoices, Bills, and Stock records."),
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell("MANAGER", false, 20),
                            createTableCell("Single Company", false, 20),
                            createTableCell("Approve draft transactions, verify financial statements, overview workflows."),
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell("AUDITOR", false, 20),
                            createTableCell("Single Company", false, 20),
                            createTableCell("Read-only access to all ledgers and financial statements, exclusive access to system Audit Logs."),
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell("VIEWER", false, 20),
                            createTableCell("Single Company", false, 20),
                            createTableCell("Basic dashboard visibility. View summary reports, no write or adjustment rights."),
                        ]
                    }),
                ]
            }),

            new PageBreak(),

            // ==========================================
            // SECTION 3: COMPREHENSIVE COMPONENT REVIEW
            // ==========================================
            createHeading1("3. Active Modules & Worked Features"),
            createBodyParagraph(
                "The Tally Replica implements a large array of modules that replicate traditional enterprise double-entry workflows, automated stock adjustments, dynamic reports, and interactive tools."
            ),

            createHeading2("3.1 The Unified Ledger & Journal Engine (AccountingService.js)"),
            createBodyParagraph(
                "This engine is the absolute core of the backend system, managing ledger balances and maintaining transaction logs:"
            ),
            ...createBulletParagraph([
                { label: "Double-Entry Verification", desc: "Enforces that the sum of Debits must equal the sum of Credits for every transaction. If a discrepancy exists, the database transaction is immediately aborted." },
                { label: "Sequelize Transaction Isolation", desc: "All entries are processed within atomic database transactions. If writing a journal entry fails midway, any changes to ledgers or stock items are rolled back." },
                { label: "Real-time Ledgers Updates", desc: "Automatically updates ledger current balances when journal lines are successfully posted." },
                { label: "Self-Healing Discovery", desc: "Includes automated discovery of core system accounts (e.g., Sales, Purchases, Duties & Taxes). If missing, it auto-creates them during transactions, preventing system-wide crashes." },
                { label: "Tax & GST Automation", desc: "Calculates intra-state CGST/SGST and inter-state IGST automatically based on company and customer addresses during invoice recording." },
                { label: "Bulk Transaction Engine", desc: "Allows accountants to move bulk journal lines between accounts, automatically recalculating balance histories across all affected ledgers." }
            ]),

            createHeading2("3.2 Sales & Accounts Receivable (Order-to-Cash)"),
            createBodyParagraph(
                "A full sales cycle is implemented, giving businesses precise tracking of customer actions and incoming revenue:"
            ),
            ...createBulletParagraph([
                { label: "Quotes / Proforma Invoices", desc: "Draft estimates that can be converted directly into active sales invoices." },
                { label: "Delivery Challans", desc: "Tracks inventory stock movement and dispatch schedules before formal invoicing." },
                { label: "Sales Invoices", desc: "Tax invoices with GST automation, integrated item lines, and automated real-time accounting posts (Debits Customer, Credits Sales and GST Output)." },
                { label: "Retainer Invoices", desc: "Tracks customer advance payments, holding deposits in liability ledgers until final invoicing." },
                { label: "Recurring Invoices", desc: "Schedules automated templates to generate invoices at monthly, quarterly, or yearly intervals." },
                { label: "Credit Notes", desc: "Processes sales returns, reducing customer receivables and returning items back to inventory." }
            ]),

            createHeading2("3.3 Purchases & Accounts Payable (Procure-to-Pay)"),
            createBodyParagraph(
                "Handles all interactions with vendors and operational expenses, matching outflow records to outstanding obligations:"
            ),
            ...createBulletParagraph([
                { label: "Purchase Orders", desc: "Authorizations sent to suppliers outlining items, quantities, and agreed-upon prices." },
                { label: "Purchase Bills", desc: "Registers incoming bills, debiting corresponding expense/COGS accounts and crediting vendor liabilities." },
                { label: "Recurring Bills & Expenses", desc: "Automates monthly corporate overheads (e.g., office rent, SaaS subscriptions)." },
                { label: "Vendor Credits", desc: "Manages vendor returns, reducing accounts payable balances." },
                { label: "Payments Made", desc: "Records manual payments to vendors, linking payments directly to open bills, calculating unpaid balances, and updating invoice/bill paid status dynamically." }
            ]),

            createHeading2("3.4 Inventory Management"),
            createBodyParagraph(
                "Ensures accurate stock tracking, linking physical warehouse items with ledger transactions:"
            ),
            ...createBulletParagraph([
                { label: "Item Registers", desc: "Defines stock items with SKUs, category grouping, and custom units (e.g., Pcs, Kgs)." },
                { label: "Negative Stock Safeguards", desc: "Validates remaining stock quantities, preventing accidental sales of non-existent items." },
                { label: "Pricelists & Price Levels", desc: "Enables volume-based discounts and specialized vendor/customer pricing schemes." }
            ]),

            createHeading2("3.5 Email Automation & Financial PDF Reports"),
            createBodyParagraph(
                "Connects communication tools and client reporting directly to daily operations:"
            ),
            ...createBulletParagraph([
                { label: "Email Send Modal", desc: "Fully integrated React-Nodemailer email workspace allowing the transmission of documents directly from the UI." },
                { label: "Automated PDF Generation", desc: "Generates clean, professional invoice PDFs on the fly using backend PDFKit and attaches them to outbound customer emails." },
                { label: "Delivery Auditing", desc: "Maintains a full history of sent and failed emails inside the SystemMail table for dispute resolution." }
            ]),

            createHeading2("3.6 Time Tracking & Bank Reconciliation"),
            createBodyParagraph(
                "Supports professional service firms and monthly bank audit procedures:"
            ),
            ...createBulletParagraph([
                { label: "Timesheets", desc: "Logs billable hours for projects, linking time data directly to customer invoices." },
                { label: "Bank Reconciliation Engine", desc: "Matches system transaction rows against physical bank statement lines to reconcile balances." }
            ]),

            new PageBreak(),

            // ==========================================
            // SECTION 4: FLAVOR ANALYSIS & ENGINEERING INTEGRITY
            // ==========================================
            createHeading1("4. Codebase Audit & Architectural Improvements"),
            createBodyParagraph(
                "Reviewing past systems architectures revealed a critical structural flaw. In older iterations, recording vendor payments bypassed the core journal engine. Instead of using the central accounting service, the payment-made controller wrote records directly to the Vouchers and Transactions tables without updating ledger balances or writing audit trails."
            ),
            createHeading2("4.1 Current Status: Solved"),
            createBodyParagraph(
                "An audit of the current codebase confirms this vulnerability has been fixed. The controller `paymentMade.controller.js` has been fully refactored. Both payment creation and update flows are now routed through `AccountingService.recordJournalEntry` and `AccountingService.updateJournalEntry` inside an atomic Sequelize database transaction:"
            ),
            createBodyParagraph(
                "1. Database Transactions: When recording a payment, a transaction (`sequelize.transaction()`) is initialized. Any subsequent failure in the ledger update or bill allocation causes an automatic rollback.\n" +
                "2. Correct Double-Entry Posting: The system automatically posts a DEBIT to the Vendor ledger (reducing the payable liability) and a CREDIT to the Paid Through account (e.g., Bank/Cash), keeping balances accurate.\n" +
                "3. Live Ledger Recalibration: Balance changes are updated in real-time, ensuring cash-on-hand reports remain accurate.\n" +
                "4. Audit Trails: All actions generate an audit trail, capturing critical changes for compliance audits.",
                true
            ),

            new PageBreak(),

            // ==========================================
            // SECTION 5: SAAS EVOLUTION PLAN
            // ==========================================
            createHeading1("5. The SaaS Evolution Plan"),
            createBodyParagraph(
                "To scale this single-instance product into a multi-tenant global SaaS platform, five major developments are recommended:"
            ),

            createHeading2("5.1 Integrated Automated Subscription Billing"),
            createBodyParagraph(
                "To generate revenue from the platform, implement subscription billing using Stripe or Razorpay:"
            ),
            ...createBulletParagraph([
                { label: "Tiered Pricing Models", desc: "Create Starter, Professional, and Enterprise tiers scoped by active companies, users, monthly transaction count, and ledger limits." },
                { label: "Customer Billing Portals", desc: "Provide self-service portals where clients can upgrade seats, manage payment methods, download invoices, or cancel subscriptions." },
                { label: "Webhook Integration", desc: "Automate subscription state changes (e.g., lock accounts on payment failures, provision extra seats on upgrades)." }
            ]),

            createHeading2("5.2 Payment Gateway Automation (Receipt Automation)"),
            createBodyParagraph(
                "Eliminate manual invoice matching by providing instant payment options:"
            ),
            ...createBulletParagraph([
                { label: "Dynamic Payment Links", desc: "Generate a Stripe checkout link or Razorpay QR code on every PDF invoice sent to customers." },
                { label: "Real-time Webhook Receivers", desc: "A webhook endpoint intercepts payment notifications. The backend automatically records the receipt, posts a journal entry (Debit Bank, Credit Customer), and updates the Invoice status to Paid." }
            ]),

            createHeading2("5.3 Real-Time Bank Feeds (Plaid & Aggregator Integrations)"),
            createBodyParagraph(
                "Manual bank reconciliation is slow and prone to errors. Integrating automated bank feeds removes these limitations:"
            ),
            ...createBulletParagraph([
                { label: "Bank Feed Sync", desc: "Use Plaid (US/Global) or Setu/Yodlee (India) to fetch bank transactions daily into a new BankStatementLine table." },
                { label: "Auto-Reconciliation Dashboard", desc: "Build a split-screen match engine. The dashboard automatically flags matching dates and amounts, allowing users to reconcile transactions with a single click." }
            ]),

            createHeading2("5.4 Multi-Currency Ledger & Forex Gains/Losses Engine"),
            createBodyParagraph(
                "Supporting international trade is a core requirement for modern SaaS platforms. This requires updating the accounting engine to support multiple currencies:"
            ),
            ...createBulletParagraph([
                { label: "Base Currency Scoping", desc: "Define a base functional currency (e.g., USD or INR) for each tenant company." },
                { label: "Dynamic Exchange Rates", desc: "Sync live daily exchange rates via external APIs (e.g., OpenExchangeRates) to auto-fill rates during journal entries." },
                { label: "Realized & Unrealized Forex Engine", desc: "Calculate foreign exchange rate differences between the invoice date and payment date, posting realized gains or losses to indirect income or expense accounts automatically." }
            ]),

            createHeading2("5.5 AI Accountant & OCR Receipt Parsing"),
            createBodyParagraph(
                "Modern cloud systems use AI to reduce manual data entry and simplify workflows:"
            ),
            ...createBulletParagraph([
                { label: "Receipt OCR Extraction", desc: "Use OCR engines (e.g., AWS Textract or OpenAI Vision) to parse vendor details, tax amounts, line items, and totals from uploaded bills." },
                { label: "Predictive Classification", desc: "Train classification models to analyze narrations and suggest corresponding ledger accounts (e.g., classifying 'Uber ride' as Travel Expenses) with high accuracy." }
            ]),

            new Paragraph({ text: "", spacing: { before: 200 } }),
            createBodyParagraph("This roadmap ensures the Cloud Tally Replica transitions from a solid multi-company bookkeeping tool into a modern, automated SaaS platform capable of serving global enterprises.", true)
        ],
    }],
});

// Pack and write file
Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Tally_SaaS_Workflow_and_Improvements.docx", buffer);
    console.log("Successfully generated highly-detailed Tally_SaaS_Workflow_and_Improvements.docx");
}).catch((err) => {
    console.error("Error generating DOCX document:", err);
});
