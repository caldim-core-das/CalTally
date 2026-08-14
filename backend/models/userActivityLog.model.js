module.exports = (sequelize, DataTypes) => {
  const UserActivityLog = sequelize.define('UserActivityLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    CompanyId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    UserId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    severity: {
      type: DataTypes.STRING,
      defaultValue: 'INFO',
      allowNull: false  // 'INFO', 'WARNING', 'CRITICAL'
    },
    module: {
      type: DataTypes.STRING,
      allowNull: false  // 'Sales', 'Purchase', 'GST', 'Financial Closing', 'Users', etc.
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false  // 'CREATE_SALES_INVOICE', 'DELETE_PURCHASE_BILL', 'PERIOD_LOCK', 'FORCE_LOGOUT'
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      defaultValue: '127.0.0.1',
      allowNull: false
    },
    device: {
      type: DataTypes.STRING,
      defaultValue: 'Windows',
      allowNull: false
    }
  }, {
    tableName: 'UserActivityLogs'
  });

  return UserActivityLog;
};
