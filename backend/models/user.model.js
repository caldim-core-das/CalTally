module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    CreatedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'ADMIN'
    },
    activeCompanyId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    // Phase 1: marks accounts created via Google OAuth — blocks password login
    oauthOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    // Extra 3: account lockout after repeated failed login attempts
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true  // null = not locked
    },
    // Secure email change flow
    pendingEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Secure email verification flow
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailVerificationExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Password Reset Flow
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetPasswordExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Department tracking (e.g. Accounts, Sales, Purchase, Management)
    department: {
      type: DataTypes.STRING,
      defaultValue: 'Accounts',
      allowNull: true
    },
    // Account Status: ACTIVE, INVITED, INACTIVE, LOCKED, SUSPENDED
    status: {
      type: DataTypes.STRING,
      defaultValue: 'ACTIVE',
      allowNull: false
    },
    // Last login timestamp
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Per-user notification preferences (JSON blob)
    notificationPreferences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        emailInvoices: true,
        emailReports: false,
        emailUsers: true,
        smsInvoices: false,
        smsCritical: true,
        appAlerts: true,
        appInventory: true
      }
    }
  }, {
    });

  return User;
};
