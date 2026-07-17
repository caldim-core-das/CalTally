/**
 * Payroll Zod Schemas
 * ───────────────────
 * Request validation schemas for payroll module:
 * employees, attendance, salary structures, payroll processing.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid UUID format');

// ── Employee ─────────────────────────────────────────────────────────────────

const createEmployeeSchema = {
  body: z.object({
    employeeId: z.string().max(50).optional(),
    firstName: z.string().min(1, 'First name is required').max(100).trim(),
    lastName: z.string().max(100).optional(),
    email: z.string().email().optional().nullable().or(z.literal('')),
    phone: z.string().max(20).optional(),
    dateOfBirth: z.string().or(z.date()).optional().nullable(),
    dateOfJoining: z.string().or(z.date()).optional(),
    department: z.string().max(100).optional(),
    designation: z.string().max(100).optional(),
    status: z.enum(['Active', 'Inactive', 'Terminated']).optional().default('Active'),
    // Bank details
    bankAccountNumber: z.string().max(30).optional(),
    bankName: z.string().max(100).optional(),
    ifscCode: z.string().max(11).optional(),
    // Statutory
    panNumber: z.string().max(10).optional(),
    aadharNumber: z.string().max(12).optional(),
    pfNumber: z.string().max(30).optional(),
    esiNumber: z.string().max(30).optional(),
    uanNumber: z.string().max(20).optional(),
    // Salary
    ctc: z.number().min(0).optional(),
    salaryStructureId: uuidSchema.optional().nullable(),
  }),
};

const updateEmployeeSchema = {
  params: z.object({ id: uuidSchema }),
  body: createEmployeeSchema.body.partial(),
};

// ── Attendance ───────────────────────────────────────────────────────────────

const markAttendanceSchema = {
  body: z.object({
    employeeId: uuidSchema,
    date: z.string().or(z.date()),
    status: z.enum(['Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Weekend']),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    notes: z.string().max(500).optional(),
  }),
};

const bulkAttendanceSchema = {
  body: z.object({
    date: z.string().or(z.date()),
    records: z.array(z.object({
      employeeId: uuidSchema,
      status: z.enum(['Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Weekend']),
    })).min(1, 'At least one attendance record is required'),
  }),
};

// ── Salary Structure ─────────────────────────────────────────────────────────

const createSalaryStructureSchema = {
  body: z.object({
    name: z.string().min(1, 'Structure name is required').max(255).trim(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional().default(true),
    components: z.array(z.object({
      componentId: uuidSchema.optional(),
      name: z.string().min(1).max(100),
      type: z.enum(['Earning', 'Deduction']),
      calculationType: z.enum(['Fixed', 'Percentage']),
      amount: z.number().min(0).optional(),
      percentage: z.number().min(0).max(100).optional(),
      basedOn: z.string().max(100).optional(),
      isTaxable: z.boolean().optional().default(true),
    })).min(1, 'At least one salary component is required'),
  }),
};

// ── Process Payroll ──────────────────────────────────────────────────────────

const processPayrollSchema = {
  body: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2100),
    employeeIds: z.array(uuidSchema).optional(), // If empty, process all active employees
    payDate: z.string().or(z.date()).optional(),
  }),
};

const idParamSchema = { params: z.object({ id: uuidSchema }) };

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
  markAttendanceSchema,
  bulkAttendanceSchema,
  createSalaryStructureSchema,
  processPayrollSchema,
  idParamSchema,
};
