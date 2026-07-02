"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Table 1: BankFeedConsent — tracks each user's AA consent
    await queryInterface.createTable('BankFeedConsents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      CompanyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Companies', key: 'id' },
        onDelete: 'CASCADE'
      },
      UserId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      setuConsentId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      consentUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Redirect URL — send user here to approve consent'
      },
      status: {
        type: Sequelize.ENUM(
          'PENDING','ACTIVE','REJECTED','REVOKED','PAUSED','EXPIRED'
        ),
        defaultValue: 'PENDING'
      },
      dataRange: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: '{ from: ISO date, to: ISO date }'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastFetchedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // Table 2: BankFeedAccounts — each linked bank account from a consent
    await queryInterface.createTable('BankFeedAccounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      ConsentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'BankFeedConsents', key: 'id' },
        onDelete: 'CASCADE'
      },
      CompanyId: { type: Sequelize.UUID, allowNull: false },
      maskedAccNumber: { type: Sequelize.STRING, allowNull: false },
      fipId: { type: Sequelize.STRING, allowNull: false, comment: 'e.g. HDFC-FIP' },
      fiType: { type: Sequelize.STRING, defaultValue: 'DEPOSIT' },
      linkRefNumber: { type: Sequelize.STRING, allowNull: true },
      accountType: { type: Sequelize.STRING, allowNull: true, comment: 'SAVINGS / CURRENT / OD' },
      ifscCode: { type: Sequelize.STRING, allowNull: true },
      bankName: { type: Sequelize.STRING, allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // Add sourceType to BankTransaction to track AA-imported vs manual rows
    await queryInterface.addColumn('BankTransactions', 'sourceType', {
      type: Sequelize.ENUM('MANUAL', 'AA_IMPORT', 'CSV_IMPORT'),
      defaultValue: 'MANUAL'
    });
    await queryInterface.addColumn('BankTransactions', 'externalTxnId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'txnId from Setu — used to deduplicate on re-fetch'
    });
    await queryInterface.addColumn('BankTransactions', 'BankFeedAccountId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'BankFeedAccounts', key: 'id' }
    });
    await queryInterface.addIndex('BankTransactions', ['externalTxnId'], { 
      unique: true, 
      where: { externalTxnId: { [Sequelize.Op.ne]: null } } 
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('BankTransactions', 'BankFeedAccountId');
    await queryInterface.removeColumn('BankTransactions', 'externalTxnId');
    await queryInterface.removeColumn('BankTransactions', 'sourceType');
    await queryInterface.dropTable('BankFeedAccounts');
    await queryInterface.dropTable('BankFeedConsents');
  }
};
