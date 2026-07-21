import React, { useState, useEffect } from 'react';
import { Package, ArrowDownLeft, ArrowUpRight, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../../../services/api';

const ProductLedgerTab = ({ allProducts = [], selectedItemId, onSelectItem, onOpenInvoiceModal }) => {
  const [productList, setProductList] = useState(allProducts);
  const [activeItemId, setActiveItemId] = useState(selectedItemId || '');
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch product list if not passed from parent
  useEffect(() => {
    if (allProducts && allProducts.length > 0) {
      setProductList(allProducts);
      if (!activeItemId) setActiveItemId(selectedItemId || allProducts[0].itemId);
    } else {
      api.get('/v1/reports/product-registers/sales?period=ALL_TIME')
        .then(res => {
          const items = res.data.items || [];
          setProductList(items);
          if (items.length > 0 && !activeItemId) {
            setActiveItemId(selectedItemId || items[0].itemId);
          }
        })
        .catch(err => console.error(err));
    }
  }, [allProducts, selectedItemId]);

  useEffect(() => {
    if (!activeItemId) return;
    setLoading(true);
    api.get(`/v1/reports/product-registers/ledger?itemId=${activeItemId}&period=ALL_TIME`)
      .then(res => setLedgerData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [activeItemId]);

  const handleProductChange = (e) => {
    const id = e.target.value;
    setActiveItemId(id);
    if (onSelectItem) onSelectItem(id);
  };

  const itemInfo = ledgerData?.item || {};
  const entries = ledgerData?.ledger || [];

  return (
    <div className="space-y-6">
      {/* Product Selection Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Product Stock Ledger & Valuation
            </h3>
            <p className="text-xs text-slate-500">
              Chronological stock movement timeline, running balance, and inventory valuation.
            </p>
          </div>
        </div>

        {/* Selector */}
        <div className="w-full md:w-72">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Select Product
          </label>
          <select
            value={activeItemId}
            onChange={handleProductChange}
            className="w-full h-10 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-500"
          >
            {productList.map(p => (
              <option key={p.itemId} value={p.itemId}>
                {p.itemName} ({p.sku})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Opening Stock</span>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {ledgerData?.openingStock || 0} {itemInfo.unit || 'Nos'}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Closing Stock Balance</span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {ledgerData?.closingStock || 0} {itemInfo.unit || 'Nos'}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Latest Valuation</span>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            ₹{((entries[entries.length - 1]?.valuationAmount) || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3">Date</th>
              <th className="p-3">Voucher Type</th>
              <th className="p-3">Voucher Number</th>
              <th className="p-3">Party Name</th>
              <th className="p-3 text-right text-emerald-600">Inward (+)</th>
              <th className="p-3 text-right text-rose-600">Outward (-)</th>
              <th className="p-3 text-right font-black">Balance Stock</th>
              <th className="p-3 text-right font-black text-blue-600">Valuation Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {loading ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Fetching product movement ledger...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                  No stock transactions logged for this product.
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all">
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{row.date}</td>
                  <td className="p-3 font-bold uppercase text-[10px]">
                    <span className={`px-2 py-0.5 rounded-full ${
                      row.voucherType === 'SALE' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {row.voucherType}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold">
                    <button
                      onClick={() => onOpenInvoiceModal && onOpenInvoiceModal(row.voucherNumber)}
                      className="text-blue-600 hover:underline hover:text-blue-800 text-left font-bold"
                    >
                      {row.voucherNumber}
                    </button>
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-200 font-medium">{row.partyName}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600">
                    {row.inwardQty > 0 ? `+${row.inwardQty}` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">
                    {row.outwardQty > 0 ? `-${row.outwardQty}` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                    {row.balanceQty} {itemInfo.unit || 'Nos'}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                    ₹{row.valuationAmount.toLocaleString('en-IN')}
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

export default ProductLedgerTab;
