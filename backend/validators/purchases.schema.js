/**
 * Purchases Zod Schemas
 * ─────────────────────
 * Request validation schemas for purchases module:
 * purchase orders, bills, payments made, vendor credits.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid UUID format');

const purchaseLineItemSchema = z.object({
  itemId: uuidSchema.optional().nullable(),
  itemName: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  quantity: z.number().positive('Quantity must be positive'),
  rate: z.number().min(0, 'Rate must be non-negative'),
  discount: z.number().min(0).max(100).optional().default(0),
  gstRate: z.number().min(0).max(100).optional().default(0),
  hsnCode: z.string().max(20).optional(),
  unit: z.string().max(20).optional(),
  amount: z.number().min(0).optional(),
  accountId: uuidSchema.optional().nullable(),
});

// ── Purchase Order ───────────────────────────────────────────────────────────

const createPurchaseOrderSchema = {
  body: z.object({
    vendorId: uuidSchema,
    orderNumber: z.string().max(50).optional(),
    date: z.string().or(z.date()).optional(),
    expectedDeliveryDate: z.string().or(z.date()).optional().nullable(),
    referenceNumber: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
    terms: z.string().max(2000).optional(),
    items: z.array(purchaseLineItemSchema).min(1, 'At least one line item is required'),
    deliveryAddressJson: z.any().optional(),
    projectId: uuidSchema.optional().nullable(),
  }),
};

// ── Bill ─────────────────────────────────────────────────────────────────────

const createBillSchema = {
  body: z.object({
    vendorId: uuidSchema,
    billNumber: z.string().max(50).optional(),
    vendorInvoiceNumber: z.string().max(100).optional(),
    date: z.string().or(z.date()).optional(),
    dueDate: z.string().or(z.date()).optional().nullable(),
    referenceNumber: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
    items: z.array(purchaseLineItemSchema).min(1, 'At least one line item is required'),
    purchaseOrderId: uuidSchema.optional().nullable(),
    isGstBill: z.boolean().optional().default(true),
    placeOfSupply: z.string().max(50).optional(),
    projectId: uuidSchema.optional().nullable(),
    // TDS fields
    tdsApplicable: z.boolean().optional().default(false),
    tdsSection: z.string().max(20).optional(),
    tdsRate: z.number().min(0).max(100).optional(),
  }),
};

// ── Payment Made ─────────────────────────────────────────────────────────────

const createPaymentMadeSchema = {
  body: z.object({
    vendorId: uuidSchema,
    amount: z.number().positive('Amount must be positive'),
    date: z.string().or(z.date()).optional(),
    paymentMode: z.enum(['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'RTGS', 'Other']).optional().default('Bank Transfer'),
    referenceNumber: z.string().max(100).optional(),
    bankAccountId: uuidSchema.optional().nullable(),
    notes: z.string().max(500).optional(),
    billAllocations: z.array(z.object({
      billId: uuidSchema,
      amount: z.number().positive(),
    })).optional(),
  }),
};

// ── Vendor Credit ────────────────────────────────────────────────────────────

const createVendorCreditSchema = {
  body: z.object({
    vendorId: uuidSchema,
    creditNumber: z.string().max(50).optional(),
    date: z.string().or(z.date()).optional(),
    referenceBillId: uuidSchema.optional().nullable(),
    reason: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
    items: z.array(purchaseLineItemSchema).min(1, 'At least one line item is required'),
  }),
};

// ── Recurring Bill/Expense ───────────────────────────────────────────────────

const createRecurringBillSchema = {
  body: z.object({
    vendorId: uuidSchema,
    profileName: z.string().max(255).optional(),
    frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()).optional().nullable(),
    items: z.array(purchaseLineItemSchema).min(1),
    notes: z.string().max(2000).optional(),
  }),
};

const idParamSchema = { params: z.object({ id: uuidSchema }) };
const companyIdParamSchema = { params: z.object({ companyId: uuidSchema }) };

module.exports = {
  createPurchaseOrderSchema,
  createBillSchema,
  createPaymentMadeSchema,
  createVendorCreditSchema,
  createRecurringBillSchema,
  idParamSchema,
  companyIdParamSchema,
  purchaseLineItemSchema,
};
