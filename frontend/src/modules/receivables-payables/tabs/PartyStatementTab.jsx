import React, { useState, useEffect } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import api from '../../../services/api';

const PartyStatementTab = () => {
  const [period, setPeriod] = useState('THIS_MONTH');
  const [selectedParty, setSelectedParty] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [statementData, setStatementData] = useState({ closingBalance: 0, items: [] });

  useEffect(() => {
    fetchStatement();
  }, [selectedParty, period]);

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/v1/settlements/party-statement?partyName=${selectedParty}&period=${period}`);
      setStatementData(res.data || { closingBalance: 0, items: [] });
    } catch (err) {
      console.error('Error fetching party statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const transactions = statementData.items || [];

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Select Party Account</label>
            <select
              value={selectedParty}
              onChange={e => setSelectedParty(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:border-blue-600"
            >
              <option value="ALL">All Party Accounts (Consolidated)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Date Range Filter</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:border-blue-600"
            >
              <option value="ALL">All Transactions</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="PREVIOUS_MONTH">Previous Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="FINANCIAL_YEAR">Financial Year</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Bank-Style PDF
          </button>
        </div>
      </div>

      {/* Printable Bank-Style Party Statement */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
        
        {/* Header Statement Notice */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-widest block">Official Ledger Statement</span>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{statementData.partyName || 'Customer Account'}</h2>
            <p className="text-xs text-slate-500 font-medium">Live Database Ledger Entries</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Closing Outstanding Balance</span>
            <span className="text-xl font-black font-mono text-emerald-600">
              ₹{(statementData.closingBalance || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Transaction Table */}
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3">Date</th>
              <th className="p-3">Voucher Type</th>
              <th className="p-3">Voucher #</th>
              <th className="p-3 text-right">Debit / Invoiced (₹)</th>
              <th className="p-3 text-right text-emerald-600">Credit / Paid (₹)</th>
              <th className="p-3 text-right font-black text-slate-900 dark:text-white">Closing Balance (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">
                  Loading live party statement ledger...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">
                  No statement transactions recorded for the selected period.
                </td>
              </tr>
            ) : (
              transactions.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-3 font-mono text-slate-500">{t.date}</td>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{t.type}</td>
                  <td className="p-3 font-mono text-blue-600 dark:text-blue-400">{t.voucherNo}</td>
                  <td className="p-3 text-right font-mono">{t.debit ? `₹${t.debit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="p-3 text-right font-mono text-emerald-600">{t.credit ? `₹${t.credit.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                    ₹{t.balance.toLocaleString('en-IN')}
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

export default PartyStatementTab;
