module.exports = (sequelize, DataTypes) => {
  const SetuConsent = sequelize.define('SetuConsent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    consentId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACTIVE', 'REVOKED'),
      defaultValue: 'PENDING',
      allowNull: false
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    linkedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  return SetuConsent;
};
