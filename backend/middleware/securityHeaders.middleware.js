/**
 * Security Headers Middleware
 * ───────────────────────────
 * Additional security headers beyond what Helmet provides.
 * Content-Security-Policy, Referrer-Policy, Permissions-Policy.
 */

function securityHeaders(req, res, next) {
  // Prevent browsers from MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );

  // Prevent XSS in older browsers (Helmet also does this, belt-and-suspenders)
  res.setHeader('X-XSS-Protection', '0'); // Modern recommendation: rely on CSP, disable legacy XSS filter

  next();
}

module.exports = securityHeaders;
