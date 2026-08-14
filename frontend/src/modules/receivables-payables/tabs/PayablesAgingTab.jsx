import React from 'react';
import { Calculator } from 'lucide-react';

const PayablesAgingTab = ({ items = [], loading }) => {
  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
          Showing <span className="text-purple-600 font-extrabold">{items.length}</span> Supplier Accounts with Outstanding Bills
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3">Supplier / Vendor Name</th>
              <th className="p-3 text-right font-black text-slate-800 dark:text-slate-100">Total Owed (₹)</th>
              <th className="p-3 text-right font-bold text-emerald-600">0 – 30 Days</th>
              <th className="p-3 text-right font-bold text-purple-600">31 – 60 Days</th>
              <th className="p-3 text-right font-bold text-amber-600">61 – 90 Days</th>
              <th className="p-3 text-right font-bold text-rose-600">90+ Days</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                  Loading Supplier Payables Aging...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                  No overdue supplier payables recorded. All vendor bills settled!
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{row.supplierName || 'Vendor Account'}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                    ₹{(row.totalOwed || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-600">₹{(row.current0_30 || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono text-purple-600">₹{(row.days31_60 || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono text-amber-600">₹{(row.days61_90 || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">₹{(row.days90Plus || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-center">
                    <button className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900 dark:text-purple-300 rounded-lg text-[11px] font-bold transition-all">
                      Pay Vendor
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayablesAgingTab;
