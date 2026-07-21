import React, { useState } from 'react';
import { Download, Printer, ShieldAlert, CheckCircle, RefreshCw, ArrowUpRight } from 'lucide-react';
import { formatIndianRupee } from '../MoneyInput';

const ReportLayout = ({
  title,
  metadata = {},
  kpis = [],
  charts: ChartComponent,
  tabs = [],
  activeTab,
  onTabChange,
  columns = [],
  rows = [],
  exceptions = [],
  onRowClick,
  onExportExcel,
  onExportPDF,
  onPrint,
  onRefresh
}) => {
  const {
    status = 'Draft',
    version = 1,
    generatedBy = 'Admin',
    generatedOn = new Date().toLocaleDateString(),
    lastVoucher = 'N/A'
  } = metadata;

  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortField) return 0;
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  return (
    <div className="w-full space-y-8 p-6 md:p-8 bg-slate-50/50 min-h-screen font-sans font-bold">
      
      {/* Header Info Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
              ${status.toLowerCase() === 'locked' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                status.toLowerCase() === 'filed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'}`}>
              {status}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400 uppercase tracking-wider font-semibold">
            <span>Author: <strong className="text-slate-700">{generatedBy}</strong></span>
            <span>Version: <strong className="text-slate-700">V{version}</strong></span>
            <span>Locked On: <strong className="text-slate-700">{generatedOn}</strong></span>
            <span>Last Voucher: <strong className="text-slate-700">{lastVoucher}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={onRefresh} 
            className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white text-slate-500 hover:text-slate-800 transition-all"
            title="Refresh Ledger Cache"
          >
            <RefreshCw size={16} />
          </button>
          <button 
            onClick={onExportExcel} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white text-slate-600 text-xs transition-all"
          >
            <Download size={14} /> Excel
          </button>
          <button 
            onClick={onExportPDF} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white text-slate-600 text-xs transition-all"
          >
            <Download size={14} /> PDF
          </button>
          <button 
            onClick={onPrint} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs transition-all"
          >
            <Printer size={14} /> Print A4
          </button>
        </div>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{kpi.title}</span>
            <div className="text-xl font-black text-slate-900 tracking-tight mt-1">
              {kpi.isCurrency ? formatIndianRupee(kpi.value) : kpi.value}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider mt-2 flex items-center gap-1
              ${kpi.status === 'success' ? 'text-emerald-600' : kpi.status === 'warning' ? 'text-amber-500' : 'text-slate-400'}`}>
              {kpi.badge}
            </span>
          </div>
        ))}
      </div>

      {/* Chart Canvas Area */}
      {ChartComponent && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Visual Analytics Review</h3>
          <div className="h-72 w-full">
            <ChartComponent />
          </div>
        </div>
      )}

      {/* Inner Tabs Data Workspace */}
      <div className="space-y-6">
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`py-3.5 px-6 border-b-2 text-xs uppercase tracking-wider whitespace-nowrap transition-all font-black
                ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label} {tab.count !== undefined && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Tab Content Tables */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
          {activeTab === 'exceptions' ? (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Compliance Exception Audit List</h3>
              {exceptions.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-emerald-600 text-xs">
                  <CheckCircle size={16} />
                  <span>No data validation exceptions detected for this period. ready to close.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {exceptions.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl border ${ex.severity === 'critical' ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-amber-50 border-amber-100 text-amber-500'}`}>
                          <ShieldAlert size={16} />
                        </div>
                        <div>
                          <div className="text-xs text-slate-800 font-bold">{ex.message}</div>
                          <div className="text-[10px] text-slate-400 uppercase mt-0.5 font-semibold">Severity: {ex.severity} • Component: {ex.module}</div>
                        </div>
                      </div>
                      {ex.voucherId && (
                        <button 
                          onClick={() => onRowClick(ex.voucherId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[10px] transition-all"
                        >
                          Resolve <ArrowUpRight size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-black select-none">
                    {columns.map(col => (
                      <th 
                        key={col.field} 
                        className={`pb-4 cursor-pointer hover:text-slate-600 transition-all ${col.align === 'right' ? 'text-right' : ''}`}
                        onClick={() => handleSort(col.field)}
                      >
                        {col.label}
                        {sortField === col.field && (sortOrder === 'asc' ? ' ▴' : ' ▾')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold">
                  {sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="py-12 text-center text-slate-400 text-xs">
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => onRowClick && onRowClick(row.voucherId)}
                        className={`hover:bg-slate-50/50 transition-all ${onRowClick ? 'cursor-pointer' : ''}`}
                      >
                        {columns.map(col => (
                          <td key={col.field} className={`py-4 text-slate-800 ${col.align === 'right' ? 'text-right' : ''}`}>
                            {col.format ? col.format(row[col.field]) : row[col.field]}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ReportLayout;
