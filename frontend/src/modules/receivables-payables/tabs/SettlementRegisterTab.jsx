import React from 'react';
import { Eye, FileSpreadsheet } from 'lucide-react';

const SettlementRegisterTab = ({ items = [], loading }) => {
  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
          Showing <span className="text-emerald-600 font-extrabold">{items.length}</span> Settlement Knock-Off Entries
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3">Settlement Date</th>
              <th className="p-3">Settlement #</th>
              <th className="p-3">Party Account</th>
              <th className="p-3">Target Invoice #</th>
              <th className="p-3">Payment Mode</th>
              <th className="p-3">Ref / UTR #</th>
              <th className="p-3 text-right font-black text-emerald-600">Allocated Amount (₹)</th>
              <th className="p-3 text-right">Discount (₹)</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">
                  Loading Settlement Register...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">
                  No settlement knock-off entries recorded yet.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-3 font-mono text-slate-500">{new Date(row.settlementDate).toLocaleDateString()}</td>
                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{row.settlementNo}</td>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{row.partyName}</td>
                  <td className="p-3 font-mono text-blue-600 dark:text-blue-400">{row.invoiceNumber}</td>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-300">{row.paymentMode}</td>
                  <td className="p-3 font-mono text-slate-500 text-[11px]">{row.referenceNo}</td>
                  <td className="p-3 text-right font-mono font-black text-emerald-600">
                    ₹{row.allocatedAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-500">₹{row.discountAmount.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {row.status}
                    </span>
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

export default SettlementRegisterTab;
