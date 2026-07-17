/**
 * ReportSnapshot Model
 * ────────────────────
 * Stores immutable period-end snapshots of financial statements
 * (Trial Balance, Balance Sheet, P&L, Cash Flow).
 * Once a fiscal year is closed, reports read from these snapshots
 * instead of re-aggregating from Transaction rows.
 */

module.exports = (sequelize, DataTypes) => {
  const ReportSnapshot = sequelize.define('ReportSnapshot', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    CompanyId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    FiscalYearId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Optional link to the FiscalYear this snapshot belongs to',
    },
    reportType: {
      type: DataTypes.ENUM('TrialBalance', 'ProfitAndLoss', 'BalanceSheet', 'CashFlow', 'DayBook'),
      allowNull: false,
    },
    periodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    periodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    snapshotData: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JSON-serialized report data (use JSONB in Postgres)',
      get() {
        const raw = this.getDataValue('snapshotData');
        if (raw) {
          try { return JSON.parse(raw); } catch { return raw; }
        }
        return null;
      },
      set(val) {
        this.setDataValue('snapshotData', typeof val === 'string' ? val : JSON.stringify(val));
      },
    },
    isFinalized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Once finalized, cannot be updated or deleted',
    },
    generatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  }, {
    timestamps: true,

    indexes: [
      { fields: ['CompanyId', 'reportType', 'periodEnd'] },
      { fields: ['CompanyId', 'FiscalYearId'] },
    ]
  });

  return ReportSnapshot;
};
