import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCcw, Printer, Download, AlertCircle, TrendingUp, TrendingDown, Landmark, Banknote
} from 'lucide-react';
import { reportsAPI } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CashFlowView = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const companyId = sessionStorage.getItem('companyId');

  const fetchReport = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await reportsAPI.cashFlow(companyId, from, to);
      setData(res.data || null);
    } catch (err) {
      console.error('Failed to fetch cash flow:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [companyId]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const fmt = (v) => {
    if (v === 0 || v === '0' || !v) return '—';
    return `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };
  
  const fmtPdf = (v) => {
    if (v === 0 || v === '0' || !v) return '—';
    return `Rs. ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const companyName = sessionStorage.getItem('companyName') || 'CalBooks Company';
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('CASH FLOW STATEMENT', 14, 22);
    
    // Sub-header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Company: ${companyName}`, 14, 28);
    doc.text(`Filter range: ${from || 'Start'} to ${to || 'End'}`, 14, 33);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 38);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 42, 196, 42);
    
    const s = data.summary;
    let tableRows = [];
    
    // Operating Activities
    tableRows.push([{ content: 'DAY-TO-DAY BUSINESS (OPERATIONS)', colSpan: 2, styles: { fontStyle: 'bold', textColor: [30, 97, 240] } }]);
    tableRows.push(['Net Profit / (Loss)', fmtPdf(s.netIncome)]);
    data.operatingActivities.adjustments.forEach(a => {
       if(a.amount !== 0) tableRows.push([`  ${a.name}`, fmtPdf(a.amount)]);
    });
    data.operatingActivities.workingCapitalChanges.forEach(a => {
       if(a.amount !== 0) tableRows.push([`  ${a.name}`, fmtPdf(a.amount)]);
    });
    tableRows.push([{ content: 'Total Cash from Operations', styles: { fontStyle: 'bold' } }, { content: fmtPdf(s.cashFromOperations), styles: { fontStyle: 'bold' } }]);
    
    // Investing Activities
    tableRows.push([{ content: 'BUYING / SELLING ASSETS (INVESTING)', colSpan: 2, styles: { fontStyle: 'bold', textColor: [30, 97, 240] } }]);
    if (data.investingActivities.length === 0) tableRows.push(['  No asset purchases or sales', '—']);
    data.investingActivities.forEach(a => {
       if(a.amount !== 0) tableRows.push([`  ${a.name}`, fmtPdf(a.amount)]);
    });
    tableRows.push([{ content: 'Total Cash from Investing', styles: { fontStyle: 'bold' } }, { content: fmtPdf(s.cashFromInvesting), styles: { fontStyle: 'bold' } }]);
    
    // Financing Activities
    tableRows.push([{ content: 'FUNDING & LOANS (FINANCING)', colSpan: 2, styles: { fontStyle: 'bold', textColor: [30, 97, 240] } }]);
    if (data.financingActivities.length === 0) tableRows.push(['  No funding or loans', '—']);
    data.financingActivities.forEach(a => {
       if(a.amount !== 0) tableRows.push([`  ${a.name}`, fmtPdf(a.amount)]);
    });
    tableRows.push([{ content: 'Total Cash from Financing', styles: { fontStyle: 'bold' } }, { content: fmtPdf(s.cashFromFinancing), styles: { fontStyle: 'bold' } }]);
    
    // Net Cash Flow
    tableRows.push([{ content: 'CASH SUMMARY', colSpan: 2, styles: { fontStyle: 'bold', textColor: [15, 23, 42], fillColor: [241, 245, 249] } }]);
    tableRows.push([{ content: 'Net Cash Flow for the period', styles: { fontStyle: 'bold' } }, { content: fmtPdf(s.netCashFlow), styles: { fontStyle: 'bold' } }]);
    tableRows.push(['Starting Bank Balance', fmtPdf(s.reconciliation.cashAtStart)]);
    tableRows.push([{ content: 'Ending Bank Balance', styles: { fontStyle: 'bold' } }, { content: fmtPdf(s.reconciliation.cashAtEnd), styles: { fontStyle: 'bold' } }]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Account Name / Item', 'Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 4 }
    });
    
    doc.save(`Cash_Flow_${companyName.replace(/\s+/g, '_')}.pdf`);
  };

  if (!companyId) {
    return (
      <div className="py-20 flex flex-col items-center gap-4 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 m-8">
        <AlertCircle size={40} className="text-[#1e61f0]" />
        <div className="text-center">
          <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">No Company Active</h3>
          <p className="text-[12px] font-bold mt-1">Please select a company from the Settings hub to view reports.</p>
        </div>
        <button onClick={() => navigate('/settings/company')} className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest shadow-xl">
          Go to Settings
        </button>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-fade-in font-sans overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40 no-print shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-[18px] font-bold text-slate-900 tracking-tight leading-none">Cash Flow Statement</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Simple Inflow & Outflow Analyzer</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-6 py-2 bg-[#1e61f0] text-white rounded-lg text-[12px] font-bold hover:bg-[#1a54d1] transition-all shadow-lg shadow-blue-500/20">
             <Download size={16}/> Export PDF
           </button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center justify-between no-print shrink-0">
         <form onSubmit={handleApplyFilter} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">From:</span>
               <input 
                 type="date" 
                 value={from} 
                 onChange={(e) => setFrom(e.target.value)} 
                 className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 outline-none"
               />
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">To:</span>
               <input 
                 type="date" 
                 value={to} 
                 onChange={(e) => setTo(e.target.value)} 
                 className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 outline-none"
               />
            </div>
            <button type="submit" className="px-4 py-1.5 bg-[#1e61f0] text-white rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-[#164ec4] transition-all">
              Apply
            </button>
         </form>
         <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Currency: INR</span>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
        <div className="max-w-[1100px] mx-auto space-y-8 pb-10">
          
          {loading ? (
             <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
               <div className="w-10 h-10 border-4 border-slate-100 border-t-[#1e61f0] rounded-full animate-spin mb-4" />
               <p className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Generating Report...</p>
             </div>
          ) : !data || !s ? (
             <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400 text-[13px]">
               No cash flow data available for the period
             </div>
          ) : (
             <>
                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <MetricCard label="Operating" value={s.cashFromOperations} icon={<TrendingUp size={24} />} color="blue" />
                   <MetricCard label="Investing" value={s.cashFromInvesting} icon={<TrendingDown size={24} />} color="amber" />
                   <MetricCard label="Financing" value={s.cashFromFinancing} icon={<Landmark size={24} />} color="purple" />
                   <MetricCard label="Net Cash Flow" value={s.netCashFlow} icon={<Banknote size={24} />} color={s.netCashFlow >= 0 ? "emerald" : "rose"} />
                </div>

                {/* Statement Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                   <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-4">Account Name / Activity</th>
                          <th className="px-8 py-4 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="text-[13px] text-slate-700">
                        
                        {/* 1. Operating */}
                        <tr className="bg-slate-50/30 border-b border-slate-100">
                          <td colSpan={2} className="px-8 py-3 text-[11px] font-black text-[#1e61f0] uppercase tracking-widest">
                            Day-To-Day Business (Operations)
                          </td>
                        </tr>
                        <DataRow label="Net Profit / (Loss)" amount={s.netIncome} bold />
                        {data.operatingActivities.adjustments.map((a, i) => (
                           a.amount !== 0 && <DataRow key={`adj-${i}`} label={a.name} amount={a.amount} indent />
                        ))}
                        {data.operatingActivities.workingCapitalChanges.map((a, i) => (
                           a.amount !== 0 && <DataRow key={`wc-${i}`} label={a.name} amount={a.amount} indent />
                        ))}
                        <DataRow label="Total Cash from Operations" amount={s.cashFromOperations} highlight />

                        {/* 2. Investing */}
                        <tr className="bg-slate-50/30 border-y border-slate-100">
                          <td colSpan={2} className="px-8 py-3 text-[11px] font-black text-[#1e61f0] uppercase tracking-widest mt-4">
                            Buying / Selling Assets (Investing)
                          </td>
                        </tr>
                        {data.investingActivities.length === 0 && <DataRow label="No asset purchases or sales" amount={0} indent isZero />}
                        {data.investingActivities.map((a, i) => (
                           a.amount !== 0 && <DataRow key={`inv-${i}`} label={a.name} amount={a.amount} indent />
                        ))}
                        <DataRow label="Total Cash from Investing" amount={s.cashFromInvesting} highlight />

                        {/* 3. Financing */}
                        <tr className="bg-slate-50/30 border-y border-slate-100">
                          <td colSpan={2} className="px-8 py-3 text-[11px] font-black text-[#1e61f0] uppercase tracking-widest mt-4">
                            Funding & Loans (Financing)
                          </td>
                        </tr>
                        {data.financingActivities.length === 0 && <DataRow label="No funding or loans" amount={0} indent isZero />}
                        {data.financingActivities.map((a, i) => (
                           a.amount !== 0 && <DataRow key={`fin-${i}`} label={a.name} amount={a.amount} indent />
                        ))}
                        <DataRow label="Total Cash from Financing" amount={s.cashFromFinancing} highlight />

                        {/* Reconciliation */}
                        <tr className="bg-slate-50 border-y-2 border-slate-200">
                          <td colSpan={2} className="px-8 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest">
                            Cash Summary
                          </td>
                        </tr>
                        <DataRow label="Net Cash Flow for the period" amount={s.netCashFlow} bold />
                        <DataRow label="Starting Bank Balance" amount={s.reconciliation.cashAtStart} />
                        <DataRow label="Ending Bank Balance" amount={s.reconciliation.cashAtEnd} bold highlight />

                      </tbody>
                   </table>
                </div>
             </>
          )}
        </div>
      </div>
    </div>
  );

  function MetricCard({ label, value, icon, color }) {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      amber: 'bg-amber-50 text-amber-600',
      purple: 'bg-purple-50 text-purple-600',
      emerald: 'bg-emerald-50 text-emerald-600',
      rose: 'bg-rose-50 text-rose-600'
    };
    const textColors = {
      blue: 'text-blue-700',
      amber: 'text-amber-700',
      purple: 'text-purple-700',
      emerald: 'text-emerald-700',
      rose: 'text-rose-700'
    };
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
            {icon}
          </div>
        </div>
        <h3 className={`text-[22px] font-black tracking-tight ${textColors[color]}`}>{fmt(value)}</h3>
      </div>
    );
  }

  function DataRow({ label, amount, indent, bold, highlight, isZero }) {
    return (
      <tr className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${highlight ? 'bg-slate-50/50' : ''}`}>
        <td className={`px-8 py-3.5 ${indent ? 'pl-14 text-slate-500' : 'text-slate-800'} ${bold || highlight ? 'font-bold text-[13.5px]' : 'font-medium'} ${isZero ? 'italic text-slate-400' : ''}`}>
          {label}
        </td>
        <td className={`px-8 py-3.5 text-right font-semibold ${highlight ? 'text-slate-900 font-bold text-[14px]' : 'text-slate-600'} ${isZero ? 'text-slate-400' : ''}`}>
          {isZero ? '—' : fmt(amount)}
        </td>
      </tr>
    );
  }
};

export default CashFlowView;
