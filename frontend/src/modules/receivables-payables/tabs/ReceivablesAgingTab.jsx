import React from 'react';
import { Eye, Calculator, ArrowRight } from 'lucide-react';

const ReceivablesAgingTab = ({ items = [], loading, onOpenAllocation, onOpenHistory }) => {
  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
          Showing <span className="text-blue-600 font-extrabold">{items.length}</span> Customer Accounts with Outstanding Balances
        </div>
        <button
          onClick={onOpenAllocation}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
        >
          <Calculator className="w-3.5 h-3.5" />
          Open Payment Allocation Screen
        </button>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3">Customer / Party Name</th>
              <th className="p-3 text-right font-black text-slate-800 dark:text-slate-100">Total Outstanding (₹)</th>
              <th className="p-3 text-right font-bold text-emerald-600">0 – 30 Days</th>
              <th className="p-3 text-right font-bold text-blue-600">31 – 60 Days</th>
              <th className="p-3 text-right font-bold text-amber-600">61 – 90 Days</th>
              <th className="p-3 text-right font-bold text-rose-600">90+ Days (Critical)</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                  Loading Customer Receivables Aging...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                  No overdue customer receivables recorded. All customer accounts settled!
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{row.partyName}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                    ₹{row.totalOutstanding.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-600">₹{row.current0_30.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono text-blue-600">₹{row.days31_60.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono text-amber-600">₹{row.days61_90.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">₹{row.days90Plus.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={onOpenAllocation}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900 dark:text-blue-300 rounded-lg text-[11px] font-bold transition-all"
                    >
                      <Calculator className="w-3 h-3" />
                      Allocate
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

export default ReceivablesAgingTab;
