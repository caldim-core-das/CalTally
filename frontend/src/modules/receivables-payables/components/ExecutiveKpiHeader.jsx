import React from 'react';
import { DollarSign, Clock, Users, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

const ExecutiveKpiHeader = ({ kpis = {} }) => {
  const {
    outstandingReceivables = 0,
    outstandingPayables = 0,
    overdueCustomers = 0,
    overdueSuppliers = 0,
    avgCollectionDays = 34,
    avgPaymentDays = 27
  } = kpis;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {/* 1. Outstanding Receivables */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] uppercase font-bold tracking-wider">Outstanding Receivables</span>
          <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">
          ₹{outstandingReceivables.toLocaleString('en-IN')}
        </div>
        <div className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5">
          <ArrowUpRight className="w-3 h-3" /> Due from Customers
        </div>
      </div>

      {/* 2. Outstanding Payables */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] uppercase font-bold tracking-wider">Outstanding Payables</span>
          <div className="p-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 rounded-lg">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">
          ₹{outstandingPayables.toLocaleString('en-IN')}
        </div>
        <div className="text-[10px] font-bold text-purple-600 flex items-center gap-0.5">
          <ArrowDownRight className="w-3 h-3" /> Owed to Suppliers
        </div>
      </div>

      {/* 3. Overdue Customers */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] uppercase font-bold tracking-wider">Overdue Customers</span>
          <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black text-amber-600">{overdueCustomers}</div>
        <div className="text-[10px] font-medium text-slate-400">Accounts Overdue</div>
      </div>

      {/* 4. Overdue Suppliers */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] uppercase font-bold tracking-wider">Overdue Suppliers</span>
          <div className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black text-rose-600">{overdueSuppliers}</div>
        <div className="text-[10px] font-medium text-slate-400">Bills Overdue</div>
      </div>

      {/* 5. Avg Collection Days */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] uppercase font-bold tracking-wider">Avg Collection Days</span>
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-emerald-600">{avgCollectionDays} Days</div>
        <div className="text-[10px] font-medium text-slate-400">DSO Velocity</div>
      </div>

      {/* 6. Avg Payment Days */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] uppercase font-bold tracking-wider">Avg Payment Days</span>
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg font-black font-mono text-indigo-600">{avgPaymentDays} Days</div>
        <div className="text-[10px] font-medium text-slate-400">DPO Velocity</div>
      </div>
    </div>
  );
};

export default ExecutiveKpiHeader;
