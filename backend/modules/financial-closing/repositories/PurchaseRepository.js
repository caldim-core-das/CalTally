const { Voucher, Transaction, Ledger } = require('../../../models');
const { Op } = require('sequelize');

class PurchaseRepository {
  /**
   * Fetches all non-draft, non-voided purchase vouchers within a specific date range for a company.
   */
  static async getPurchasesForPeriod({ companyId, fromDate, toDate }) {
    if (!companyId) {
      throw new Error('Company ID is required to fetch purchase records.');
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);   // include all of the last day

    return await Voucher.findAll({
      where: {
        CompanyId: companyId,
        voucherType: {
          [Op.in]: ['Purchase', 'PURCHASE', 'purchase', 'Bill', 'BILL', 'bill']
        },
        date: {
          [Op.between]: [start, end]
        },
        [Op.or]: [
          { status: null },
          { status: { [Op.notIn]: ['VOID', 'Void', 'void', 'CANCELLED', 'Cancelled', 'cancelled'] } }
        ]
      },
      include: [
        {
          model: Transaction,
          include: [
            {
              model: Ledger
            }
          ]
        }
      ],
      order: [['date', 'ASC']]
    });
  }
}

module.exports = PurchaseRepository;
