'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Add deletedAt for paranoid models (Soft Deletes)
      const tablesWithSoftDelete = [
        'Vouchers', 'Transactions', 'Ledgers', 'Groups', 'Items',
        'SalesOrders', 'SalesInvoices', 'PurchaseOrders'
      ];
      for (const table of tablesWithSoftDelete) {
        // Check if column already exists to prevent crashes
        const tableDesc = await queryInterface.describeTable(table).catch(() => null);
        if (tableDesc && !tableDesc.deletedAt) {
          await queryInterface.addColumn(table, 'deletedAt', {
            type: Sequelize.DATE,
            allowNull: true,
          }, { transaction });
        }
      }

      // 2. Add Composite Indexes for performance
      // Ledger balance queries
      await queryInterface.addIndex('Transactions', ['CompanyId', 'LedgerId', 'date'], { transaction });
      
      // Voucher listing queries
      await queryInterface.addIndex('Vouchers', ['CompanyId', 'date', 'voucherType'], { transaction });
      
      // Sales analytics
      await queryInterface.addIndex('SalesInvoices', ['CompanyId', 'date', 'status'], { transaction });

      // 3. Document Chain fields
      const addColumnSafe = async (table, col, type) => {
        const desc = await queryInterface.describeTable(table).catch(() => null);
        if (desc && !desc[col]) {
          await queryInterface.addColumn(table, col, {
            type, allowNull: true
          }, { transaction });
        }
      };

      await addColumnSafe('SalesInvoices', 'sourceDocumentType', Sequelize.STRING);
      await addColumnSafe('SalesInvoices', 'sourceDocumentId', Sequelize.UUID);
      
      await addColumnSafe('DeliveryChallans', 'sourceDocumentType', Sequelize.STRING);
      await addColumnSafe('DeliveryChallans', 'sourceDocumentId', Sequelize.UUID);

      await addColumnSafe('PurchaseOrders', 'sourceDocumentType', Sequelize.STRING);
      await addColumnSafe('PurchaseOrders', 'sourceDocumentId', Sequelize.UUID);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tablesWithSoftDelete = [
        'Vouchers', 'Transactions', 'Ledgers', 'Groups', 'Items',
        'SalesOrders', 'SalesInvoices', 'PurchaseOrders'
      ];
      for (const table of tablesWithSoftDelete) {
        const tableDesc = await queryInterface.describeTable(table).catch(() => null);
        if (tableDesc && tableDesc.deletedAt) {
          await queryInterface.removeColumn(table, 'deletedAt', { transaction });
        }
      }

      await queryInterface.removeIndex('Transactions', ['CompanyId', 'LedgerId', 'date'], { transaction });
      await queryInterface.removeIndex('Vouchers', ['CompanyId', 'date', 'voucherType'], { transaction });
      await queryInterface.removeIndex('SalesInvoices', ['CompanyId', 'date', 'status'], { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
