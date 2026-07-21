const { Ledger, Transaction, Voucher } = require('../../../models');
const { Op } = require('sequelize');

class LedgerRepository {
  /**
   * Fetches all ledgers with their transaction postings for a company.
   */
  static async getLedgersWithPostings({ companyId, fromDate, toDate }) {
    if (!companyId) {
      throw new Error('Company ID is required to fetch ledger records.');
    }

    return await Ledger.findAll({
      where: {
        CompanyId: companyId
      },
      include: [
        {
          model: Transaction,
          include: [
            {
              model: Voucher,
              where: {
                date: {
                  [Op.between]: [new Date(fromDate), new Date(toDate)]
                },
                status: {
                  [Op.notIn]: ['DRAFT', 'VOID', 'CANCELLED'] // Enforce status filters on header
                }
              }
            }
          ]
        }
      ]
    });
  }
}

module.exports = LedgerRepository;
