const SalesRepository = require('../../../repositories/SalesRepository');
const PurchaseRepository = require('../../../repositories/PurchaseRepository');
const GSTCalculationService = require('../../../services/GSTCalculationService');

const GSTDefinition = {
  name: 'GST Analysis',
  customBuild: async (filters) => {
    const { companyId, fromDate, toDate } = filters;

    // 1. Fetch Sales and Purchases
    const sales = await SalesRepository.getSalesForPeriod({ companyId, fromDate, toDate });
    const purchases = await PurchaseRepository.getPurchasesForPeriod({ companyId, fromDate, toDate });

    // 2. Process Sales Output GST (Accrual basis)
    const salesTx = [];
    sales.forEach(inv => {
      const state = inv.deliveryAddress ? inv.deliveryAddress.toUpperCase() : 'TAMIL NADU';
      
      if (inv.items) {
        inv.items.forEach(item => {
          const taxable = Number(item.amount) || 0;
          const rate = Number(item.gstRate) || 0;
          
          // Split tax CGST/SGST/IGST
          const splits = GSTCalculationService.calculateGSTSplits({
            taxableAmount: taxable,
            gstRate: rate,
            companyState: 'TAMIL NADU', // Default registration matching tax domain
            counterpartyState: state
          });

          salesTx.push({
            hsn: '8517', // Placeholder/item code mapping
            gstRate: rate,
            taxableAmount: taxable,
            gstAmount: splits.totalTax,
            cgstAmount: splits.cgstAmount,
            sgstAmount: splits.sgstAmount,
            igstAmount: splits.igstAmount,
            state
          });
        });
      }
    });

    // 3. Process Purchases Input GST (Accrual basis)
    const purchaseTx = [];
    purchases.forEach(bill => {
      let state = 'TAMIL NADU';
      let counterparty = 'Unknown Supplier';

      if (bill.Transactions) {
        bill.Transactions.forEach(t => {
          if (t.credit > 0 && t.Ledger) {
            counterparty = t.Ledger.name;
          }
        });
      }

      if (bill.Transactions) {
        bill.Transactions.forEach(t => {
          const ledgerName = t.Ledger ? t.Ledger.name.toLowerCase() : '';
          const isTaxLedger = ledgerName.includes('cgst') || ledgerName.includes('sgst') || ledgerName.includes('igst') || ledgerName.includes('gst');
          
          if (t.debit > 0 && !isTaxLedger) {
            // Base purchase row
            const taxable = Number(t.debit) || 0;
            // Lookup tax split matching this item
            const gstRate = 18.0; // Standard ledger tax rate default
            const splits = GSTCalculationService.calculateGSTSplits({
              taxableAmount: taxable,
              gstRate,
              companyState: 'TAMIL NADU',
              counterpartyState: state
            });

            purchaseTx.push({
              hsn: '9983',
              gstRate,
              taxableAmount: taxable,
              gstAmount: splits.totalTax,
              cgstAmount: splits.cgstAmount,
              sgstAmount: splits.sgstAmount,
              igstAmount: splits.igstAmount,
              state
            });
          }
        });
      }
    });

    // 4. Compile aggregates
    const outputAgg = GSTCalculationService.aggregateGSTDetails(salesTx);
    const inputAgg = GSTCalculationService.aggregateGSTDetails(purchaseTx);

    const totalOutput = salesTx.reduce((sum, r) => sum + r.gstAmount, 0);
    const totalInput = purchaseTx.reduce((sum, r) => sum + r.gstAmount, 0);
    const netPayable = totalOutput - totalInput;

    // Construct flat row formats for state splits
    const combinedStates = {};
    const mergeStates = (list, isOutput) => {
      list.forEach(s => {
        if (!combinedStates[s.state]) {
          combinedStates[s.state] = { state: s.state, cgst: 0, sgst: 0, igst: 0 };
        }
        const mult = isOutput ? 1 : -1; // Output adds, Input offsets
        combinedStates[s.state].cgst += s.cgst * mult;
        combinedStates[s.state].sgst += s.sgst * mult;
        combinedStates[s.state].igst += s.igst * mult;
      });
    };
    mergeStates(outputAgg.byState, true);
    mergeStates(inputAgg.byState, false);

    return {
      metadata: {
        reportName: 'GST Analysis',
        companyId,
        fromDate,
        toDate,
        generatedAt: new Date().toISOString()
      },
      kpis: {
        outputGST: totalOutput,
        inputGST: totalInput,
        netGSTPayable: netPayable > 0 ? netPayable : 0,
        netGSTReceivable: netPayable < 0 ? Math.abs(netPayable) : 0
      },
      rows: {
        output: Object.keys(outputAgg.byRate).map(rate => ({
          rate,
          taxable: outputAgg.byRate[rate].taxable,
          gst: outputAgg.byRate[rate].gst
        })),
        input: Object.keys(inputAgg.byRate).map(rate => ({
          rate,
          taxable: inputAgg.byRate[rate].taxable,
          gst: inputAgg.byRate[rate].gst
        })),
        state: Object.values(combinedStates),
        hsn: [...outputAgg.byHsn, ...inputAgg.byHsn]
      }
    };
  }
};

module.exports = GSTDefinition;
