import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck, Award } from 'lucide-react';
import api from '../../../services/api';

const ProductPerformanceTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/v1/reports/product-registers/performance')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const abc = data?.abcSummary || { classACount: 0, classBCount: 0, classCCount: 0 };
  const topSelling = data?.topSelling || [];
  const slowMoving = data?.slowMoving || [];

  return (
    <div className="space-y-6">
      {/* ABC Inventory Classification Cards */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              ABC Inventory Classification (Revenue Pareto)
            </h3>
            <p className="text-xs text-slate-500">
              Categorizes inventory based on stock valuation & revenue impact (Pareto 80/15/5 Principle).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50">
            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 dark:text-emerald-300">
              Class A (Top 80% Revenue)
            </span>
            <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1">
              {abc.classACount} Products
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">High priority inventory items</span>
          </div>

          <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200/60 dark:border-blue-900/50">
            <span className="text-[10px] uppercase font-black tracking-wider text-blue-700 dark:text-blue-300">
              Class B (Next 15% Revenue)
            </span>
            <div className="text-2xl font-black text-blue-800 dark:text-blue-200 mt-1">
              {abc.classBCount} Products
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">Moderate impact inventory</span>
          </div>

          <div className="bg-slate-100/60 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-600 dark:text-slate-400">
              Class C (Tail 5% Revenue)
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {abc.classCCount} Products
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Low value / slow moving stock</span>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Top Performing Products by Valuation
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-bold text-slate-400">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-center">Class</th>
                  <th className="pb-2 text-right">Stock</th>
                  <th className="pb-2 text-right">Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topSelling.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-100">{item.name}</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        item.abcCategory === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        item.abcCategory === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        Class {item.abcCategory}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono">{item.stock}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-600">
                      ₹{item.valuation.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slow-Moving Stock */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Slow-Moving Stock Alerts
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-bold text-slate-400">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Current Stock</th>
                  <th className="pb-2 text-right">Selling Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {slowMoving.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-100">{item.name}</td>
                    <td className="py-2.5 text-right font-mono text-amber-600 font-bold">{item.stock}</td>
                    <td className="py-2.5 text-right font-mono">₹{item.price.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPerformanceTab;
