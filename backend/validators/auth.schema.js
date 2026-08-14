/**
 * Authentication Zod Schemas
 * ──────────────────────────
 * Request validation schemas for auth endpoints.
 */

const { z } = require('zod');

// Password complexity: at least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const emailSchema = z.string().email('Invalid email address').max(255).toLowerCase().trim();

const registerSchema = {
  body: z.object({
    name: z.string().min(1, 'Name is required').max(255).trim(),
    email: emailSchema,
    password: passwordSchema,
  }),
};

const loginSchema = {
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),
};

const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    email: emailSchema,
  }),
};

const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
  }),
};

const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().optional(),
  }).optional(),
};

const mfaVerifySchema = {
  body: z.object({
    token: z.string().length(6, 'MFA token must be 6 digits').regex(/^\d+$/, 'MFA token must be numeric'),
    tempToken: z.string().min(1, 'Temporary auth token is required'),
  }),
};

const googleLoginSchema = {
  body: z.object({
    credential: z.string().min(1, 'Google credential is required'),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  mfaVerifySchema,
  googleLoginSchema,
  passwordSchema,
  emailSchema,
};
