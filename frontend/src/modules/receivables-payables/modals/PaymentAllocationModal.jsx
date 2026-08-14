import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calculator, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../../services/api';

const PaymentAllocationModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [totalPaymentAmount, setTotalPaymentAmount] = useState('');
  const [allocations, setAllocations] = useState({}); // { invoiceId: { allocatedAmount: number, discountAmount: number } }
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUnpaidInvoices();
    }
  }, [isOpen]);

  const fetchUnpaidInvoices = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/v1/settlements/unpaid-invoices');
      const items = res.data?.items || [];
      setUnpaidInvoices(items);
      
      const initMap = {};
      items.forEach(inv => {
        initMap[inv.id] = { allocatedAmount: 0, discountAmount: 0 };
      });
      setAllocations(initMap);
    } catch (err) {
      console.error('Error loading unpaid invoices:', err);
      setErrorMsg('Failed to fetch unpaid invoices.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Handles manual typing of allocated amount per invoice
  const handleAmountChange = (invoiceId, val, maxOutstanding) => {
    const num = Math.min(Math.max(0, Number(val) || 0), maxOutstanding);
    setAllocations(prev => ({
      ...prev,
      [invoiceId]: { ...prev[invoiceId], allocatedAmount: num }
    }));
  };

  // FIFO Auto-Allocation
  const handleAutoAllocateFIFO = () => {
    let remainingPayment = Number(totalPaymentAmount) || 0;
    if (remainingPayment <= 0) return;

    const newMap = {};
    unpaidInvoices.forEach(inv => {
      if (remainingPayment > 0) {
        const toAllocate = Math.min(remainingPayment, inv.outstandingBalance);
        newMap[inv.id] = { allocatedAmount: toAllocate, discountAmount: 0 };
        remainingPayment -= toAllocate;
      } else {
        newMap[inv.id] = { allocatedAmount: 0, discountAmount: 0 };
      }
    });
    setAllocations(newMap);
  };

  // Total allocated across all invoices
  const grandTotalAllocated = Object.values(allocations).reduce((acc, curr) => acc + (Number(curr.allocatedAmount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const activeAllocations = Object.entries(allocations)
      .filter(([_, data]) => (Number(data.allocatedAmount) || 0) > 0)
      .map(([invoiceId, data]) => ({
        invoiceId,
        invoiceType: 'SALES_INVOICE',
        allocatedAmount: Number(data.allocatedAmount),
        discountAmount: Number(data.discountAmount || 0)
      }));

    if (activeAllocations.length === 0) {
      setErrorMsg('Please enter an allocated amount for at least one invoice.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/v1/settlements/allocate', {
        allocations: activeAllocations,
        paymentMode,
        referenceNo,
        remarks,
        settlementDate: new Date()
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Settlement allocation failed:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Allocation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Payment Allocation Screen
            </h2>
            <p className="text-xs text-slate-500 font-medium">Select unpaid invoices and specify partial/full allocation amounts</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Top Controls: Payment Amount & FIFO Auto-Allocate */}
        <div className="p-6 pb-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Receipt Amount (₹)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={totalPaymentAmount}
                  onChange={e => setTotalPaymentAmount(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleAutoAllocateFIFO}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 transition-all shadow-sm"
                >
                  FIFO Auto Fill
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:border-blue-600"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI Payment</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Ref / UTR Number</label>
              <input
                type="text"
                placeholder="UTR # or Cheque #"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            <div className="text-right flex flex-col justify-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Allocated</span>
              <span className="text-lg font-black font-mono text-emerald-600">₹{grandTotalAllocated.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Main 8-Column Allocation Table */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              Loading unpaid invoices...
            </div>
          ) : unpaidInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              No unpaid invoices found for allocation.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Invoice Total (₹)</th>
                    <th className="p-3 text-right">Already Paid (₹)</th>
                    <th className="p-3 text-right font-bold text-amber-600">Current Outstanding</th>
                    <th className="p-3 text-center w-36">Allocate Input (₹)</th>
                    <th className="p-3 text-right font-bold text-slate-700 dark:text-slate-200">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {unpaidInvoices.map(inv => {
                    const allocData = allocations[inv.id] || { allocatedAmount: 0 };
                    const allocVal = Number(allocData.allocatedAmount) || 0;
                    const balAfter = Math.max(0, inv.outstandingBalance - allocVal);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {inv.invoiceNumber}
                          <div className="text-[10px] text-slate-400 font-sans">{inv.customerName}</div>
                        </td>
                        <td className="p-3 text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="p-3 text-slate-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}</td>
                        <td className="p-3 text-right font-mono">₹{inv.invoiceTotal.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">₹{inv.alreadyPaid.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-600">
                          ₹{inv.outstandingBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={inv.outstandingBalance}
                            value={allocVal || ''}
                            onChange={e => handleAmountChange(inv.id, e.target.value, inv.outstandingBalance)}
                            className="w-28 px-2 py-1 text-xs font-mono font-bold text-right border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 outline-none focus:border-blue-600"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                          ₹{balAfter.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl transition-all"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={submitting || grandTotalAllocated <= 0}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <CheckCircle className="w-4 h-4" />
            {submitting ? 'Allocating Payments...' : `Confirm Settlement (₹${grandTotalAllocated.toLocaleString('en-IN')})`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PaymentAllocationModal;
