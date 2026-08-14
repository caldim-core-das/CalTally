module.exports = (sequelize, DataTypes) => {
  const MonthlyTaxSummary = sequelize.define('MonthlyTaxSummary', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    CompanyId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sales: {
      type: DataTypes.DOUBLE,
      defaultValue: 0.0
    },
    purchase: {
      type: DataTypes.DOUBLE,
      defaultValue: 0.0
    },
    outputGST: {
      type: DataTypes.DOUBLE,
      defaultValue: 0.0
    },
    inputGST: {
      type: DataTypes.DOUBLE,
      defaultValue: 0.0
    },
    tds: {
      type: DataTypes.DOUBLE,
      defaultValue: 0.0
    },
    tcs: {
      type: DataTypes.DOUBLE,
      defaultValue: 0.0
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    lastVoucherIncluded: {
      type: DataTypes.STRING,
      allowNull: true
    },
    generatedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    generatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['CompanyId', 'month', 'year', 'version']
      }
    ]
  });

  MonthlyTaxSummary.associate = (models) => {
    MonthlyTaxSummary.belongsTo(models.Company, { foreignKey: 'CompanyId' });
  };

  return MonthlyTaxSummary;
};
