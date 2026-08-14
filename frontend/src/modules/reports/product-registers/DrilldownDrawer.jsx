import React, { useState, useEffect } from 'react';
import { X, ExternalLink, FileText, Loader2 } from 'lucide-react';
import api from '../../../services/api';

const DrilldownDrawer = ({ isOpen, onClose, selectedProduct, type = 'sales', onOpenInvoiceModal }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedProduct?.itemId) {
      setLoading(true);
      api.get(`/v1/reports/product-registers/drilldown?itemId=${selectedProduct.itemId}&type=${type}`)
        .then(res => setTransactions(res.data.transactions || []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, selectedProduct, type]);

  if (!isOpen || !selectedProduct) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-blue-600 dark:text-blue-400">
              {type === 'sales' ? 'Sales Invoices Breakdown' : 'Purchase Bills Breakdown'}
            </span>
            <h2 className="text-base font-black text-slate-800 dark:text-white mt-0.5">
              {selectedProduct.itemName}
            </h2>
            <div className="text-xs text-slate-400 font-mono">
              SKU: {selectedProduct.sku} | HSN: {selectedProduct.hsnCode}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span>Found {transactions.length} Matching Vouchers</span>
            <span className="text-blue-600 font-mono">
              Total: ₹{transactions.reduce((s, t) => s + t.totalAmount, 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-3">Date</th>
                  <th className="p-3">Voucher #</th>
                  <th className="p-3">Party Name</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-center">GST %</th>
                  <th className="p-3 text-right">GST (₹)</th>
                  <th className="p-3 text-right font-black">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading underlying transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">
                      No vouchers found for this product in the selected period.
                    </td>
                  </tr>
                ) : (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-mono text-slate-500">{t.date}</td>
                      <td className="p-3 font-bold font-mono">
                        <button
                          onClick={() => onOpenInvoiceModal && onOpenInvoiceModal(t.voucherNumber)}
                          className="text-blue-600 hover:underline inline-flex items-center gap-1 font-bold"
                        >
                          {t.voucherNumber}
                          <ExternalLink className="w-3 h-3 text-blue-400" />
                        </button>
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{t.partyName}</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-600">{t.quantity}</td>
                      <td className="p-3 text-right font-mono">₹{t.price.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono">₹{t.taxableValue.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center font-bold text-slate-500">{t.gstRate}%</td>
                      <td className="p-3 text-right font-mono text-purple-600">₹{t.gstAmount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                        ₹{t.totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all"
          >
            Close Drilldown
          </button>
        </div>

      </div>
    </div>
  );
};

export default DrilldownDrawer;
