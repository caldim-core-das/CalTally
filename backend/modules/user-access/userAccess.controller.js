const { User, CustomRole, UserSession, UserActivityLog, Company, UserCompany } = require('../../models');
const { sendUserInvitationEmail } = require('../../services/mail.service');
const { Op } = require('sequelize');

// Helper to log user business activity
const logActivity = async ({ companyId, userId, userName, severity = 'INFO', module, action, details, req }) => {
  try {
    await UserActivityLog.create({
      CompanyId: companyId,
      UserId: userId,
      userName: userName || 'Admin',
      severity,
      module,
      action,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '127.0.0.1',
      device: req?.headers?.['user-agent']?.includes('Mac') ? 'Mac' :
              req?.headers?.['user-agent']?.includes('iPhone') ? 'iPhone' :
              req?.headers?.['user-agent']?.includes('Android') ? 'Android' : 'Windows'
    });
  } catch (err) {
    console.error('Failed to log user activity:', err);
  }
};

// 1. GET /v1/user-access/stats
exports.getStats = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    // Get all users connected to this company
    const companyUsers = await User.findAll({
      include: [{
        model: Company,
        where: { id: companyId },
        attributes: [],
        through: { attributes: [] }
      }]
    });

    const totalUsers = companyUsers.length;
    const activeUsers = companyUsers.filter(u => u.status === 'ACTIVE').length;
    const lockedUsers = companyUsers.filter(u => u.status === 'LOCKED' || (u.lockedUntil && new Date(u.lockedUntil) > new Date())).length;
    const pendingInvitations = companyUsers.filter(u => u.status === 'INVITED').length;

    // Count distinct online users
    const onlineSessionsCount = await UserSession.count({
      distinct: true,
      col: 'UserId',
      where: { CompanyId: companyId, status: 'ONLINE' }
    });

    // Get last login timestamp
    const lastLoginRecord = await UserSession.findOne({
      where: { CompanyId: companyId, status: 'ONLINE' },
      order: [['loginTime', 'DESC']]
    });

    res.json({
      totalUsers,
      activeUsers,
      onlineUsers: onlineSessionsCount,
      lockedUsers,
      pendingInvitations,
      lastLogin: lastLoginRecord ? lastLoginRecord.loginTime : null
    });
  } catch (err) {
    next(err);
  }
};

// 2. GET /v1/user-access/users
exports.getUsers = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'department', 'status', 'lastLoginAt', 'lockedUntil', 'createdAt'],
      include: [{
        model: Company,
        where: { id: companyId },
        attributes: [],
        through: { attributes: [] }
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// 3. GET /v1/user-access/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'email', 'role', 'department', 'status', 'lastLoginAt', 'createdAt']
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch last 10 login sessions
    const loginHistory = await UserSession.findAll({
      where: { UserId: id },
      order: [['loginTime', 'DESC']],
      limit: 10
    });

    res.json({ user, loginHistory });
  } catch (err) {
    next(err);
  }
};

// 4. PUT /v1/user-access/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, department, role, status } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (department) user.department = department;
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    await logActivity({
      companyId: req.user.companyId,
      userId: req.user.id,
      userName: req.user.name,
      severity: 'INFO',
      module: 'Users',
      action: 'UPDATE_USER_PROFILE',
      details: `Updated user profile for ${user.email} (Role: ${user.role}, Status: ${user.status})`,
      req
    });

    res.json({ message: 'User updated successfully', user });
  } catch (err) {
    next(err);
  }
};

// 5. POST /v1/user-access/users/invite
exports.inviteUser = async (req, res, next) => {
  try {
    const { email, name, role, department } = req.body;
    const companyId = req.user.companyId;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and Name are required for invitation' });
    }

    let user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (user) {
      // Check if already in company
      const existsInCompany = await UserCompany.findOne({ where: { userId: user.id, companyId } });
      if (existsInCompany) {
        return res.status(400).json({ error: 'User is already a member of this workspace' });
      }
      await UserCompany.create({ userId: user.id, companyId, role: role || 'ACCOUNTANT' });
    } else {
      user = await User.create({
        email: email.toLowerCase().trim(),
        name,
        role: role || 'ACCOUNTANT',
        department: department || 'Accounts',
        status: 'INVITED',
        password: 'INVITED_USER_NO_PASSWORD'
      });
      await UserCompany.create({ userId: user.id, companyId, role: role || 'ACCOUNTANT' });
    }

    // Dispatch workspace invitation email
    const company = await Company.findByPk(companyId);
    const companyName = company ? company.name : 'CalBooks Workspace';
    sendUserInvitationEmail(req.user.name || 'Admin', companyName, email.toLowerCase().trim(), role || 'ACCOUNTANT', department || 'Accounts')
      .catch(e => console.error('Failed to send invitation email:', e.message));

    await logActivity({
      companyId,
      userId: req.user.id,
      userName: req.user.name,
      severity: 'INFO',
      module: 'Users',
      action: 'INVITE_USER',
      details: `Sent workspace invitation to ${email} as ${role || 'ACCOUNTANT'}`,
      req
    });

    res.status(201).json({ message: `Invitation sent to ${email} successfully!`, user });
  } catch (err) {
    next(err);
  }
};

// 6. GET /v1/user-access/invitations/pending
exports.getPendingInvitations = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const pending = await User.findAll({
      where: { status: 'INVITED' },
      attributes: ['id', 'email', 'name', 'role', 'department', 'createdAt'],
      include: [{
        model: Company,
        where: { id: companyId },
        attributes: [],
        through: { attributes: [] }
      }]
    });

    res.json({ invitations: pending });
  } catch (err) {
    next(err);
  }
};

// 7. POST /v1/user-access/invitations/:id/resend
exports.resendInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user || user.status !== 'INVITED') {
      return res.status(404).json({ error: 'Pending invitation not found' });
    }

    const company = await Company.findByPk(req.user.companyId);
    const companyName = company ? company.name : 'CalBooks Workspace';
    sendUserInvitationEmail(req.user.name || 'Admin', companyName, user.email, user.role, user.department || 'Accounts')
      .catch(e => console.error('Failed to resend invitation email:', e.message));

    await logActivity({
      companyId: req.user.companyId,
      userId: req.user.id,
      userName: req.user.name,
      severity: 'INFO',
      module: 'Users',
      action: 'RESEND_INVITATION',
      details: `Resent workspace invitation email to ${user.email}`,
      req
    });

    res.json({ message: `Invitation resent to ${user.email} successfully!` });
  } catch (err) {
    next(err);
  }
};

// 8. DELETE /v1/user-access/invitations/:id
exports.cancelInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) return res.status(404).json({ error: 'User invitation not found' });

    await UserCompany.destroy({ where: { userId: id, companyId: req.user.companyId } });
    if (user.status === 'INVITED') {
      await user.destroy();
    }

    await logActivity({
      companyId: req.user.companyId,
      userId: req.user.id,
      userName: req.user.name,
      severity: 'WARNING',
      module: 'Users',
      action: 'CANCEL_INVITATION',
      details: `Cancelled workspace invitation for ${user.email}`,
      req
    });

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (err) {
    next(err);
  }
};

// 9. GET & POST /v1/user-access/roles
exports.getRoles = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const defaultRoles = [
      { id: 'ADMIN', name: 'Administrator', baseRole: 'ADMIN', description: 'Full system access & management privileges', isCustom: false },
      { id: 'ACCOUNTANT', name: 'Accountant', baseRole: 'ACCOUNTANT', description: 'Complete accounting & transactional access', isCustom: false },
      { id: 'AUDITOR', name: 'Auditor', baseRole: 'AUDITOR', description: 'Read-only audit & reporting view', isCustom: false },
      { id: 'MANAGER', name: 'Manager', baseRole: 'MANAGER', description: 'Approval & operational management privileges', isCustom: false },
      { id: 'SALES', name: 'Sales Executive', baseRole: 'EMPLOYEE', description: 'Quotations, Sales Invoices & Customer billing', isCustom: false },
      { id: 'PURCHASE', name: 'Purchase & Store Clerk', baseRole: 'EMPLOYEE', description: 'Purchase Orders, Vendor Bills & Inventory movements', isCustom: false }
    ];

    const customRoles = await CustomRole.findAll({
      where: { CompanyId: companyId },
      order: [['createdAt', 'DESC']]
    });

    res.json({ defaultRoles, customRoles });
  } catch (err) {
    next(err);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    const { name, description, baseRole, permissions } = req.body;
    const companyId = req.user.companyId;

    if (!name) return res.status(400).json({ error: 'Role name is required' });

    const newRole = await CustomRole.create({
      CompanyId: companyId,
      name: name.trim(),
      description,
      baseRole: baseRole || 'ACCOUNTANT',
      permissions: permissions || {},
      isActive: true,
      createdBy: req.user.id
    });

    await logActivity({
      companyId,
      userId: req.user.id,
      userName: req.user.name,
      severity: 'INFO',
      module: 'Roles',
      action: 'CREATE_CUSTOM_ROLE',
      details: `Created custom role "${name}"`,
      req
    });

    res.status(201).json(newRole);
  } catch (err) {
    next(err);
  }
};

// 10. GET /v1/user-access/security/sessions
exports.getSessions = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const allSessions = await UserSession.findAll({
      where: { CompanyId: companyId },
      order: [['loginTime', 'DESC']],
      limit: 100
    });

    // Auto-cleanup: Ensure only the latest active session per user is marked ONLINE
    const seenOnlineUsers = new Set();
    const cleanedSessions = [];

    for (const session of allSessions) {
      if (session.status === 'ONLINE') {
        if (seenOnlineUsers.has(session.UserId)) {
          // Older redundant session for the same user — mark OFFLINE
          session.status = 'OFFLINE';
          session.logoutTime = session.logoutTime || new Date();
          await session.save();
        } else {
          seenOnlineUsers.add(session.UserId);
        }
      }
      cleanedSessions.push(session);
    }

    // Enrich with user names
    const userIds = [...new Set(cleanedSessions.map(s => s.UserId))];
    const users = await User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'email'] });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const enrichedSessions = cleanedSessions.map(s => ({
      id: s.id,
      userId: s.UserId,
      userName: userMap[s.UserId]?.name || 'Unknown',
      userEmail: userMap[s.UserId]?.email || '',
      loginTime: s.loginTime,
      logoutTime: s.logoutTime,
      ipAddress: s.ipAddress,
      browser: s.browser,
      device: s.device,
      status: s.status
    }));

    res.json({ sessions: enrichedSessions });
  } catch (err) {
    next(err);
  }
};

// 11. POST /v1/user-access/security/force-logout
exports.forceLogout = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const activeSessions = await UserSession.findAll({
      where: { UserId: userId, status: 'ONLINE' }
    });

    for (const session of activeSessions) {
      session.status = 'FORCE_LOGGED_OUT';
      session.logoutTime = new Date();
      await session.save();
    }

    await logActivity({
      companyId: req.user.companyId,
      userId: req.user.id,
      userName: req.user.name,
      severity: 'CRITICAL',
      module: 'Security',
      action: 'FORCE_LOGOUT_USER',
      details: `Admin force logged out user ${userId}`,
      req
    });

    res.json({ message: 'User force logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// 12. POST /v1/user-access/security/reset-link
exports.sendResetLink = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.resetPasswordToken = 'RESET_' + Math.random().toString(36).substring(2);
    user.resetPasswordExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    await logActivity({
      companyId: req.user.companyId,
      userId: req.user.id,
      userName: req.user.name,
      severity: 'WARNING',
      module: 'Security',
      action: 'SEND_PASSWORD_RESET_LINK',
      details: `Triggered password reset email link for ${user.email}`,
      req
    });

    res.json({ message: `Password reset link sent to ${user.email}` });
  } catch (err) {
    next(err);
  }
};

// 13. POST /v1/user-access/security/unlock
exports.unlockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.lockedUntil = null;
    user.failedLoginAttempts = 0;
    user.status = 'ACTIVE';
    await user.save();

    await logActivity({
      companyId: req.user.companyId,
      userId: req.user.id,
      userName: req.user.name,
      severity: 'WARNING',
      module: 'Security',
      action: 'UNLOCK_USER_ACCOUNT',
      details: `Unlocked account for ${user.email}`,
      req
    });

    res.json({ message: `Account for ${user.email} unlocked successfully` });
  } catch (err) {
    next(err);
  }
};

// 14. GET /v1/user-access/activity-logs
exports.getActivityLogs = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { module, severity } = req.query;

    const whereClause = { CompanyId: companyId };
    if (module && module !== 'ALL') whereClause.module = module;
    if (severity && severity !== 'ALL') whereClause.severity = severity;

    const logs = await UserActivityLog.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({ logs });
  } catch (err) {
    next(err);
  }
};
