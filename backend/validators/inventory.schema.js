/**
 * Inventory Zod Schemas
 * ─────────────────────
 * Request validation schemas for inventory module:
 * items, stock groups, stock categories, godowns, price lists, units of measure.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid UUID format');

// ── Item ─────────────────────────────────────────────────────────────────────

const createItemSchema = {
  body: z.object({
    name: z.string().min(1, 'Item name is required').max(255).trim(),
    itemCode: z.string().max(50).optional(),
    type: z.enum(['Goods', 'Service']).optional().default('Goods'),
    unit: z.string().max(20).optional().default('Pcs'),
    stockGroupId: uuidSchema.optional().nullable(),
    stockCategoryId: uuidSchema.optional().nullable(),
    godownId: uuidSchema.optional().nullable(),
    // Pricing
    sellingPrice: z.number().min(0).optional().default(0),
    costPrice: z.number().min(0).optional().default(0),
    // Stock
    openingStock: z.number().min(0).optional().default(0),
    reorderLevel: z.number().min(0).optional().default(0),
    // GST
    gstRate: z.number().min(0).max(100).optional().default(18),
    hsnCode: z.string().max(20).optional(),
    sacCode: z.string().max(20).optional(),
    // Descriptions
    salesDescription: z.string().max(1000).optional(),
    purchaseDescription: z.string().max(1000).optional(),
    // Accounts
    salesAccountId: uuidSchema.optional().nullable(),
    purchaseAccountId: uuidSchema.optional().nullable(),
    // Costing
    costingMethod: z.enum(['FIFO', 'WeightedAverage', 'StandardCost']).optional().default('WeightedAverage'),
    // Tracking
    trackBatches: z.boolean().optional().default(false),
    trackSerialNumbers: z.boolean().optional().default(false),
    // Vendor
    preferredVendor: z.string().max(255).optional(),
  }),
};

const updateItemSchema = {
  params: z.object({ id: uuidSchema }),
  body: createItemSchema.body.partial(),
};

// ── Stock Group ──────────────────────────────────────────────────────────────

const createStockGroupSchema = {
  body: z.object({
    name: z.string().min(1, 'Stock group name is required').max(255).trim(),
    parentId: uuidSchema.optional().nullable(),
    description: z.string().max(500).optional(),
  }),
};

// ── Stock Category ───────────────────────────────────────────────────────────

const createStockCategorySchema = {
  body: z.object({
    name: z.string().min(1, 'Stock category name is required').max(255).trim(),
    description: z.string().max(500).optional(),
  }),
};

// ── Godown (Warehouse) ──────────────────────────────────────────────────────

const createGodownSchema = {
  body: z.object({
    name: z.string().min(1, 'Godown name is required').max(255).trim(),
    address: z.string().max(500).optional(),
    contactPerson: z.string().max(255).optional(),
    phone: z.string().max(20).optional(),
  }),
};

// ── Unit of Measure ──────────────────────────────────────────────────────────

const createUoMSchema = {
  body: z.object({
    name: z.string().min(1, 'Unit name is required').max(50).trim(),
    symbol: z.string().max(10).optional(),
    decimalPlaces: z.number().int().min(0).max(6).optional().default(2),
  }),
};

// ── Price List ───────────────────────────────────────────────────────────────

const createPriceListSchema = {
  body: z.object({
    name: z.string().min(1, 'Price list name is required').max(255).trim(),
    description: z.string().max(500).optional(),
    type: z.enum(['Sales', 'Purchase']).optional().default('Sales'),
    isPercentage: z.boolean().optional().default(false),
    percentageType: z.enum(['MarkUp', 'MarkDown']).optional(),
    percentage: z.number().min(0).max(100).optional(),
    items: z.array(z.object({
      itemId: uuidSchema,
      customRate: z.number().min(0),
    })).optional(),
  }),
};

// ── Stock Adjustment ─────────────────────────────────────────────────────────

const adjustStockSchema = {
  body: z.object({
    itemId: uuidSchema,
    godownId: uuidSchema.optional().nullable(),
    adjustmentType: z.enum(['Add', 'Remove']),
    quantity: z.number().positive('Quantity must be positive'),
    rate: z.number().min(0).optional(),
    reason: z.string().min(1, 'Adjustment reason is required').max(500),
    date: z.string().or(z.date()).optional(),
  }),
};

const idParamSchema = { params: z.object({ id: uuidSchema }) };

module.exports = {
  createItemSchema,
  updateItemSchema,
  createStockGroupSchema,
  createStockCategorySchema,
  createGodownSchema,
  createUoMSchema,
  createPriceListSchema,
  adjustStockSchema,
  idParamSchema,
};
