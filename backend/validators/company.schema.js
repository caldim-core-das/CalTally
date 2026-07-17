/**
 * Company Zod Schemas
 * ───────────────────
 * Request validation schemas for company management endpoints.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid UUID format');
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;

const createCompanySchema = {
  body: z.object({
    name: z.string().min(1, 'Company name is required').max(255).trim(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional().default('India'),
    pincode: z.string().max(10).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().optional().nullable().or(z.literal('')),
    website: z.string().url().optional().nullable().or(z.literal('')),
    // Statutory
    gstNumber: z.string().regex(gstinRegex, 'Invalid GSTIN format').optional().nullable().or(z.literal('')),
    panNumber: z.string().max(10).optional().nullable(),
    cinNumber: z.string().max(25).optional().nullable(),
    // Financials
    financialYearStart: z.string().or(z.date()).optional(),
    booksBeginningFrom: z.string().or(z.date()).optional(),
    baseCurrency: z.string().max(3).optional().default('INR'),
    // Features (JSON flags)
    features: z.object({
      maintainAccountsOnly: z.boolean().optional(),
      multiCurrency: z.boolean().optional(),
      billWiseDetails: z.boolean().optional(),
      multipleGodowns: z.boolean().optional(),
      stockCategories: z.boolean().optional(),
      purchaseOrders: z.boolean().optional(),
      salesOrders: z.boolean().optional(),
      costCenters: z.boolean().optional(),
      budgets: z.boolean().optional(),
    }).optional(),
    // Logo
    logo: z.string().max(500).optional(),
  }),
};

const updateCompanySchema = {
  params: z.object({ id: uuidSchema }),
  body: createCompanySchema.body.partial(),
};

const switchCompanySchema = {
  body: z.object({
    companyId: uuidSchema,
  }),
};

const inviteUserSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['ADMIN', 'ACCOUNTANT', 'MANAGER', 'AUDITOR', 'VIEWER', 'EMPLOYEE']),
  }),
};

const idParamSchema = { params: z.object({ id: uuidSchema }) };

module.exports = {
  createCompanySchema,
  updateCompanySchema,
  switchCompanySchema,
  inviteUserSchema,
  idParamSchema,
};
