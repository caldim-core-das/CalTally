import React, { useState } from 'react';
import { Users, Shield, Lock, FileText } from 'lucide-react';
import UsersTab from './iam/UsersTab';
import RolesTab from './iam/RolesTab';
import SecurityTab from './iam/SecurityTab';
import ActivityLogsTab from './iam/ActivityLogsTab';

const UsersAndAccessModule = () => {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="p-6 md:p-10 space-y-7 bg-slate-50 min-h-screen text-slate-800 font-sans">
      
      {/* ── Page Header Banner ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={26} /> Users &amp; Access Management
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
            Enterprise User Administration, Role Permissions, Session Security &amp; Audit Trail
          </p>
        </div>
      </div>

      {/* ── 4 Top Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}>
          <Users size={14} /> 👥 Users
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'roles'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}>
          <Shield size={14} /> 🛡 Roles
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}>
          <Lock size={14} /> 🔒 Security
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'activity'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}>
          <FileText size={14} /> 📜 Activity Logs
        </button>
      </div>

      {/* ── Active Tab Component Rendering ─────────────────────────────────── */}
      <div className="pt-2">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'activity' && <ActivityLogsTab />}
      </div>

    </div>
  );
};

export default UsersAndAccessModule;
