import React, { useState, useEffect } from 'react';
import { Shield, Plus, Check, X, Lock, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import useNotificationStore from '../../../store/notificationStore';

const MODULES_LIST = [
  'Dashboard', 'Sales', 'Purchase', 'Inventory', 'Banking',
  'Accounting', 'GST', 'TDS', 'TCS', 'Financial Closing',
  'Reports', 'Settings', 'Users', 'Subscription', 'Imports / Exports'
];

const RolesTab = () => {
  const { addNotification } = useNotificationStore();
  const [defaultRoles, setDefaultRoles] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoleModal, setActiveRoleModal] = useState(null); // Selected role for permission matrix
  const [roleForm, setRoleForm] = useState({ name: '', description: '', baseRole: 'ACCOUNTANT', permissions: {} });
  const [saving, setSaving] = useState(false);

  const fetchRolesData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/user-access/roles');
      setDefaultRoles(res.data.defaultRoles || []);
      setCustomRoles(res.data.customRoles || []);
    } catch (err) {
      console.error(err);
      addNotification('Failed to fetch roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  const openNewCustomRole = () => {
    const defaultPerms = {};
    MODULES_LIST.forEach(m => defaultPerms[m] = { view: true, create: true, edit: true, delete: false });
    setRoleForm({ name: '', description: '', baseRole: 'ACCOUNTANT', permissions: defaultPerms });
    setActiveRoleModal({ isNew: true });
  };

  const openEditRole = (role) => {
    setRoleForm({
      name: role.name,
      description: role.description || '',
      baseRole: role.baseRole || 'ACCOUNTANT',
      permissions: role.permissions || {}
    });
    setActiveRoleModal(role);
  };

  const togglePermission = (module, action) => {
    setRoleForm(prev => {
      const current = prev.permissions[module] || { view: true, create: false, edit: false, delete: false };
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: { ...current, [action]: !current[action] }
        }
      };
    });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      addNotification('Role name is required', 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.post('/v1/user-access/roles', roleForm);
      addNotification(`Role "${roleForm.name}" created successfully!`, 'success');
      setActiveRoleModal(null);
      fetchRolesData();
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to save role', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
        <div>
          <h3 className="text-sm font-black text-slate-800">Workspace Roles &amp; Permissions</h3>
          <p className="text-xs text-slate-400 mt-0.5">Role Cards First layout. Select any role to view or customize its 15-module permission matrix.</p>
        </div>
        <button onClick={openNewCustomRole} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-200">
          <Plus size={14} /> Create Custom Role
        </button>
      </div>

      {/* Default System Role Cards */}
      <div>
        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">System Standard Roles</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {defaultRoles.map(r => (
            <div key={r.id} onClick={() => openEditRole(r)}
              className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600 font-bold">
                    <Shield size={16} />
                  </span>
                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-slate-100 text-slate-600">Standard</span>
                </div>
                <h4 className="text-sm font-black text-slate-900 mt-3 group-hover:text-blue-600 transition-colors">{r.name}</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1 leading-relaxed">{r.description}</p>
              </div>
              <span className="text-[10px] font-bold text-blue-600 mt-4 block group-hover:underline">
                View Permission Matrix →
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Created Role Cards */}
      {customRoles.length > 0 && (
        <div>
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Custom Enterprise Roles</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {customRoles.map(r => (
              <div key={r.id} onClick={() => openEditRole(r)}
                className="bg-white p-5 rounded-2xl border border-purple-200/85 bg-purple-50/20 shadow-sm hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-purple-100 text-purple-700 font-bold">
                      <Shield size={16} />
                    </span>
                    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800">Custom</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mt-3 group-hover:text-purple-700 transition-colors">{r.name}</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-1 leading-relaxed">{r.description || 'Custom company access matrix'}</p>
                </div>
                <span className="text-[10px] font-bold text-purple-700 mt-4 block group-hover:underline">
                  Edit Permission Matrix →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 15-Module Permission Matrix Modal */}
      {activeRoleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {activeRoleModal.isNew ? 'Create New Custom Role' : `Permission Matrix — ${roleForm.name}`}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Configure 15-module granular access permissions.</p>
              </div>
              <button onClick={() => setActiveRoleModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                <div>
                  <label className="block mb-1 text-[10px] uppercase text-slate-400">Role Name</label>
                  <input type="text" value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. Senior Accountant" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" required />
                </div>
                <div>
                  <label className="block mb-1 text-[10px] uppercase text-slate-400">Description</label>
                  <input type="text" value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                    placeholder="e.g. Full accounting & tax clearance" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
              </div>

              {/* 15-Module Matrix Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-400">
                      <th className="p-3">Module</th>
                      <th className="p-3 text-center">View</th>
                      <th className="p-3 text-center">Create</th>
                      <th className="p-3 text-center">Edit</th>
                      <th className="p-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {MODULES_LIST.map(mod => {
                      const perm = roleForm.permissions[mod] || { view: true, create: true, edit: true, delete: false };
                      return (
                        <tr key={mod} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-800">{mod}</td>
                          {['view', 'create', 'edit', 'delete'].map(action => (
                            <td key={action} className="p-3 text-center">
                              <input type="checkbox" checked={!!perm[action]} onChange={() => togglePermission(mod, action)}
                                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer" />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setActiveRoleModal(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">Close</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md shadow-blue-200">
                  {saving ? 'Saving...' : 'Save Role Matrix'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default RolesTab;
