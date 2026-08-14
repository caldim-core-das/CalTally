class GSTCalculationService {
  /**
   * Calculates the GST splits (CGST, SGST, IGST) for a transaction based on state rules.
   * If companyState matches counterpartyState, split the tax rate equally between CGST and SGST.
   * Otherwise, attribute the full tax rate to IGST.
   */
  static calculateGSTSplits({ taxableAmount, gstRate, companyState, counterpartyState }) {
    const amount = Number(taxableAmount) || 0;
    const rate = Number(gstRate) || 0;
    const totalTax = (amount * rate) / 100;

    const isSameState = String(companyState || '').trim().toLowerCase() === String(counterpartyState || '').trim().toLowerCase();

    if (isSameState) {
      // Intra-state split
      return {
        cgstRate: rate / 2,
        sgstRate: rate / 2,
        igstRate: 0,
        cgstAmount: totalTax / 2,
        sgstAmount: totalTax / 2,
        igstAmount: 0,
        totalTax
      };
    } else {
      // Inter-state
      return {
        cgstRate: 0,
        sgstRate: 0,
        igstRate: rate,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: totalTax,
        totalTax
      };
    }
  }

  /**
   * Aggregates GST details by tax rate brackets (5%, 12%, 18%, 28%) and HSN codes.
   */
  static aggregateGSTDetails(transactions = []) {
    const rateGroups = {
      '5%': { taxable: 0, gst: 0 },
      '12%': { taxable: 0, gst: 0 },
      '18%': { taxable: 0, gst: 0 },
      '28%': { taxable: 0, gst: 0 }
    };

    const hsnGroups = {};
    const stateGroups = {};

    transactions.forEach(tx => {
      const rateKey = `${tx.gstRate}%`;
      const amount = Number(tx.taxableAmount) || 0;
      const tax = Number(tx.gstAmount) || 0;

      // Group by Rate
      if (rateGroups[rateKey]) {
        rateGroups[rateKey].taxable += amount;
        rateGroups[rateKey].gst += tax;
      } else {
        rateGroups[rateKey] = { taxable: amount, gst: tax };
      }

      // Group by HSN
      if (tx.hsn) {
        if (!hsnGroups[tx.hsn]) {
          hsnGroups[tx.hsn] = { hsn: tx.hsn, taxable: 0, gst: 0 };
        }
        hsnGroups[tx.hsn].taxable += amount;
        hsnGroups[tx.hsn].gst += tax;
      }

      // Group by State
      if (tx.state) {
        if (!stateGroups[tx.state]) {
          stateGroups[tx.state] = { state: tx.state, cgst: 0, sgst: 0, igst: 0 };
        }
        stateGroups[tx.state].cgst += Number(tx.cgstAmount) || 0;
        stateGroups[tx.state].sgst += Number(tx.sgstAmount) || 0;
        stateGroups[tx.state].igst += Number(tx.igstAmount) || 0;
      }
    });

    return {
      byRate: rateGroups,
      byHsn: Object.values(hsnGroups),
      byState: Object.values(stateGroups)
    };
  }
}

module.exports = GSTCalculationService;
