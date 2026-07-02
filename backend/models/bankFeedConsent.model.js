module.exports = (sequelize, DataTypes) => {
  const BankFeedConsent = sequelize.define('BankFeedConsent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    CompanyId: { type: DataTypes.UUID, allowNull: false },
    UserId: { type: DataTypes.UUID, allowNull: false },
    setuConsentId: { type: DataTypes.STRING, allowNull: true, unique: true },
    consentUrl: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('PENDING','ACTIVE','REJECTED','REVOKED','PAUSED','EXPIRED'),
      defaultValue: 'PENDING'
    },
    dataRange: { type: DataTypes.JSONB, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    lastFetchedAt: { type: DataTypes.DATE, allowNull: true }
  });

  BankFeedConsent.associate = (models) => {
    BankFeedConsent.hasMany(models.BankFeedAccount, { foreignKey: 'ConsentId' });
    BankFeedConsent.belongsTo(models.Company, { foreignKey: 'CompanyId' });
  };

  return BankFeedConsent;
};
