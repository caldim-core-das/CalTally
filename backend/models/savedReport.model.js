module.exports = (sequelize, DataTypes) => {
  const SavedReport = sequelize.define('SavedReport', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    module: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reportConfig: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    isScheduled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    cronExpression: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailRecipients: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    executionStatus: {
      type: DataTypes.ENUM('SUCCESS', 'FAILED', 'RUNNING'),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  });

  return SavedReport;
};
