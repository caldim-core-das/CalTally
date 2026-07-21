import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingBag, ShoppingCart, BookOpen, BarChart3, Search, Filter, 
  RefreshCcw, FileSpreadsheet, FileText, FileCode, SlidersHorizontal 
} from 'lucide-react';
import api from '../../../services/api';
import SalesProductRegisterTab from './SalesProductRegisterTab';
import PurchaseProductRegisterTab from './PurchaseProductRegisterTab';
import ProductLedgerTab from './ProductLedgerTab';
import ProductPerformanceTab from './ProductPerformanceTab';
import DrilldownDrawer from './DrilldownDrawer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import ReportExporter from '../../../utils/ReportExporter';

const ProductRegistersModule = ({ defaultTab = 'sales' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [periodPreset, setPeriodPreset] = useState('ALL_TIME');
  const [selectedMonth, setSelectedMonth] = useState(''); // '' = use preset, 1-12 = explicit month
  const [selectedYear, setSelectedYear] = useState('2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [minRevenue, setMinRevenue] = useState('');
  const [minGst, setMinGst] = useState('');

  const [salesData, setSalesData] = useState(null);
  const [purchaseData, setPurchaseData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Drilldown drawer state
  const [drilldownProduct, setDrilldownProduct] = useState(null);
  const [drilldownType, setDrilldownType] = useState('sales');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period: periodPreset,
        search: searchQuery
      });
      if (selectedMonth) {
        params.append('month', selectedMonth);
        params.append('year', selectedYear);
      }
      if (minRevenue) params.append('minRevenue', minRevenue);
      if (minGst) params.append('minGst', minGst);

      if (activeTab === 'sales') {
        const res = await api.get(`/v1/reports/product-registers/sales?${params.toString()}`);
        setSalesData(res.data);
      } else if (activeTab === 'purchase') {
        const res = await api.get(`/v1/reports/product-registers/purchase?${params.toString()}`);
        setPurchaseData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch register data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sales' || activeTab === 'purchase') {
      fetchData();
    }
  }, [activeTab, periodPreset, selectedMonth, selectedYear, searchQuery, minRevenue, minGst]);

  const handleOpenDrilldown = (product, type) => {
    setDrilldownProduct(product);
    setDrilldownType(type);
  };

  // Export handlers
  const handleExportCSV = (type) => {
    const items = type === 'sales' ? salesData?.items : purchaseData?.items;
    if (!items || items.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Item Name,SKU,HSN Code,Unit,Warehouse,Opening Stock,Net Qty,Avg Price,Taxable Value,GST Rate,GST Amount,Total Value\n";

    items.forEach(r => {
      csvContent += `"${r.itemName}","${r.sku}","${r.hsnCode}","${r.unit}","${r.warehouseName}",${r.openingStock},${r.netQtySold || r.netQtyPurchased},${r.avgSellingPrice || r.avgPurchasePrice},${r.taxableValue},${r.gstRate}%,${r.gstAmount},${r.totalSalesValue || r.totalPurchaseValue}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_product_register.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = (type) => {
    const items = type === 'sales' ? salesData?.items : purchaseData?.items;
    if (!items || items.length === 0) return;

    const title = type === 'sales' ? 'Sales Product Register' : 'Purchase Product Register';
    const headers = [
      { label: 'Product Name', field: 'itemName' },
      { label: 'SKU', field: 'sku' },
      { label: 'HSN Code', field: 'hsnCode' },
      { label: 'Unit', field: 'unit' },
      { label: 'Warehouse', field: 'warehouseName' },
      { label: 'Opening Stock', field: 'openingStock' },
      { label: 'Net Qty', field: 'netQty' },
      { label: 'Avg Price (Rs)', field: 'avgPrice' },
      { label: 'Taxable (Rs)', field: 'taxableValue' },
      { label: 'GST Rate %', field: 'gstRate' },
      { label: 'GST (Rs)', field: 'gstAmount' },
      { label: 'Total Value (Rs)', field: 'totalValue' }
    ];

    const data = items.map(r => ({
      itemName: r.itemName,
      sku: r.sku,
      hsnCode: r.hsnCode,
      unit: r.unit,
      warehouseName: r.warehouseName,
      openingStock: r.openingStock,
      netQty: r.netQtySold || r.netQtyPurchased,
      avgPrice: r.avgSellingPrice || r.avgPurchasePrice,
      taxableValue: r.taxableValue,
      gstRate: `${r.gstRate}%`,
      gstAmount: r.gstAmount,
      totalValue: r.totalSalesValue || r.totalPurchaseValue
    }));

    ReportExporter.exportToExcel({
      filename: `${type}_product_register`,
      sheets: [{ name: title, headers, data }]
    });
  };

  const handleExportPDF = (type) => {
    const items = type === 'sales' ? salesData?.items : purchaseData?.items;
    if (!items || items.length === 0) return;

    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`${type === 'sales' ? 'Sales Product Register' : 'Purchase Product Register'} - Tally Replica`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${selectedMonth ? `Month ${selectedMonth}/${selectedYear}` : periodPreset} | Total Items: ${items.length}`, 14, 22);

    const head = [['Item Name', 'SKU', 'HSN', 'Unit', 'Opening', 'Net Qty', 'Closing', 'Avg Price (Rs)', 'Taxable (Rs)', 'GST (Rs)', 'Total (Rs)']];
    const body = items.map(r => [
      r.itemName || 'N/A',
      r.sku || 'N/A',
      r.hsnCode || 'N/A',
      r.unit || 'Nos',
      String(r.openingStock || 0),
      String(r.netQtySold || r.netQtyPurchased || 0),
      String(r.closingStock || 0),
      `Rs. ${(r.avgSellingPrice || r.avgPurchasePrice || 0).toLocaleString('en-IN')}`,
      `Rs. ${(r.taxableValue || 0).toLocaleString('en-IN')}`,
      `Rs. ${(r.gstAmount || 0).toLocaleString('en-IN')}`,
      `Rs. ${(r.totalSalesValue || r.totalPurchaseValue || 0).toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: 28,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });

    doc.save(`${type}_product_register.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Clean Printable Header (Shown ONLY when printing) */}
      <div className="print-only mb-4 border-b-2 border-slate-900 pb-3">
        <h1 className="text-xl font-black uppercase text-slate-900">
          {sessionStorage.getItem('companyName') || 'Sri Venkat Electricals Pvt Ltd'}
        </h1>
        <h2 className="text-sm font-bold text-slate-700 mt-0.5">
          {activeTab === 'sales' ? 'Sales Product Register' : activeTab === 'purchase' ? 'Purchase Product Register' : activeTab === 'ledger' ? 'Product Stock Movement Ledger' : 'Product Performance Analytics'}
        </h2>
        <div className="text-xs text-slate-600 mt-1 flex justify-between font-mono">
          <span>Period: {selectedMonth ? `Month ${selectedMonth}/${selectedYear}` : periodPreset}</span>
          <span>Printed On: {new Date().toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Module Title & Tab Navigation */}
      <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-black text-[11px] uppercase tracking-widest">
              <Package className="w-4 h-4" />
              Inventory Reports Engine
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Product Registers
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized Sales & Purchase product registers, stock ledger movement, and ABC inventory analytics.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* 4 Tabs Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-1">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            🛍 Sales Product Register
          </button>

          <button
            onClick={() => setActiveTab('purchase')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'purchase'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            📦 Purchase Product Register
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'ledger'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            📜 Product Ledger (Stock Timeline)
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'performance'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            📊 Product Performance (ABC Analysis)
          </button>
        </div>

        {/* Filter Toolbar (Visible on Sales & Purchase tabs) */}
        {(activeTab === 'sales' || activeTab === 'purchase') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {/* Omni-Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Name, SKU, HSN, Barcode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {/* Period Preset */}
            <div>
              <select
                value={selectedMonth ? 'CUSTOM_MONTH' : periodPreset}
                onChange={e => {
                  const val = e.target.value;
                  if (val !== 'CUSTOM_MONTH') {
                    setPeriodPreset(val);
                    setSelectedMonth(''); // Reset specific month if preset is selected
                  }
                }}
                className="w-full h-10 px-3 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="ALL_TIME">All Time (All Transactions)</option>
                {selectedMonth && <option value="CUSTOM_MONTH">Specific Month Selected</option>}
                <option value="THIS_MONTH">This Month</option>
                <option value="PREVIOUS_MONTH">Previous Month</option>
                <option value="THIS_QUARTER">This Quarter</option>
                <option value="HALF_YEAR">Half Year</option>
                <option value="FINANCIAL_YEAR">Financial Year (FY)</option>
              </select>
            </div>

            {/* Specific Month & Year Selectors */}
            <div className="flex gap-1.5">
              <select
                value={selectedMonth}
                onChange={e => {
                  const m = e.target.value;
                  setSelectedMonth(m);
                }}
                className="w-1/2 h-10 px-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="">Month (All)</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="w-1/2 h-10 px-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tab Render Viewports */}
      {activeTab === 'sales' && (
        <SalesProductRegisterTab
          data={salesData}
          loading={loading}
          searchQuery={searchQuery}
          onOpenDrilldown={handleOpenDrilldown}
          onExportExcel={() => handleExportExcel('sales')}
          onExportCSV={() => handleExportCSV('sales')}
          onExportPDF={() => handleExportPDF('sales')}
        />
      )}

      {activeTab === 'purchase' && (
        <PurchaseProductRegisterTab
          data={purchaseData}
          loading={loading}
          searchQuery={searchQuery}
          onOpenDrilldown={handleOpenDrilldown}
          onExportExcel={() => handleExportExcel('purchase')}
          onExportCSV={() => handleExportCSV('purchase')}
          onExportPDF={() => handleExportPDF('purchase')}
        />
      )}

      {activeTab === 'ledger' && (
        <ProductLedgerTab
          allProducts={salesData?.items || purchaseData?.items || []}
          selectedItemId={drilldownProduct?.itemId}
        />
      )}

      {activeTab === 'performance' && (
        <ProductPerformanceTab />
      )}

      {/* Drilldown Slide-Over Drawer */}
      <DrilldownDrawer
        isOpen={!!drilldownProduct}
        onClose={() => setDrilldownProduct(null)}
        selectedProduct={drilldownProduct}
        type={drilldownType}
      />
    </div>
  );
};

export default ProductRegistersModule;
