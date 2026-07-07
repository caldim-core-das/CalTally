import React from 'react';
import { 
  Building2, LayoutDashboard, FileText, Users, ShoppingBag, 
  Receipt, PieChart, Wallet, ChevronDown, Bell, Landmark, 
  Target, RefreshCcw, TrendingUp, TrendingDown 
} from 'lucide-react';

export default function DashboardPreview() {
  return (
    <div className="relative w-full max-w-5xl mx-auto mt-12 mb-8 z-10 transition-transform duration-500 hover:-translate-y-2">
      {/* Dashboard container */}
      <div className="bg-[#F5F7FA] rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-200/50 flex flex-col h-[580px] md:h-[680px] w-full font-sans">
        
        {/* Browser Mockup Top Bar */}
        <div className="h-10 bg-slate-900 flex items-center px-4 gap-2 shrink-0">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="mx-auto bg-slate-800 rounded-md h-6 w-1/3 flex items-center justify-center px-3">
            <span className="text-[10px] text-slate-400 font-mono">app.calbooks.com/dashboard</span>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex flex-1 overflow-hidden bg-[#F5F7FA]">
          {/* Sidebar */}
          <div className="w-48 bg-white border-r border-slate-100 hidden md:flex flex-col">
            <div className="h-16 border-b border-slate-50 flex items-center px-6 gap-2.5">
              <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center shrink-0">
                <Building2 size={14} color="#fff" />
              </div>
              <span className="text-[13px] font-black text-slate-900 tracking-tight uppercase">CALBOOKS</span>
            </div>
            
            <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3">Home</span>
                <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-600 cursor-default">
                  <LayoutDashboard size={14} />
                  Dashboard
                </div>
              </div>
              
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 text-left block">Sales</span>
                <div className="mt-1.5 space-y-0.5">
                  {[
                    { icon: Users, label: 'Customers' },
                    { icon: FileText, label: 'Invoices' },
                    { icon: Wallet, label: 'Customer Payments' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-slate-500 cursor-default hover:bg-slate-50">
                      <item.icon size={14} className="text-slate-400" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 text-left block">Purchases</span>
                <div className="mt-1.5 space-y-0.5">
                  {[
                    { icon: Users, label: 'Vendors' },
                    { icon: Receipt, label: 'Bills' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-slate-500 cursor-default hover:bg-slate-50">
                      <item.icon size={14} className="text-slate-400" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Header */}
            <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Financial Overview</span>
              </div>
              <div className="flex items-center gap-4">
                <Bell size={14} className="text-slate-400" />
                <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[9px] font-bold">T</div>
              </div>
            </div>

            {/* Dashboard Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5">
              
              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
                {[
                  { label: 'Net Profit', value: '₹2.45L', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Total Revenue', value: '₹5.24L', icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Expenses', value: '₹2.79L', icon: TrendingDown, color: 'text-orange-605', bg: 'bg-orange-50' },
                  { label: 'Cash & Bank', value: '₹1.85L', icon: Landmark, color: 'text-blue-650', bg: 'bg-blue-50' },
                  { label: 'Budget Utilized', value: '82.5%', icon: Target, color: 'text-purple-650', bg: 'bg-purple-50' },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-lg border border-slate-100 p-3 flex items-center gap-2 shadow-sm">
                    <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                      <k.icon size={14} className={k.color} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</p>
                      <p className={`text-[14px] font-black leading-tight ${k.color}`}>{k.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Sales', desc: 'Confirmed Revenue', value: '₹5,24,000', color: 'text-blue-650' },
                  { label: 'Total Purchases', desc: 'Incurred Costs', value: '₹2,79,000', color: 'text-orange-650' },
                  { label: 'Total Receivables', desc: 'Unpaid Invoices', value: '₹3,42,250', color: 'text-blue-600' },
                  { label: 'Total Payables', desc: 'Unpaid Bills', value: '₹1,12,400', color: 'text-rose-600' },
                ].map((card, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-24">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</div>
                      <div className="text-[8px] text-slate-400">{card.desc}</div>
                    </div>
                    <div className={`text-lg font-black ${card.color}`}>{card.value}</div>
                  </div>
                ))}
              </div>

              {/* Chart Mockup */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-48 flex flex-col">
                <div className="text-[11px] font-bold text-slate-800 mb-2 flex justify-between">
                  <span>Cash Flow — Last 12 Months</span>
                  <span className="text-[9px] text-slate-400 font-medium">Based on voucher entries</span>
                </div>
                <div className="flex-1 flex items-end justify-between gap-1 px-2 pb-1 pt-4">
                  {[45, 60, 48, 85, 52, 95, 70, 110, 80, 105, 90, 115].map((h, i) => (
                    <div key={i} className="w-full h-full flex flex-col justify-end gap-0.5">
                      <div className="w-full bg-blue-500 rounded-t-xs" style={{ height: `${h}%` }}></div>
                      <div className="w-full bg-red-400 rounded-t-xs" style={{ height: `${h * 0.4}%` }}></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[8px] text-slate-400 font-semibold px-2 mt-1">
                  <span>Jul</span><span>Sep</span><span>Nov</span><span>Jan</span><span>Mar</span><span>Jun</span>
                </div>
              </div>

              {/* Stats Footer Mockup */}
              <div className="rounded-xl border px-5 py-3 grid grid-cols-4 gap-2.5 bg-white border-slate-100 shadow-sm">
                {[
                  { label: 'Total Vouchers', value: '6' },
                  { label: 'Chart of Accounts', value: '17' },
                  { label: 'Active Projects', value: '1' },
                  { label: 'Bank Accounts', value: '2' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-base font-black text-slate-900 flex items-center justify-center gap-0.5">
                      {s.value}
                      <ChevronDown size={11} className="text-slate-400" />
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
