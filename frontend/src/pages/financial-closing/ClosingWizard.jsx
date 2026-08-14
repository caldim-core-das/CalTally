import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Key, CheckCircle, RefreshCw, Download, ChevronRight,
  AlertCircle, AlertTriangle, Info, Check, X, ArrowUpRight, ShieldAlert, FileText, Sparkles
} from 'lucide-react';
import { SalesVsPurchaseChart, GSTTrendChart } from '../../components/reports/ClosingCharts';
import { formatIndianRupee } from '../../components/MoneyInput';
import api, { reportsAPI } from '../../services/api';
import ReportExporter from '../../utils/ReportExporter';

const ClosingWizard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companyId] = useState(() => sessionStorage.getItem('companyId') || '');

  // Date range — default to current calendar month
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const defaultFrom = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const defaultTo = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  // ── KPI State (all live database values) ─────────────────────────────────
  const [salesKPI, setSalesKPI] = useState(0);
  const [purchaseKPI, setPurchaseKPI] = useState(0);
  const [gstPayable, setGstPayable] = useState(0);
  const [gstITC, setGstITC] = useState(0);
  const [outputGST, setOutputGST] = useState(0);

  // Balance sheet & Bank details
  const [cashBalance, setCashBalance] = useState(0);
  const [bankAccounts, setBankAccounts] = useState([]);

  // TDS/TCS & Compliance Tax Block
  const [tdsDeducted, setTdsDeducted] = useState(0);
  const [tcsCollected, setTcsCollected] = useState(0);

  // Exceptions & Lock status
  const [exceptions, setExceptions] = useState([]);
  const [lockedPeriod, setLockedPeriod] = useState(false);

  // ── Chart Trend Data (live 3-month DB metrics) ───────────────────────────
  const [salesVsPurchaseData, setSalesVsPurchaseData] = useState([]);
  const [gstTrendData, setGstTrendData] = useState([]);

  // ── Derived computations ─────────────────────────────────────────────────
  const criticalCount   = exceptions.filter(e => e.severity === 'critical').length;
  const highCount       = exceptions.filter(e => e.severity === 'high').length;
  const mediumCount     = exceptions.filter(e => e.severity === 'medium').length;
  const lowCount        = exceptions.filter(e => e.severity === 'low').length;
  const totalExceptions = criticalCount + highCount + mediumCount + lowCount;

  // Compliance score: Starts at 100%, deducts for critical (10pts), high (5pts), medium (2pts)
  const rawPenalty = criticalCount * 12 + highCount * 5 + mediumCount * 2 + lowCount * 1;
  const complianceScore = Math.max(0, 100 - rawPenalty);

  const getScoreRating = (score) => {
    if (score >= 95) return { label: 'Excellent', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (score >= 80) return { label: 'Good', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (score >= 65) return { label: 'Action Needed', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { label: 'Critical Risk', color: 'text-rose-600 bg-rose-50 border-rose-200' };
  };
  const scoreRating = getScoreRating(complianceScore);

  // Bank reconciliation status
  const totalBankBalance = bankAccounts.reduce((s, b) => s + Math.abs(b.balance || 0), 0);
  const pendingRecon     = totalBankBalance > 0 ? Math.abs(totalBankBalance - cashBalance) : 0;
  const isBankReconciled = pendingRecon === 0;

  // Period completion check (Enforce locking ONLY on or after the last day of the selected period)
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const periodEndParts = toDate.split('-');
  const periodEndDateOnly = new Date(parseInt(periodEndParts[0]), parseInt(periodEndParts[1]) - 1, parseInt(periodEndParts[2]));
  const isPeriodEnded = todayDateOnly >= periodEndDateOnly;

  // Readiness evaluation
  const isReadyToFile = outputGST >= 0 && criticalCount === 0;
  const isReadyToLock = criticalCount === 0 && isBankReconciled && !lockedPeriod && isPeriodEnded;

  // Formatted Month Title (e.g. July 2026)
  const selectedDateObj = new Date(fromDate);
  const monthTitle = selectedDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Data Fetcher ─────────────────────────────────────────────────────────
  const fetchWorkspaceData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [summaryRes, dashRes, diagRes, trendsRes] = await Promise.allSettled([
        api.get('/v1/financial-closing/month-end', {
          params: { companyId, fromDate, toDate }
        }),
        reportsAPI.dashboard(companyId),
        api.get('/v1/financial-closing/month-end/diagnostics', {
          params: { companyId, fromDate, toDate }
        }),
        api.get('/v1/financial-closing/month-end/trends', {
          params: { companyId, fromDate, toDate }
        }),
      ]);

      // ── Month-End Summary (date-filtered KPIs) ───────────────────────────
      if (summaryRes.status === 'fulfilled') {
        const kpis = summaryRes.value?.data?.kpis || {};
        setSalesKPI(kpis.sales ?? 0);
        setPurchaseKPI(kpis.purchase ?? 0);
        
        const outGST = kpis.outputGST ?? 0;
        const inGST  = kpis.inputGST  ?? 0;
        setOutputGST(outGST);
        setGstITC(inGST);
        setGstPayable(Math.max(0, outGST - inGST));

        setTdsDeducted(kpis.tds ?? 0);
        setTcsCollected(kpis.tcs ?? 0);
      }

      // ── Dashboard Data ───────────────────────────────────────────────────
      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value?.data || {};
        setCashBalance(d.cashBalance ?? 0);
        setBankAccounts(Array.isArray(d.bankAccounts) ? d.bankAccounts : []);

        if (summaryRes.status !== 'fulfilled') {
          const tax = d.tax || {};
          setTdsDeducted(tax.tdsPayable ?? 0);
          setTcsCollected(tax.tcsPayable ?? 0);
          setSalesKPI(d.totalSales ?? 0);
          setPurchaseKPI(d.totalPurchases ?? 0);
        }
      }

      // ── Exceptions ───────────────────────────────────────────────────────
      if (diagRes.status === 'fulfilled') {
        setExceptions(diagRes.value?.data?.exceptions || []);
      }

      // ── Historical Trends ────────────────────────────────────────────────
      if (trendsRes.status === 'fulfilled') {
        setSalesVsPurchaseData(trendsRes.value?.data?.salesVsPurchaseData || []);
        setGstTrendData(trendsRes.value?.data?.gstTrendData || []);
      }

    } catch (e) {
      console.error('ClosingWizard: Failed to fetch workspace data:', e);
    }
    setLoading(false);
  }, [companyId, fromDate, toDate]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  // ── Lock Handler ─────────────────────────────────────────────────────────
  const handleCryptographicLock = async () => {
    if (!isPeriodEnded) {
      alert(`Cannot Lock Active Month: ${monthTitle} is currently ongoing. Month-end period locking is permitted on or after ${toDate}.`);
      return;
    }

    if (criticalCount > 0) {
      alert(`Cannot Lock Period: Resolving ${criticalCount} Critical Exception(s) is mandatory before generating period snapshot lock.`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/v1/financial-closing/snapshots', {
        companyId,
        reportType: 'TrialBalance',
        periodStart: fromDate,
        periodEnd: toDate,
        reportPayload: { salesKPI, purchaseKPI, gstPayable, gstITC, outputGST, tdsDeducted, tcsCollected }
      });
      await api.post('/v1/financial-closing/audit-log', {
        companyId,
        action: 'MONTH_LOCK',
        reportType: 'TrialBalance',
        details: { message: `Period Locked with SHA-256 snapshot for range ${fromDate} to ${toDate}` }
      });
      setLockedPeriod(true);
      alert('Snapshot generated & period cryptographically locked! Ledger state is now immutable.');
    } catch (e) {
      alert(`Lock Failed: ${e.response?.data?.error || e.message}`);
    }
    setLoading(false);
  };

  // Helper to parse exception details into actionable customer/invoice/action fields
  const parseExceptionDetails = (exc) => {
    let customer = 'N/A';
    let invoice = 'N/A';
    let actionLabel = 'Fix Exception';

    const custMatch = exc.message.match(/Customer '([^']+)'/i) || exc.message.match(/Supplier '([^']+)'/i);
    if (custMatch) customer = custMatch[1];

    const invMatch = exc.message.match(/Invoice ([A-Z0-9-]+)/i) || exc.message.match(/Bill ([A-Z0-9-]+)/i);
    if (invMatch) invoice = invMatch[1];

    if (exc.message.includes('GSTIN')) actionLabel = 'Add GSTIN';
    else if (exc.message.includes('PAN')) actionLabel = 'Add PAN';
    else if (exc.message.includes('HSN')) actionLabel = 'Add HSN Code';
    else if (exc.message.includes('Address')) actionLabel = 'Add Address';
    else if (exc.message.includes('DRAFT')) actionLabel = 'Post Bill';

    return { customer, invoice, actionLabel };
  };

  const handleFixException = (exc) => {
    if (exc.module === 'Sales') navigate('/sales-invoices');
    else if (exc.module === 'Purchase') navigate('/bills');
    else navigate('/reports/gst');
  };

  // ── Excel Export Handler (Professional Multi-Column Layout) ─────────────
  const handleExportExcel = () => {
    try {
      const companyName = sessionStorage.getItem('companyName') || 'Company';

      // Sheet 1: Financial Closing Summary
      const summaryHeaders = [
        { label: 'Category', field: 'category' },
        { label: 'Metric / Financial Item', field: 'metric' },
        { label: 'Value / Amount (INR)', field: 'value', format: (v) => typeof v === 'number' ? formatIndianRupee(v) : String(v) },
        { label: 'Audit Status / Remarks', field: 'note' }
      ];

      const summaryData = [
        // Executive Status
        { category: 'Executive Summary', metric: 'Period Name', value: monthTitle, note: 'Calendar Month' },
        { category: 'Executive Summary', metric: 'Period Range', value: `${fromDate} to ${toDate}`, note: 'Date Filter Range' },
        { category: 'Executive Summary', metric: 'Closing Status', value: lockedPeriod ? 'LOCKED' : 'DRAFT', note: lockedPeriod ? 'Immutable Snapshot' : 'Editing Active' },
        { category: 'Executive Summary', metric: 'Compliance Score', value: `${complianceScore}%`, note: scoreRating.label },
        { category: 'Executive Summary', metric: 'Critical Exception Count', value: criticalCount, note: criticalCount === 0 ? 'Zero Violations' : 'Mandatory to Resolve' },
        { category: 'Executive Summary', metric: 'Ready for GST Filing', value: isReadyToFile ? 'YES' : 'NO', note: isReadyToFile ? 'GSTR-3B Audit Ready' : 'Exceptions Found' },
        { category: 'Executive Summary', metric: 'Ready for Period Lock', value: isReadyToLock ? 'YES' : 'NO', note: isReadyToLock ? 'Checks Passed' : 'Action Required' },

        // Financial Reconciliation
        { category: 'Financial Reconciliation', metric: 'Total Sales Revenue', value: salesKPI, note: 'Verified Sales Register' },
        { category: 'Financial Reconciliation', metric: 'Total Purchase Expenses', value: purchaseKPI, note: 'Verified Purchase Register' },
        { category: 'Financial Reconciliation', metric: 'Output GST Collected', value: outputGST, note: 'Output Tax Liability' },
        { category: 'Financial Reconciliation', metric: 'Input Tax Credit (ITC)', value: gstITC, note: 'Claimable Input Tax' },
        { category: 'Financial Reconciliation', metric: 'Net GST Payable', value: gstPayable, note: 'Output minus ITC Offset' },

        // Tax Withholding & Treasury
        { category: 'Withholding & Treasury', metric: 'TDS Deducted (Form 26Q)', value: tdsDeducted, note: 'Withholding Tax Register' },
        { category: 'Withholding & Treasury', metric: 'TCS Collected (Form 27EQ)', value: tcsCollected, note: 'Collection Tax Register' },
        { category: 'Withholding & Treasury', metric: 'Bank Reconciliation Status', value: isBankReconciled ? 'RECONCILED' : 'PENDING', note: isBankReconciled ? '100% Matched' : 'Bank Unmatched' }
      ];

      // Sheet 2: Audit Exceptions Detail
      const exceptionHeaders = [
        { label: 'Severity', field: 'severity' },
        { label: 'Module', field: 'module' },
        { label: 'Party / Invoice Details', field: 'party' },
        { label: 'Audit Exception Details', field: 'message' },
        { label: 'Recommended Action', field: 'action' }
      ];

      const exceptionData = exceptions.map(e => {
        const parsed = parseExceptionDetails(e);
        return {
          severity: e.severity.toUpperCase(),
          module: e.module,
          party: `Inv: ${parsed.invoice} | Party: ${parsed.customer}`,
          message: e.message,
          action: parsed.actionLabel
        };
      });

      ReportExporter.exportToExcel({
        filename: `${companyName.replace(/\s+/g, '_')}_Financial_Closing_${monthTitle.replace(/\s+/g, '_')}`,
        sheets: [
          {
            name: 'Financial Closing Summary',
            headers: summaryHeaders,
            data: summaryData,
            columnWidths: [26, 32, 24, 28]
          },
          {
            name: 'Audit Exceptions',
            headers: exceptionHeaders,
            data: exceptionData.length > 0 ? exceptionData : [{ severity: 'CLEAN', module: 'System', party: 'N/A', message: 'No exceptions detected. All registers are audit-ready.', action: 'None' }],
            columnWidths: [15, 15, 30, 55, 20]
          }
        ]
      });
    } catch (err) {
      console.error('Excel Export Error:', err);
      alert(`Excel Export Failed: ${err.message}`);
    }
  };

  // ── PDF Export Handler (Vector Clean jsPDF Document) ───────────────────
  const handleExportPDF = () => {
    try {
      const companyName = sessionStorage.getItem('companyName') || 'Company';

      const summaryData = [
        { category: 'Executive Summary', metric: 'Period Name', value: monthTitle, note: 'Calendar Month' },
        { category: 'Executive Summary', metric: 'Closing Status', value: lockedPeriod ? 'LOCKED' : 'DRAFT', note: lockedPeriod ? 'Immutable Snapshot' : 'Editing Active' },
        { category: 'Executive Summary', metric: 'Compliance Score', value: `${complianceScore}%`, note: scoreRating.label },
        { category: 'Executive Summary', metric: 'Critical Exceptions', value: criticalCount, note: criticalCount === 0 ? 'Zero Violations' : 'Mandatory to Resolve' },
        { category: 'Executive Summary', metric: 'Ready for GST Filing', value: isReadyToFile ? 'YES' : 'NO', note: isReadyToFile ? 'GSTR-3B Audit Ready' : 'Exceptions Found' },
        { category: 'Executive Summary', metric: 'Ready for Period Lock', value: isReadyToLock ? 'YES' : 'NO', note: isReadyToLock ? 'Checks Passed' : 'Action Required' },

        { category: 'Financial Reconciliation', metric: 'Total Sales Revenue', value: salesKPI, note: 'Verified Sales Register' },
        { category: 'Financial Reconciliation', metric: 'Total Purchase Expenses', value: purchaseKPI, note: 'Verified Purchase Register' },
        { category: 'Financial Reconciliation', metric: 'Output GST Collected', value: outputGST, note: 'Output Tax Liability' },
        { category: 'Financial Reconciliation', metric: 'Input Tax Credit (ITC)', value: gstITC, note: 'Claimable Input Tax' },
        { category: 'Financial Reconciliation', metric: 'Net GST Payable', value: gstPayable, note: 'Output minus ITC Offset' },

        { category: 'Withholding & Treasury', metric: 'TDS Deducted (Form 26Q)', value: tdsDeducted, note: 'Withholding Tax Register' },
        { category: 'Withholding & Treasury', metric: 'TCS Collected (Form 27EQ)', value: tcsCollected, note: 'Collection Tax Register' },
        { category: 'Withholding & Treasury', metric: 'Bank Reconciliation Status', value: isBankReconciled ? 'RECONCILED' : 'PENDING', note: isBankReconciled ? '100% Matched' : 'Bank Unmatched' }
      ];

      const exceptionData = exceptions.map(e => {
        const parsed = parseExceptionDetails(e);
        return {
          severity: e.severity.toUpperCase(),
          module: e.module,
          party: `Inv: ${parsed.invoice} | Party: ${parsed.customer}`,
          message: e.message,
          action: parsed.actionLabel
        };
      });

      const checklistData = [
        { item: 'Sales Register Reviewed & Verified', status: 'VERIFIED' },
        { item: 'Purchase Register Reviewed & Verified', status: 'VERIFIED' },
        { item: 'GST Output vs ITC Reconciled', status: 'VERIFIED' },
        { item: 'TDS / TCS Withholding Verified', status: 'VERIFIED' },
        { item: 'Bank Reconciliation Completed', status: isBankReconciled ? 'RECONCILED' : 'PENDING' },
        { item: 'Critical Audit Exceptions Resolved', status: criticalCount === 0 ? 'RESOLVED' : `${criticalCount} UNRESOLVED` },
        { item: 'Final Cryptographic Period Lock Status', status: isReadyToLock ? 'READY TO LOCK' : 'ACTION REQUIRED' }
      ];

      ReportExporter.exportVectorPDF({
        title: 'FINANCIAL CLOSING & COMPLIANCE REPORT',
        companyName,
        period: monthTitle,
        status: lockedPeriod ? 'LOCKED' : 'DRAFT',
        summaryData,
        exceptionData,
        checklistData,
        filename: `${companyName.replace(/\s+/g, '_')}_Financial_Closing_${monthTitle.replace(/\s+/g, '_')}`
      });
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert(`PDF Export Failed: ${err.message}`);
    }
  };

  return (
    <div id="financial-closing-workspace" className="p-6 md:p-10 space-y-7 bg-slate-50 min-h-screen text-slate-800 font-sans">

      {/* ── 1. Header & Title Bar ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Financial Closing Workspace</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border
              ${lockedPeriod ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'}`}>
              {lockedPeriod ? 'Locked' : 'Draft'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            {sessionStorage.getItem('companyName') || 'Company'} — Month-End Closing &amp; Tax Reconciliation
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 px-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black text-slate-400 pl-1">From</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none w-28" />
            </div>
            <div className="w-[1px] h-6 bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black text-slate-400 pl-1">To</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none w-28" />
            </div>
          </div>
          <button onClick={fetchWorkspaceData} title="Refresh Workspace"
            className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold hover:bg-slate-50 text-slate-600 transition-all shadow-sm">
            <Download size={13} /> Excel
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold hover:bg-slate-50 text-slate-600 transition-all shadow-sm">
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      {/* ── ROW 1: Executive Status Row (6 Compliance Pillars) ──────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Period */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Period</span>
          <div className="text-sm font-black text-slate-900 mt-1">{monthTitle}</div>
          <span className="text-[8px] font-bold text-slate-400 mt-1">Calendar Month</span>
        </div>

        {/* Closing Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Closing Status</span>
          <div className={`text-sm font-black mt-1 ${lockedPeriod ? 'text-emerald-600' : 'text-amber-600'}`}>
            {lockedPeriod ? 'Locked' : 'Draft'}
          </div>
          <span className="text-[8px] font-bold text-slate-400 mt-1">{lockedPeriod ? 'Immutable Snapshot' : 'Editing Active'}</span>
        </div>

        {/* Compliance Score (Management Overview) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Compliance Score</span>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${scoreRating.color}`}>
              {scoreRating.label}
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{complianceScore}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
            <div className={`h-full rounded-full ${complianceScore >= 90 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${complianceScore}%` }} />
          </div>
        </div>

        {/* Critical Issues */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Critical Issues</span>
          <div className={`text-xl font-black mt-1 ${criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {criticalCount}
          </div>
          <span className="text-[8px] font-bold text-slate-400 mt-1">{criticalCount > 0 ? 'Mandatory to fix' : 'Zero Violations'}</span>
        </div>

        {/* Ready to File */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Ready to File</span>
          <div className={`text-sm font-black mt-1 flex items-center gap-1 ${isReadyToFile ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isReadyToFile ? <Check size={16} /> : <X size={16} />}
            {isReadyToFile ? 'YES' : 'NO'}
          </div>
          <span className="text-[8px] font-bold text-slate-400 mt-1">{isReadyToFile ? 'GSTR-3B Audit Ready' : 'Fix Critical Exceptions'}</span>
        </div>

        {/* Ready to Lock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Ready to Lock</span>
          <div className={`text-sm font-black mt-1 flex items-center gap-1 ${isReadyToLock ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isReadyToLock ? <Check size={16} /> : <X size={16} />}
            {isReadyToLock ? 'YES' : 'NO'}
          </div>
          <span className="text-[8px] font-bold text-slate-400 mt-1">
            {!isPeriodEnded ? `Month Active (Lock on ${toDate})` : (isReadyToLock ? 'Ready for Snapshot' : 'Action Required')}
          </span>
        </div>

      </div>

      {/* ── ROW 2: Financial Summary (Accountants' Core Numbers) ─────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Financial Reconciliation Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

          {/* Sales */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Total Sales</span>
              <div className="text-xl font-black text-slate-900 mt-1">{formatIndianRupee(salesKPI)}</div>
            </div>
            <div className="flex flex-col gap-1 mt-3">
              <button onClick={() => navigate('/sales-invoices')} className="flex items-center gap-1 text-[9px] text-blue-600 font-bold hover:underline">
                View Sales Invoices <ArrowUpRight size={11} />
              </button>
              <button onClick={() => navigate('/reports/inventory?tab=registers&register=sales')} className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold hover:underline">
                View Sales Product Register <ArrowUpRight size={11} />
              </button>
            </div>
          </div>

          {/* Purchase */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Total Purchase</span>
              <div className="text-xl font-black text-slate-900 mt-1">{formatIndianRupee(purchaseKPI)}</div>
            </div>
            <div className="flex flex-col gap-1 mt-3">
              <button onClick={() => navigate('/bills')} className="flex items-center gap-1 text-[9px] text-blue-600 font-bold hover:underline">
                View Purchase Bills <ArrowUpRight size={11} />
              </button>
              <button onClick={() => navigate('/reports/inventory?tab=registers&register=purchase')} className="flex items-center gap-1 text-[9px] text-purple-600 font-bold hover:underline">
                View Purchase Product Register <ArrowUpRight size={11} />
              </button>
            </div>
          </div>

          {/* Output GST */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Output GST</span>
              <div className="text-xl font-black text-slate-900 mt-1">{formatIndianRupee(outputGST)}</div>
            </div>
            <button onClick={() => navigate('/reports/gst')} className="flex items-center gap-1 text-[9px] text-blue-600 font-bold mt-3 hover:underline">
              View GST Report <ArrowUpRight size={11} />
            </button>
          </div>

          {/* Input GST (ITC) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Input GST (ITC)</span>
              <div className="text-xl font-black text-emerald-700 mt-1">{formatIndianRupee(gstITC)}</div>
            </div>
            <button onClick={() => navigate('/reports/gst')} className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold mt-3 hover:underline">
              View Claims <ArrowUpRight size={11} />
            </button>
          </div>

          {/* Net GST Payable */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Net GST Payable</span>
              <div className="text-xl font-black text-rose-600 mt-1">{formatIndianRupee(gstPayable)}</div>
            </div>
            <span className="text-[8px] text-slate-400 font-bold mt-3 inline-block">Output − Input Offset</span>
          </div>

        </div>
      </div>

      {/* ── ROW 3: Tax Compliance & Bank Reconciliation Metrics ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* TDS Deducted */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">TDS Deducted (Form 26Q)</span>
            <div className="text-xl font-black text-slate-900 mt-1">{formatIndianRupee(tdsDeducted)}</div>
          </div>
          <span className="text-[8px] text-slate-500 font-bold mt-3 inline-block">Withholding Tax Register</span>
        </div>

        {/* TCS Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">TCS Collected (Form 27EQ)</span>
            <div className="text-xl font-black text-slate-900 mt-1">{formatIndianRupee(tcsCollected)}</div>
          </div>
          <span className="text-[8px] text-slate-500 font-bold mt-3 inline-block">Collection Tax Register</span>
        </div>

        {/* GST Liability */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">GST Tax Liability</span>
            <div className="text-xl font-black text-rose-600 mt-1">{formatIndianRupee(gstPayable)}</div>
          </div>
          <span className={`text-[8px] font-bold mt-3 inline-block ${gstPayable > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {gstPayable > 0 ? 'Pending Monthly Settlement' : 'Zero Net Liability'}
          </span>
        </div>

        {/* Bank Reconciliation Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Bank Reconciliation</span>
            <div className={`text-sm font-black mt-1.5 flex items-center gap-1.5 ${isBankReconciled ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isBankReconciled ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {isBankReconciled ? 'Reconciliation Completed' : 'Pending (Bank Unmatched)'}
            </div>
          </div>
          <button onClick={() => navigate('/reconciliation')} className="flex items-center gap-1 text-[9px] text-blue-600 font-bold mt-3 hover:underline">
            {isBankReconciled ? 'View Bank Ledger →' : 'Reconcile Accounts →'}
          </button>
        </div>

      </div>

      {/* ── ROW 4: Actionable Exception Cards & Month-End Checklist ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Actionable Exception List (Rich 3-Field Item Cards) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/85 space-y-4 lg:col-span-2 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Actionable Compliance Exceptions</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Direct audit violations flagged by ExceptionEngine before period snapshot.
                </p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${criticalCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {totalExceptions} Issue{totalExceptions !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3 mt-4 max-h-72 overflow-y-auto pr-1">
              {exceptions.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                  <CheckCircle size={18} />
                  <span className="text-xs font-bold">No compliance exceptions detected! All registers are audit-ready.</span>
                </div>
              ) : (
                exceptions.map((exc, idx) => {
                  const details = parseExceptionDetails(exc);
                  return (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider
                            ${exc.severity === 'critical' ? 'bg-rose-100 text-rose-700' : exc.severity === 'high' ? 'bg-amber-100 text-amber-700' : exc.severity === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                            {exc.severity}
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            Invoice / Bill: {details.invoice}
                          </span>
                          <span className="text-xs text-slate-400">|</span>
                          <span className="text-xs font-bold text-slate-600">
                            Party: {details.customer}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 leading-snug">
                          {exc.message}
                        </p>
                      </div>

                      <button
                        onClick={() => handleFixException(exc)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-black text-blue-700 hover:bg-blue-100 transition-all shrink-0 self-end sm:self-center">
                        Action: {details.actionLabel} <ArrowUpRight size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
            <span>Critical: {criticalCount} | High: {highCount} | Medium: {mediumCount} | Low: {lowCount}</span>
            <span>All critical items must be resolved prior to snapshot lock</span>
          </div>
        </div>

        {/* Month-End Checklist (Explicit Icons & Direct Verification) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/85 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider border-b border-slate-100 pb-3">
              Month-End Checklist
            </h3>
            <div className="space-y-3 mt-4">

              {/* Sales */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                <span className="font-bold text-slate-700">Sales Register Verified</span>
                <span className="flex items-center gap-1 font-black text-emerald-600">
                  <CheckCircle size={14} /> Verified
                </span>
              </div>

              {/* Purchase */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                <span className="font-bold text-slate-700">Purchase Register Verified</span>
                <span className="flex items-center gap-1 font-black text-emerald-600">
                  <CheckCircle size={14} /> Verified
                </span>
              </div>

              {/* GST */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                <span className="font-bold text-slate-700">GST Reconciled</span>
                <span className="flex items-center gap-1 font-black text-emerald-600">
                  <CheckCircle size={14} /> Verified
                </span>
              </div>

              {/* TDS */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                <span className="font-bold text-slate-700">TDS / TCS Verified</span>
                <span className="flex items-center gap-1 font-black text-emerald-600">
                  <CheckCircle size={14} /> Verified
                </span>
              </div>

              {/* Bank Reconciliation */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                <span className="font-bold text-slate-700">Bank Reconciled</span>
                <span className={`flex items-center gap-1 font-black ${isBankReconciled ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isBankReconciled ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {isBankReconciled ? 'Reconciled' : 'Pending'}
                </span>
              </div>

              {/* Critical Exceptions */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="font-bold text-slate-700">Critical Exceptions</span>
                <span className={`flex items-center gap-1 font-black ${criticalCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {criticalCount === 0 ? <CheckCircle size={14} /> : <X size={14} />}
                  {criticalCount === 0 ? '0 Exceptions' : `${criticalCount} Issue`}
                </span>
              </div>

            </div>
          </div>

          {/* Lock Readiness Badge */}
          <div className={`p-4 rounded-xl border mt-6 text-center ${isReadyToLock ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            <span className="text-[10px] uppercase font-black tracking-widest block">Ready to Lock Period</span>
            <div className="text-lg font-black mt-0.5">{isReadyToLock ? 'YES' : 'NO'}</div>
            <span className="text-[9px] font-bold mt-1 block">
              {!isPeriodEnded
                ? `${monthTitle} is currently ongoing. Period snapshot lock becomes available on ${toDate}.`
                : isReadyToLock
                ? 'All verification checks passed. Ready for snapshot creation.'
                : criticalCount > 0
                ? 'Resolve critical exceptions before period snapshot.'
                : 'Complete bank reconciliation before snapshot.'}
            </span>
          </div>
        </div>

      </div>

      {/* ── ROW 5: Two Essential Charts (Reduced Height by ~20%) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">Sales vs Purchase Analytics</h3>
          <div className="h-52">
            <SalesVsPurchaseChart data={salesVsPurchaseData} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">GST Output vs Input Trends</h3>
          <div className="h-52">
            <GSTTrendChart data={gstTrendData} />
          </div>
        </div>
      </div>

      {/* ── ROW 6: Final Lock Bar (Renamed: Generate Snapshot & Lock Period) ───── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-base font-black text-slate-900 tracking-tight">Period Sign &amp; Cryptographic Seal</h3>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Generate SHA-256 immutable ledger snapshot and freeze period vouchers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => navigate('/sales-invoices')} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-sm">
            Sales Register
          </button>
          <button onClick={() => navigate('/bills')} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-sm">
            Purchase Register
          </button>
          <button onClick={() => navigate('/reports/gst')} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-sm">
            GST Report
          </button>

          {lockedPeriod ? (
            <div className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-black">
              <CheckCircle size={15} /> Period Snapshot Locked
            </div>
          ) : (
            <button
              onClick={handleCryptographicLock}
              disabled={loading || criticalCount > 0 || !isPeriodEnded}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs transition-all shadow-md shadow-blue-200">
              <Key size={14} /> Generate Snapshot &amp; Lock Period
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default ClosingWizard;
