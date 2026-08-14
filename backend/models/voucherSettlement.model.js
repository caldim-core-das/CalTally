module.exports = (sequelize, DataTypes) => {
  const VoucherSettlement = sequelize.define('VoucherSettlement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id'
    },
    invoiceType: {
      type: DataTypes.ENUM('SALES_INVOICE', 'PURCHASE_BILL'),
      allowNull: false,
      defaultValue: 'SALES_INVOICE',
      field: 'invoice_type'
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'invoice_id'
    },
    paymentType: {
      type: DataTypes.ENUM('RECEIPT_VOUCHER', 'PAYMENT_VOUCHER', 'ADVANCE_RECEIPT', 'ADVANCE_PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE'),
      allowNull: false,
      defaultValue: 'RECEIPT_VOUCHER',
      field: 'payment_type'
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'payment_id'
    },
    allocatedAmount: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'allocated_amount'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'discount_amount'
    },
    settlementDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'settlement_date'
    },
    referenceNo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reference_no'
    },
    paymentMode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'BANK_TRANSFER',
      field: 'payment_mode'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'INR'
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 1.0000,
      field: 'exchange_rate'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'CANCELLED', 'REVERSED'),
      defaultValue: 'ACTIVE'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'voucher_settlements',
    timestamps: true,
    underscored: true
  });

  VoucherSettlement.associate = (models) => {
    VoucherSettlement.belongsTo(models.Company, { foreignKey: 'companyId' });
    VoucherSettlement.belongsTo(models.SalesInvoice, { foreignKey: 'invoiceId', constraints: false });
    VoucherSettlement.belongsTo(models.Voucher, { foreignKey: 'paymentId', constraints: false });
    VoucherSettlement.belongsTo(models.User, { foreignKey: 'createdBy', as: 'Creator' });
  };

  return VoucherSettlement;
};
