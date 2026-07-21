import React, { useState, useEffect } from 'react';
import { X, ArrowDown, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../../../services/api';

const SettlementHistoryDrawer = ({ invoiceId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (invoiceId) {
      fetchHistory();
    }
  }, [invoiceId]);

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/v1/settlements/history/${invoiceId}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error('Error fetching settlement history:', err);
      setErrorMsg('Failed to load settlement history.');
    } finally {
      setLoading(false);
    }
  };

  if (!invoiceId) return null;

  const invoice = historyData?.invoice;
  const waterfall = historyData?.waterfall || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Waterfall Settlement History
              </h2>
              <p className="text-xs text-slate-500 font-mono">Invoice #{invoice?.invoiceNumber || invoiceId}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="py-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                Loading settlement history...
              </div>
            ) : errorMsg ? (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold">{errorMsg}</div>
            ) : (
              <>
                {/* Invoice Summary Box */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Original Invoice Total</span>
                    <span className="text-xl font-black font-mono">₹{invoice?.totalAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Total Settled</span>
                      <span className="font-bold text-emerald-400 font-mono">₹{invoice?.amountPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Remaining Outstanding</span>
                      <span className="font-bold text-amber-400 font-mono">₹{invoice?.outstandingBalance.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Waterfall Sequence Timeline */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Knock-Off Flow</h3>

                  {waterfall.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                      No payment receipts or settlements recorded for this invoice yet.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6 border-l-2 border-blue-500">
                      {waterfall.map((step, idx) => (
                        <div key={step.id} className="relative bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                          <div className="absolute -left-9 top-3 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                            {idx + 1}
                          </div>

                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {step.paymentMode} ({step.paymentType})
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {new Date(step.settlementDate).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono">Ref: {step.referenceNo}</div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700 text-xs">
                            <span className="text-slate-500 font-semibold">Allocated:</span>
                            <span className="font-mono font-bold text-emerald-600">+ ₹{step.allocatedAmount.toLocaleString('en-IN')}</span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-semibold">Balance Remaining:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                              ₹{step.remainingBalanceAfter.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettlementHistoryDrawer;
