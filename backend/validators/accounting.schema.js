/**
 * Accounting Zod Schemas
 * ──────────────────────
 * Request validation schemas for accounting endpoints:
 * journal entries, vouchers, groups, ledgers, cost centers.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid UUID format');

// ── Journal Entry ────────────────────────────────────────────────────────────

const journalEntryLineSchema = z.object({
  ledgerId: uuidSchema,
  debit: z.number().min(0, 'Debit must be non-negative').default(0),
  credit: z.number().min(0, 'Credit must be non-negative').default(0),
  narration: z.string().max(500).optional(),
  costCenterId: uuidSchema.optional().nullable(),
  projectId: uuidSchema.optional().nullable(),
});

const recordJournalEntrySchema = {
  body: z.object({
    date: z.string().or(z.date()).optional(),
    narration: z.string().max(1000).optional().default(''),
    reference: z.string().max(255).optional().default(''),
    voucherType: z.enum([
      'Journal', 'Payment', 'Receipt', 'Contra', 'Sales', 'Purchase',
      'Credit Note', 'Debit Note', 'Payroll', 'Depreciation', 'Stock Transfer'
    ]).default('Journal'),
    voucherNumber: z.string().max(50).optional(),
    entries: z.array(journalEntryLineSchema).min(2, 'Journal entry must have at least 2 lines'),
    currency: z.string().max(10).optional(),
    projectId: uuidSchema.optional().nullable(),
  }),
};

// ── Group ────────────────────────────────────────────────────────────────────

const createGroupSchema = {
  body: z.object({
    name: z.string().min(1, 'Group name is required').max(255).trim(),
    parent_id: uuidSchema.optional().nullable(),
    nature: z.enum(['Assets', 'Liabilities', 'Income', 'Expenses', 'Equity']).optional(),
    description: z.string().max(500).optional(),
    isSystem: z.boolean().optional().default(false),
  }),
};

const updateGroupSchema = {
  params: z.object({ id: uuidSchema }),
  body: z.object({
    name: z.string().min(1).max(255).trim().optional(),
    parent_id: uuidSchema.optional().nullable(),
    nature: z.enum(['Assets', 'Liabilities', 'Income', 'Expenses', 'Equity']).optional(),
    description: z.string().max(500).optional(),
  }),
};

// ── Ledger ───────────────────────────────────────────────────────────────────

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;

const createLedgerSchema = {
  body: z.object({
    name: z.string().min(1, 'Ledger name is required').max(255).trim(),
    groupId: uuidSchema,
    openingBalance: z.number().optional().default(0),
    openingBalanceType: z.enum(['Debit', 'Credit']).optional().default('Debit'),
    gstin: z.string().regex(gstinRegex, 'Invalid GSTIN format').optional().nullable().or(z.literal('')),
    panNumber: z.string().max(10).optional().nullable(),
    registrationType: z.enum(['Regular', 'Composition', 'Unregistered', 'Consumer']).optional(),
    // Customer/Vendor specific
    customerType: z.enum(['Business', 'Individual']).optional(),
    paymentTerms: z.number().int().min(0).max(365).optional(),
    creditLimit: z.number().min(0).optional(),
    // Contact fields
    email: z.string().email().optional().nullable().or(z.literal('')),
    phone: z.string().max(20).optional().nullable(),
    billingAddressJson: z.any().optional(),
    shippingAddressJson: z.any().optional(),
    contactPersonsJson: z.any().optional(),
    bankDetailsJson: z.any().optional(),
    // TDS fields
    tdsApplicable: z.boolean().optional().default(false),
    tdsSection: z.string().max(20).optional().nullable(),
    tdsRate: z.number().min(0).max(100).optional().nullable(),
  }),
};

const updateLedgerSchema = {
  params: z.object({ id: uuidSchema }),
  body: createLedgerSchema.body.partial(),
};

// ── Voucher ──────────────────────────────────────────────────────────────────

const voucherIdParamSchema = {
  params: z.object({ id: uuidSchema }),
};

const voucherStatusSchema = {
  params: z.object({ id: uuidSchema }),
  body: z.object({
    status: z.enum(['Draft', 'Posted', 'Approved', 'Locked', 'Cancelled']),
    reason: z.string().max(500).optional(),
  }),
};

// ── Cost Center ──────────────────────────────────────────────────────────────

const createCostCenterSchema = {
  body: z.object({
    name: z.string().min(1, 'Cost center name is required').max(255).trim(),
    code: z.string().max(50).optional(),
    description: z.string().max(500).optional(),
    parentId: uuidSchema.optional().nullable(),
    isActive: z.boolean().optional().default(true),
  }),
};

// ── Period Lock ──────────────────────────────────────────────────────────────

const periodLockSchema = {
  body: z.object({
    lockDate: z.string().or(z.date()),
    reason: z.string().max(500).optional(),
  }),
};

// ── Fiscal Year ──────────────────────────────────────────────────────────────

const createFiscalYearSchema = {
  body: z.object({
    name: z.string().min(1, 'Fiscal year name is required').max(100).trim(),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
  }),
};

module.exports = {
  recordJournalEntrySchema,
  createGroupSchema,
  updateGroupSchema,
  createLedgerSchema,
  updateLedgerSchema,
  voucherIdParamSchema,
  voucherStatusSchema,
  createCostCenterSchema,
  periodLockSchema,
  createFiscalYearSchema,
  uuidSchema,
};
