/**
 * Sales Zod Schemas
 * ─────────────────
 * Request validation schemas for sales module:
 * quotes, sales orders, invoices, credit notes, delivery challans, payments.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid UUID format');

// ── Shared line item schema ──────────────────────────────────────────────────

const lineItemSchema = z.object({
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
});

// ── Quote ────────────────────────────────────────────────────────────────────

const createQuoteSchema = {
  body: z.object({
    customerLedgerId: uuidSchema,
    quoteNumber: z.string().max(50).optional(),
    date: z.string().or(z.date()).optional(),
    expiryDate: z.string().or(z.date()).optional().nullable(),
    referenceNumber: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
    terms: z.string().max(2000).optional(),
    items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
    subject: z.string().max(255).optional(),
  }),
};

// ── Sales Order ──────────────────────────────────────────────────────────────

const createSalesOrderSchema = {
  body: z.object({
    customerLedgerId: uuidSchema,
    salesOrderNumber: z.string().max(50).optional(),
    date: z.string().or(z.date()).optional(),
    expectedShipmentDate: z.string().or(z.date()).optional().nullable(),
    referenceNumber: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
    terms: z.string().max(2000).optional(),
    items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
    sourceDocumentType: z.literal('Quote').optional(),
    sourceDocumentId: uuidSchema.optional().nullable(),
    deliveryAddressJson: z.any().optional(),
  }),
};

// ── Sales Invoice ────────────────────────────────────────────────────────────

const createSalesInvoiceSchema = {
  body: z.object({
    customerLedgerId: uuidSchema,
    invoiceNumber: z.string().max(50).optional(),
    date: z.string().or(z.date()).optional(),
    dueDate: z.string().or(z.date()).optional().nullable(),
    referenceNumber: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
    terms: z.string().max(2000).optional(),
    items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
    salesAccountId: uuidSchema.optional().nullable(),
    isGstInvoice: z.boolean().optional().default(true),
    placeOfSupply: z.string().max(50).optional(),
    sourceDocumentType: z.enum(['Quote', 'SalesOrder']).optional(),
    sourceDocumentId: uuidSchema.optional().nullable(),
    projectId: uuidSchema.optional().nullable(),
  }),
};

// ── Credit Note ──────────────────────────────────────────────────────────────

const createCreditNoteSchema = {
  body: z.object({
    customerLedgerId: uuidSchema,
    creditNoteNumber: z.string().max(50).optional(),
    date: z.string().or(z.date()).optional(),
    referenceInvoiceId: uuidSchema.optional().nullable(),
    reason: z.string().max(500).optional(),
    reasonCode: z.enum(['Return', 'PricingError', 'Discount', 'WriteOff', 'Other']).optional(),
    notes: z.string().max(2000).optional(),
    items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  }),
};

// ── Delivery Challan ─────────────────────────────────────────────────────────

const createDeliveryChallanSchema = {
  body: z.object({
    customerLedgerId: uuidSchema,
    challanNumber: z.string().max(50).optional(),
    date: z.string().or(z.date()).optional(),
    salesOrderId: uuidSchema.optional().nullable(),
    challanType: z.enum(['Supply', 'JobWork', 'Exhibition', 'Other']).optional().default('Supply'),
    transporterName: z.string().max(255).optional(),
    vehicleNumber: z.string().max(20).optional(),
    notes: z.string().max(2000).optional(),
    items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  }),
};

// ── Payment Received ─────────────────────────────────────────────────────────

const recordPaymentSchema = {
  body: z.object({
    customerLedgerId: uuidSchema,
    amount: z.number().positive('Amount must be positive'),
    date: z.string().or(z.date()).optional(),
    paymentMode: z.enum(['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'Other']).optional().default('Bank Transfer'),
    referenceNumber: z.string().max(100).optional(),
    bankAccountId: uuidSchema.optional().nullable(),
    notes: z.string().max(500).optional(),
    invoiceAllocations: z.array(z.object({
      invoiceId: uuidSchema,
      amount: z.number().positive(),
    })).optional(),
  }),
};

// ── Recurring Invoice ────────────────────────────────────────────────────────

const createRecurringInvoiceSchema = {
  body: z.object({
    customerLedgerId: uuidSchema,
    profileName: z.string().max(255).optional(),
    frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()).optional().nullable(),
    items: z.array(lineItemSchema).min(1),
    salesAccountId: uuidSchema.optional().nullable(),
    notes: z.string().max(2000).optional(),
    terms: z.string().max(2000).optional(),
  }),
};

// ── Shared params ────────────────────────────────────────────────────────────

const idParamSchema = { params: z.object({ id: uuidSchema }) };

module.exports = {
  createQuoteSchema,
  createSalesOrderSchema,
  createSalesInvoiceSchema,
  createCreditNoteSchema,
  createDeliveryChallanSchema,
  recordPaymentSchema,
  createRecurringInvoiceSchema,
  idParamSchema,
  lineItemSchema,
};
