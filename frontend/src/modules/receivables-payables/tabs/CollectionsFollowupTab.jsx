import React, { useState, useEffect } from 'react';
import { Bell, Printer } from 'lucide-react';
import api from '../../../services/api';

const CollectionsFollowupTab = () => {
  const [loading, setLoading] = useState(false);
  const [followUpItems, setFollowUpItems] = useState([]);

  useEffect(() => {
    fetchFollowup();
  }, []);

  const fetchFollowup = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/settlements/collections-followup');
      setFollowUpItems(res.data?.items || []);
    } catch (err) {
      console.error('Error fetching collections followup:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500 animate-bounce" />
          <span>Showing <span className="text-amber-600 font-extrabold">{followUpItems.length}</span> Overdue Customer Accounts Requiring Payment Follow-up</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3">Customer Name</th>
              <th className="p-3">Invoice #</th>
              <th className="p-3 text-right">Outstanding Amount (₹)</th>
              <th className="p-3">Due Date</th>
              <th className="p-3 text-center font-bold text-amber-600">Overdue Days</th>
              <th className="p-3">Last Reminder Date</th>
              <th className="p-3">Reminder Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                  Loading collections & overdue accounts...
                </td>
              </tr>
            ) : followUpItems.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                  No overdue accounts requiring follow-up. All customer invoices are paid or within payment terms!
                </td>
              </tr>
            ) : (
              followUpItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{item.customer}</td>
                  <td className="p-3 font-mono text-blue-600 dark:text-blue-400">{item.invoiceNo}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-slate-500 font-mono">{item.dueDate}</td>
                  <td className="p-3 text-center font-mono font-black text-rose-600 bg-rose-50/50 dark:bg-rose-950/30 rounded-lg">
                    {item.overdueDays} Days
                  </td>
                  <td className="p-3 text-slate-500 font-mono">{item.lastReminder}</td>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{item.status}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all"
                    >
                      <Printer className="w-3 h-3" />
                      Print Statement
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

export default CollectionsFollowupTab;
