const { SalesInvoice, SalesInvoiceItem, Ledger } = require('../../../models');
const { Op } = require('sequelize');

class SalesRepository {
  /**
   * Fetches all non-draft, non-voided sales invoices within a specific date range for a company.
   */
  static async getSalesForPeriod({ companyId, fromDate, toDate }) {
    if (!companyId) {
      throw new Error('Company ID is required to fetch sales records.');
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    return await SalesInvoice.findAll({
      where: {
        CompanyId: companyId,
        date: {
          [Op.between]: [start, end]
        },
        [Op.or]: [
          { status: null },
          { status: { [Op.notIn]: ['Draft', 'Void'] } }
        ]
      },
      include: [
        {
          model: SalesInvoiceItem,
          as: 'items'
        },
        {
          model: Ledger,
          as: 'CustomerLedger'
        }
      ],
      order: [['date', 'ASC']]
    });
  }
}

module.exports = SalesRepository;
