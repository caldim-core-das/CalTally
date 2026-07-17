'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create FiscalYears table
    await queryInterface.createTable('FiscalYears', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      CompanyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('Open', 'Closing', 'Closed'),
        defaultValue: 'Open',
        allowNull: false,
      },
      closedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      closedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      openingBalancesCarriedForward: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      retainedEarningsVoucherId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Vouchers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('FiscalYears', ['CompanyId', 'startDate']);
    await queryInterface.addIndex('FiscalYears', ['CompanyId', 'status']);

    // 2. Create ReportSnapshots table
    await queryInterface.createTable('ReportSnapshots', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      CompanyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      FiscalYearId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'FiscalYears',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reportType: {
        type: Sequelize.ENUM('TrialBalance', 'ProfitAndLoss', 'BalanceSheet', 'CashFlow', 'DayBook'),
        allowNull: false,
      },
      periodStart: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      periodEnd: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      snapshotData: {
        type: Sequelize.TEXT, // using TEXT for generic JSON payload storage in sqlite/postgres compatibility mode
        allowNull: false,
      },
      isFinalized: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      generatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('ReportSnapshots', ['CompanyId', 'reportType', 'periodEnd']);
    await queryInterface.addIndex('ReportSnapshots', ['CompanyId', 'FiscalYearId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ReportSnapshots');
    await queryInterface.dropTable('FiscalYears');
    // Note: ENUM types are not automatically dropped in postgres, but dropping tables is enough for this MVP step
  }
};
