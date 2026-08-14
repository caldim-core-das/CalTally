const nodemailer = require('nodemailer');

// Define global transporter
let transporter = null;

/**
 * Initialize the Nodemailer transporter.
 * If SMTP credentials are provided in env, use them.
 * Otherwise, for local testing, fallback to Ethereal Email (mocked SMTP).
 */
const initTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback for development without SMTP credentials
    console.warn('⚠️ No SMTP credentials found. Using Ethereal Email for local testing.');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return transporter;
};

/**
 * Send an email using the initialized transporter.
 * If using Ethereal, logs the preview URL to the console.
 */
const sendMail = async (mailOptions) => {
  try {
    const tp = await initTransporter();
    
    const defaultFrom = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"CalBooks ERP" <${process.env.SMTP_USER}>` : '"CalBooks ERP" <noreply@calbooks.com>');
    mailOptions.from = mailOptions.from || defaultFrom;

    const info = await tp.sendMail(mailOptions);
    console.log(`✉️ Email sent to ${mailOptions.to}: ${info.messageId}`);
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log(`🔗 Ethereal Email Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${mailOptions.to}:`, error.message);
    throw new Error('Email sending failed');
  }
};

/**
 * Send a verification email during signup or resend flow.
 */
const sendVerificationEmail = async (user, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  // Note: the frontend will hit the API in the background. The URL structure matches VerifyEmailPage.jsx
  const verifyLink = `${frontendUrl}/verify-email?token=${token}&type=signup`;

  const mailOptions = {
    to: user.email,
    subject: 'Please verify your email address - Tally Accounting',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a;">Welcome to Tally Accounting!</h2>
        <p>Hi ${user.name || 'User'},</p>
        <p>Thank you for signing up. Please verify your email address to secure your account and gain full access to the platform.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #3b82f6;">${verifyLink}</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">If you did not create this account, you can safely ignore this email.</p>
      </div>
    `,
  };

  return sendMail(mailOptions);
};

/**
 * Send a password reset email.
 */
const sendPasswordResetEmail = async (user, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  const mailOptions = {
    to: user.email,
    subject: 'Password Reset Request - Tally Accounting',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a;">Password Reset Request</h2>
        <p>Hi ${user.name || 'User'},</p>
        <p>We received a request to reset the password for your Tally Accounting account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #3b82f6;">${resetLink}</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      </div>
    `,
  };

  return sendMail(mailOptions);
};

/**
 * Send a workspace user invitation email.
 */
const sendUserInvitationEmail = async (inviterName, companyName, userEmail, role, department) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const joinLink = `${frontendUrl}/login`;

  const mailOptions = {
    to: userEmail,
    subject: `You have been invited to join ${companyName} on CalBooks ERP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">Workspace Invitation</h2>
        <p>Hi,</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on CalBooks ERP as an <strong>${role}</strong> (${department} Department).</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${joinLink}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept & Join Workspace</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">${joinLink}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #64748b; font-size: 12px;">Sent from CalBooks ERP Users & Access Management Module.</p>
      </div>
    `,
  };

  return sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendUserInvitationEmail,
  sendMail
};
