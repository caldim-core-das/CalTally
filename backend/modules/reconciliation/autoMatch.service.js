const { BankTransaction, Voucher, Transaction } = require('../../models');
const { Op } = require('sequelize');

/**
 * For each unmatched AA-imported bank transaction,
 * try to find a voucher with matching amount and date (±3 days).
 * Only marks as matched if a single unambiguous voucher is found.
 */
exports.autoMatchImported = async (companyId) => {
  const unmatched = await BankTransaction.findAll({
    where: { CompanyId: companyId, isMatched: false, sourceType: 'AA_IMPORT' }
  });

  let matched = 0;
  for (const bt of unmatched) {
    const dateFrom = new Date(bt.date); dateFrom.setDate(dateFrom.getDate() - 3);
    const dateTo   = new Date(bt.date); dateTo.setDate(dateTo.getDate() + 3);

    // Map Setu bank transaction types to Tally replica voucherTypes:
    // Credit (money in) -> Receipt or Sales
    // Debit (money out) -> Payment or Purchase
    const matchedVoucherTypes = bt.type === 'Credit' ? ['Sales', 'Receipt'] : ['Purchase', 'Payment'];

    const candidates = await Voucher.findAll({
      where: {
        CompanyId: companyId,
        date: { [Op.between]: [dateFrom, dateTo] },
        voucherType: matchedVoucherTypes
      },
      include: [{
        model: Transaction,
        required: true,
        where: {
          [Op.or]: [
            { debit: bt.amount },
            { credit: bt.amount }
          ]
        }
      }]
    });

    if (candidates.length === 1) {
      await bt.update({ isMatched: true, matchedVoucherId: candidates[0].id });
      matched++;
    }
    // If 0 or multiple candidates — leave for manual matching in BankReconciliationView
  }

  return matched;
};
