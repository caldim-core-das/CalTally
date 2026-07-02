import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Search, Download, RefreshCcw, X,
  TrendingDown, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { reportsAPI } from '../../services/api';

const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const getStatus = (outstanding, billTotal, dueDate) => {
  if (outstanding <= 0.01) return 'Paid';
  if (dueDate && new Date(dueDate) < new Date()) return 'Overdue';
  if (outstanding < billTotal - 0.01) return 'Partially Paid';
  return 'Unpaid';
};

const STATUS_STYLE = {
  'Paid':           { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Partially Paid': { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  'Unpaid':         { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
  'Overdue':        { bg: 'bg-rose-100',    text: 'text-rose-800',    dot: 'bg-rose-600' },
};

const VendorOutstandingView = ({ companyId: propCompanyId }) => {
  const companyId = propCompanyId || sessionStorage.getItem('companyId');

  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await reportsAPI.payablesReport(companyId);
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load payables:', e);
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [companyId]);

  const enriched = useMemo(() => data.map(bill => {
    const billTotal  = parseFloat(bill.totalAmount || bill.amount || 0);
    const paid       = parseFloat(bill.amountPaid  || bill.paid   || 0);
    const outstanding = Math.max(0, billTotal - paid);
    const status     = getStatus(outstanding, billTotal, bill.dueDate);

    let daysOverdue = 0;
    if (bill.dueDate && outstanding > 0) {
      const diffTime = new Date().setHours(0,0,0,0) - new Date(bill.dueDate).setHours(0,0,0,0);
      daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    
    let agingBucket = 'Current';
    if (daysOverdue > 90) agingBucket = '> 90 Days';
    else if (daysOverdue > 60) agingBucket = '61-90 Days';
    else if (daysOverdue > 30) agingBucket = '31-60 Days';
    else if (daysOverdue > 0) agingBucket = '1-30 Days';
    else if (outstanding === 0) agingBucket = 'Paid';

    return { ...bill, billTotal, paid, outstanding, status, daysOverdue, agingBucket };
  }), [data]);

  const filtered = useMemo(() => enriched.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (b.vendorName || b.Vendor?.name || b.Ledger?.name || '').toLowerCase().includes(q) ||
      (b.billNumber || b.number || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || b.status === statusFilter;
    return matchSearch && matchStatus;
  }), [enriched, search, statusFilter]);

  const totals = useMemo(() => ({
    total:       filtered.reduce((s, b) => s + b.billTotal,  0),
    paid:        filtered.reduce((s, b) => s + b.paid,       0),
    outstanding: filtered.reduce((s, b) => s + b.outstanding, 0),
    overdue:     filtered.filter(b => b.status === 'Overdue').reduce((s, b) => s + b.outstanding, 0),
  }), [filtered]);

  const agingTotals = useMemo(() => {
    const t = { 'Current': 0, '1-30 Days': 0, '31-60 Days': 0, '61-90 Days': 0, '> 90 Days': 0 };
    filtered.forEach(b => {
      if (b.outstanding > 0 && t[b.agingBucket] !== undefined) {
        t[b.agingBucket] += b.outstanding;
      }
    });
    return t;
  }, [filtered]);

  const exportCSV = () => {
    const headers = ['Vendor', 'Bill No', 'Bill Date', 'Due Date', 'Amount', 'Paid', 'Outstanding', 'Status', 'Aging Bucket'];
    const rows = filtered.map(b => [
      b.vendorName || b.Vendor?.name || b.Ledger?.name || '',
      b.billNumber || b.number || '',
      fmtDate(b.date),
      fmtDate(b.dueDate),
      b.billTotal.toFixed(2),
      b.paid.toFixed(2),
      b.outstanding.toFixed(2),
      b.status,
      b.agingBucket
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vendor_outstanding.csv';
    a.click();
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#1e61f0] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <ShoppingBag size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em]">Accounts Payable</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Vendor Outstanding</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Dynamically calculated from purchase bills and vendor payments</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="p-2.5 border border-slate-100 rounded-xl bg-white hover:bg-slate-50 text-slate-400 shadow-sm transition-all"><RefreshCcw size={16} /></button>
          <button onClick={exportCSV}  className="p-2.5 border border-slate-100 rounded-xl bg-white hover:bg-slate-50 text-slate-400 shadow-sm transition-all"><Download size={16} /></button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: 'Total Bills',    value: fmt(totals.total),       color: 'bg-blue-50/50 text-blue-900 border border-blue-100/70',                       Icon: TrendingDown },
          { label: 'Total Paid',     value: fmt(totals.paid),        color: 'bg-emerald-50/50 text-emerald-900 border border-emerald-100/70',              Icon: CheckCircle2 },
          { label: 'Outstanding',    value: fmt(totals.outstanding), color: 'bg-orange-50/50 text-orange-900 border border-orange-100/70',                 Icon: AlertCircle },
          { label: 'Overdue',        value: fmt(totals.overdue),     color: 'bg-rose-50/50 text-rose-900 border border-rose-100/70',                       Icon: Clock },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className={`${color} rounded-2xl px-6 py-5 flex flex-col gap-2`}>
            <div className="flex items-center gap-2">
              <Icon size={14} className="opacity-70" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>
            </div>
            <span className="text-2xl font-black tracking-tight font-mono">{value}</span>
          </div>
        ))}
      </div>

      {/* Aging Buckets */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Current (Not Due)', value: fmt(agingTotals['Current']),    color: 'bg-slate-50 text-slate-700 border-slate-200' },
          { label: '1 - 30 Days',       value: fmt(agingTotals['1-30 Days']),  color: 'bg-orange-50 text-orange-700 border-orange-200' },
          { label: '31 - 60 Days',      value: fmt(agingTotals['31-60 Days']), color: 'bg-orange-100 text-orange-800 border-orange-300' },
          { label: '61 - 90 Days',      value: fmt(agingTotals['61-90 Days']), color: 'bg-rose-50 text-rose-700 border-rose-200' },
          { label: '> 90 Days',         value: fmt(agingTotals['> 90 Days']),  color: 'bg-rose-100 text-rose-800 border-rose-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`border rounded-xl px-4 py-3 flex flex-col gap-1 ${color}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</span>
            <span className="text-lg font-black tracking-tight font-mono">{value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-300 shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search vendor or bill number..."
            className="flex-1 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-300" />
          {search && <button onClick={() => setSearch('')}><X size={12} className="text-slate-300 hover:text-slate-600" /></button>}
        </div>
        <div className="flex gap-2">
          {['', 'Unpaid', 'Partially Paid', 'Overdue', 'Paid'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all
                ${statusFilter === s ? 'bg-[#1e61f0] text-white border-[#1e61f0]' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#fcfdfe] text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 border-b border-slate-50">
            <tr>
              <th className="px-6 py-5">Vendor</th>
              <th className="px-6 py-5">Bill No.</th>
              <th className="px-6 py-5">Bill Date</th>
              <th className="px-6 py-5">Due Date</th>
              <th className="px-6 py-5 text-right">Amount (₹)</th>
              <th className="px-6 py-5 text-right">Paid (₹)</th>
              <th className="px-6 py-5 text-right">Outstanding (₹)</th>
              <th className="px-6 py-5">Aging</th>
              <th className="px-6 py-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-[13px] font-semibold text-slate-700">
            {loading ? (
              <tr><td colSpan={8} className="py-16 text-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin mx-auto" />
                <p className="mt-3 text-sm text-slate-400 font-medium">Calculating vendor outstanding...</p>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag size={20} className="text-slate-400" />
                </div>
                <p className="text-slate-400 font-bold">No vendor outstanding data</p>
                <p className="text-slate-300 text-xs font-medium mt-1">Create purchase bills to see outstanding amounts here</p>
              </td></tr>
            ) : (
              filtered.map((b, i) => {
                const s = STATUS_STYLE[b.status] || STATUS_STYLE['Unpaid'];
                const vendorName = b.vendorName || b.Vendor?.name || b.Ledger?.name || b.name || '—';
                const isOverdue  = b.status === 'Overdue';
                return (
                  <tr key={b.id || i} className={`hover:bg-slate-50/50 transition-all ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{vendorName}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                      {b.billNumber || b.number || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{fmtDate(b.date)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-slate-500 ${isOverdue ? 'text-rose-600 font-bold' : ''}`}>
                        {fmtDate(b.dueDate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{fmt(b.billTotal)}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{fmt(b.paid)}</td>
                    <td className="px-6 py-4 text-right font-mono font-black text-orange-600">{fmt(b.outstanding)}</td>
                    <td className="px-6 py-4">
                      {b.outstanding > 0 ? (
                        <span className={`text-[11px] font-bold ${b.daysOverdue > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          {b.agingBucket} {b.daysOverdue > 0 ? `(${b.daysOverdue}d)` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-slate-50/80 border-t-2 border-slate-100">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {filtered.length} records
                </td>
                <td className="px-6 py-4 text-right font-mono font-black text-slate-900">{fmt(totals.total)}</td>
                <td className="px-6 py-4 text-right font-mono font-black text-emerald-600">{fmt(totals.paid)}</td>
                <td className="px-6 py-4 text-right font-mono font-black text-orange-600">{fmt(totals.outstanding)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default VendorOutstandingView;
