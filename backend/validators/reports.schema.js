/**
 * Reports Zod Schemas
 * ───────────────────
 * Request validation schemas for report endpoints.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid UUID format');

// ── Common report query params ───────────────────────────────────────────────

const dateRangeQuerySchema = {
  query: z.object({
    startDate: z.string().optional(), // ISO date string
    endDate: z.string().optional(),
    fromDate: z.string().optional(),  // Alias
    toDate: z.string().optional(),    // Alias
    snapshot: z.enum(['true', 'false']).optional(), // Read from period-end snapshot
  }).transform((data) => ({
    // Normalize aliases
    startDate: data.startDate || data.fromDate,
    endDate: data.endDate || data.toDate,
    snapshot: data.snapshot === 'true',
  })),
};

// ── Trial Balance ────────────────────────────────────────────────────────────

const trialBalanceQuerySchema = {
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    showZeroBalances: z.enum(['true', 'false']).optional(),
    comparePeriod: z.enum(['none', 'previousPeriod', 'previousYear']).optional(),
  }),
};

// ── Ledger Statement ─────────────────────────────────────────────────────────

const ledgerStatementQuerySchema = {
  params: z.object({ ledgerId: uuidSchema }),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  }),
};

// ── Ageing Report ────────────────────────────────────────────────────────────

const ageingReportQuerySchema = {
  query: z.object({
    asOfDate: z.string().optional(),
    buckets: z.string().optional(), // Comma-separated: "30,60,90"
  }),
};

// ── Dashboard ────────────────────────────────────────────────────────────────

const dashboardQuerySchema = {
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  }),
};

// ── Inventory Report ─────────────────────────────────────────────────────────

const inventoryReportQuerySchema = {
  query: z.object({
    stockGroupId: uuidSchema.optional(),
    godownId: uuidSchema.optional(),
    belowReorderLevel: z.enum(['true', 'false']).optional(),
  }),
};

// ── GST Reports ──────────────────────────────────────────────────────────────

const gstReportQuerySchema = {
  query: z.object({
    month: z.string().optional(),
    year: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  }),
};

// ── Audit Log ────────────────────────────────────────────────────────────────

const auditLogQuerySchema = {
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    userId: uuidSchema.optional(),
    tableName: z.string().max(100).optional(),
    action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
};

module.exports = {
  dateRangeQuerySchema,
  trialBalanceQuerySchema,
  ledgerStatementQuerySchema,
  ageingReportQuerySchema,
  dashboardQuerySchema,
  inventoryReportQuerySchema,
  gstReportQuerySchema,
  auditLogQuerySchema,
};
