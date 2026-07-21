'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('AuditLogs');
    if (!tableInfo.hash) {
      await queryInterface.addColumn('AuditLogs', 'hash', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }
    if (!tableInfo.previousHash) {
      await queryInterface.addColumn('AuditLogs', 'previousHash', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('AuditLogs');
    if (tableInfo.hash) {
      await queryInterface.removeColumn('AuditLogs', 'hash');
    }
    if (tableInfo.previousHash) {
      await queryInterface.removeColumn('AuditLogs', 'previousHash');
    }
  }
};
