/**
 * FiscalYear Model
 * ────────────────
 * Represents a fiscal year / financial year for a company.
 * Supports year-end close workflow: Open → Closing → Closed.
 * Links to PeriodLock and ReportSnapshot for period management.
 */

module.exports = (sequelize, DataTypes) => {
  const FiscalYear = sequelize.define('FiscalYear', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    CompanyId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Human-readable name, e.g., "FY 2025-26" or "April 2025 - March 2026"',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Open', 'Closing', 'Closed'),
      defaultValue: 'Open',
      allowNull: false,
    },
    closedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'UserId who performed the year-end close',
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    openingBalancesCarriedForward: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether opening balances have been carried to the next FY',
    },
    retainedEarningsVoucherId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'VoucherId of the closing entry that rolls P&L to Retained Earnings',
    },
  }, {
    timestamps: true,

    indexes: [
      { fields: ['CompanyId', 'startDate'] },
      { fields: ['CompanyId', 'status'] },
    ]
  });

  return FiscalYear;
};
