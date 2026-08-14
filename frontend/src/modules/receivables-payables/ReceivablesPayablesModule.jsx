import React, { useState, useEffect } from 'react';
import { RefreshCw, Calculator, FileText, Users, DollarSign, Wallet, Bell, Search, Layers } from 'lucide-react';
import api from '../../services/api';

import ExecutiveKpiHeader from './components/ExecutiveKpiHeader';
import ReceivablesAgingTab from './tabs/ReceivablesAgingTab';
import PayablesAgingTab from './tabs/PayablesAgingTab';
import PartyStatementTab from './tabs/PartyStatementTab';
import SettlementRegisterTab from './tabs/SettlementRegisterTab';
import CollectionsFollowupTab from './tabs/CollectionsFollowupTab';

import PaymentAllocationModal from './modals/PaymentAllocationModal';
import SettlementHistoryDrawer from './drawers/SettlementHistoryDrawer';

const ReceivablesPayablesModule = () => {
  const [activeTab, setActiveTab] = useState('receivables');
  const [loading, setLoading] = useState(false);
  const [kpiData, setKpiData] = useState({});
  const [receivablesItems, setReceivablesItems] = useState([]);
  const [settlementRegisterItems, setSettlementRegisterItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal & Drawer State
  const [isAllocationOpen, setIsAllocationOpen] = useState(false);
  const [selectedInvoiceIdForHistory, setSelectedInvoiceIdForHistory] = useState(null);

  useEffect(() => {
    fetchModuleData();
  }, [activeTab]);

  const fetchModuleData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Executive Dashboard KPIs
      const kpiRes = await api.get('/v1/settlements/dashboard-kpis');
      setKpiData(kpiRes.data?.kpis || {});

      // 2. Fetch Tab Specific Data
      if (activeTab === 'receivables') {
        const res = await api.get('/v1/settlements/aging/receivables');
        setReceivablesItems(res.data?.items || []);
      } else if (activeTab === 'register') {
        const res = await api.get('/v1/settlements/register');
        setSettlementRegisterItems(res.data?.items || []);
      }
    } catch (err) {
      console.error('Error loading Receivables & Payables module data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 min-h-screen bg-slate-50/50 dark:bg-slate-950">
      
      {/* ── TOP PAGE HEADER ────────────────────────────────────────── */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Receivables & Payables Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Enterprise Settlement Engine, Aging Analysis, Party Statements & Payment Allocation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAllocationOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <Calculator className="w-4 h-4" />
            Allocate Payment (Receipt)
          </button>

          <button
            onClick={fetchModuleData}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── EXECUTIVE DASHBOARD KPI CARDS ───────────────────────────── */}
      <ExecutiveKpiHeader kpis={kpiData} />

      {/* ── MODULE CONTAINER & 5 TABS NAVIGATION ────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
        
        {/* 5 Tabs Bar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('receivables')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'receivables'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              1️⃣ Customer Receivables Aging
            </button>

            <button
              onClick={() => setActiveTab('payables')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'payables'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Wallet className="w-4 h-4" />
              2️⃣ Supplier Payables Aging
            </button>

            <button
              onClick={() => setActiveTab('statement')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'statement'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              3️⃣ Party Ledger Statement
            </button>

            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'register'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              4️⃣ Settlement Journal Register
            </button>

            <button
              onClick={() => setActiveTab('collections')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'collections'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              5️⃣ Collections & Follow-up
            </button>
          </div>
        </div>

        {/* Tab Content Rendering */}
        {activeTab === 'receivables' && (
          <ReceivablesAgingTab
            items={receivablesItems}
            loading={loading}
            onOpenAllocation={() => setIsAllocationOpen(true)}
            onOpenHistory={id => setSelectedInvoiceIdForHistory(id)}
          />
        )}

        {activeTab === 'payables' && (
          <PayablesAgingTab items={[]} loading={loading} />
        )}

        {activeTab === 'statement' && (
          <PartyStatementTab />
        )}

        {activeTab === 'register' && (
          <SettlementRegisterTab items={settlementRegisterItems} loading={loading} />
        )}

        {activeTab === 'collections' && (
          <CollectionsFollowupTab />
        )}
      </div>

      {/* Payment Allocation Modal */}
      <PaymentAllocationModal
        isOpen={isAllocationOpen}
        onClose={() => setIsAllocationOpen(false)}
        onSuccess={fetchModuleData}
      />

      {/* Waterfall Settlement History Drawer */}
      <SettlementHistoryDrawer
        invoiceId={selectedInvoiceIdForHistory}
        onClose={() => setSelectedInvoiceIdForHistory(null)}
      />

    </div>
  );
};

export default ReceivablesPayablesModule;
