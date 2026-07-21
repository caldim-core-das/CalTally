import React from 'react';
import { Eye, FileSpreadsheet, FileText, Printer } from 'lucide-react';

const PurchaseProductRegisterTab = ({ data, loading, searchQuery = '', onOpenDrilldown, onExportExcel, onExportPDF }) => {
  const rawItems = data?.items || [];
  const items = searchQuery && searchQuery.trim()
    ? rawItems.filter(r => 
        (r.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.hsnCode || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rawItems;
  const totals = data?.totals || { totalSuppliers: 0, totalQty: 0, totalTaxable: 0, totalGst: 0, grandTotal: 0 };

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
          Showing <span className="text-purple-600 font-extrabold">{items.length}</span> Products Purchased
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[1100px] print:min-w-0 print:w-full">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3">Product Name & SKU</th>
              <th className="p-3">HSN Code</th>
              <th className="p-3 text-center">Unit</th>
              <th className="p-3">Warehouse</th>
              <th className="p-3 text-center">Suppliers</th>
              <th className="p-3 text-right">Qty Purchased</th>
              <th className="p-3 text-right font-bold text-purple-600">Net Qty</th>
              <th className="p-3 text-right">Closing</th>
              <th className="p-3 text-right">Avg Cost</th>
              <th className="p-3 text-right">Taxable (₹)</th>
              <th className="p-3 text-center">GST %</th>
              <th className="p-3 text-right">ITC GST (₹)</th>
              <th className="p-3 text-right font-black text-slate-900 dark:text-white">Total Value (₹)</th>
              <th className="p-3 text-center no-print">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {loading ? (
              <tr>
                <td colSpan="14" className="p-8 text-center text-slate-400 font-medium">
                  Loading Purchase Product Register...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="14" className="p-8 text-center text-slate-400 font-medium">
                  No purchase products recorded for the selected period.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.itemId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all">
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                    <div>{row.itemName}</div>
                    <span className="text-[10px] text-slate-400 font-mono">SKU: {row.sku}</span>
                  </td>
                  <td className="p-3 text-slate-500 font-mono text-[11px]">{row.hsnCode}</td>
                  <td className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">{row.unit}</td>
                  <td className="p-3 text-slate-500 text-[11px]">{row.warehouseName}</td>
                  <td className="p-3 text-center font-black text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg">
                    {row.supplierCount}
                  </td>
                  <td className="p-3 text-right font-mono">{row.qtyPurchased}</td>
                  <td className="p-3 text-right font-black text-purple-600 font-mono">{row.netQtyPurchased}</td>
                  <td className="p-3 text-right font-mono text-slate-500">{row.closingStock}</td>
                  <td className="p-3 text-right font-mono">₹{row.avgPurchasePrice.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono font-semibold">₹{row.taxableValue.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">{row.gstRate}%</td>
                  <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">
                    ₹{row.gstAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                    ₹{row.totalPurchaseValue.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center no-print">
                    <button
                      onClick={() => onOpenDrilldown(row, 'purchase')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900 dark:text-purple-300 rounded-lg text-[11px] font-bold transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {/* Tally-Style Bottom Totals Row */}
          {!loading && items.length > 0 && (
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-xs uppercase tracking-wider border-t-2 border-slate-700">
                <td colSpan="4" className="p-3">TOTAL (TALLY PURCHASE REGISTER)</td>
                <td className="p-3 text-center text-purple-300">{totals.totalSuppliers}</td>
                <td className="p-3 text-right font-mono text-purple-300" colSpan="2">
                  {totals.totalQty.toLocaleString('en-IN')} Units
                </td>
                <td className="p-3 text-right">--</td>
                <td className="p-3 text-right font-mono">₹{totals.totalTaxable.toLocaleString('en-IN')}</td>
                <td className="p-3 text-center">--</td>
                <td className="p-3 text-right font-mono text-blue-300">₹{totals.totalGst.toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-mono text-amber-300 text-sm">
                  ₹{totals.grandTotal.toLocaleString('en-IN')}
                </td>
                <td className="p-3 no-print"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default PurchaseProductRegisterTab;
