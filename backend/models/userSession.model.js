module.exports = (sequelize, DataTypes) => {
  const UserSession = sequelize.define('UserSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    UserId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    CompanyId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    loginTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    logoutTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      defaultValue: '127.0.0.1',
      allowNull: false
    },
    browser: {
      type: DataTypes.STRING,
      defaultValue: 'Chrome',
      allowNull: false
    },
    device: {
      type: DataTypes.STRING,
      defaultValue: 'Windows',
      allowNull: false  // 'Windows', 'Mac', 'Android', 'iPhone', 'Linux'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'ONLINE',
      allowNull: false  // 'ONLINE', 'OFFLINE', 'FORCE_LOGGED_OUT', 'FAILED_LOGIN'
    }
  }, {
    tableName: 'UserSessions'
  });

  return UserSession;
};
