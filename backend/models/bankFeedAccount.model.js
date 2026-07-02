module.exports = (sequelize, DataTypes) => {
  const BankFeedAccount = sequelize.define('BankFeedAccount', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ConsentId: { type: DataTypes.UUID, allowNull: false },
    CompanyId: { type: DataTypes.UUID, allowNull: false },
    maskedAccNumber: { type: DataTypes.STRING, allowNull: false },
    fipId: { type: DataTypes.STRING, allowNull: false },
    fiType: { type: DataTypes.STRING, defaultValue: 'DEPOSIT' },
    linkRefNumber: { type: DataTypes.STRING, allowNull: true },
    accountType: { type: DataTypes.STRING, allowNull: true },
    ifscCode: { type: DataTypes.STRING, allowNull: true },
    bankName: { type: DataTypes.STRING, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  });

  BankFeedAccount.associate = (models) => {
    BankFeedAccount.belongsTo(models.BankFeedConsent, { foreignKey: 'ConsentId' });
    BankFeedAccount.hasMany(models.BankTransaction, { foreignKey: 'BankFeedAccountId' });
  };

  return BankFeedAccount;
};
