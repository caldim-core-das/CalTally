import React, { useState, useEffect } from 'react';
import { X, Shield, Key, LogOut, Lock, CheckCircle, Clock, Smartphone, Monitor, Save } from 'lucide-react';
import api from '../../../services/api';
import useNotificationStore from '../../../store/notificationStore';

const UserDetailsDrawer = ({ user, onClose }) => {
  const { addNotification } = useNotificationStore();
  const [loginHistory, setLoginHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [formData, setFormData] = useState({
    name: user.name || '',
    department: user.department || 'Accounts',
    role: user.role || 'ACCOUNTANT',
    status: user.status || 'ACTIVE'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [user.id]);

  const fetchUserDetails = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/v1/user-access/users/${user.id}`);
      setLoginHistory(res.data.loginHistory || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put(`/v1/user-access/users/${user.id}`, formData);
      addNotification('User profile updated successfully!', 'success');
      onClose();
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to update user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendResetLink = async () => {
    try {
      await api.post('/v1/user-access/security/reset-link', { userId: user.id });
      addNotification(`Password reset email link sent to ${user.email}`, 'success');
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to send reset link', 'error');
    }
  };

  const handleForceLogout = async () => {
    if (!window.confirm(`Force logout ${user.name || user.email}?`)) return;
    try {
      await api.post('/v1/user-access/security/force-logout', { userId: user.id });
      addNotification('User active sessions terminated', 'info');
      fetchUserDetails();
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to force logout', 'error');
    }
  };

  const handleUnlockAccount = async () => {
    try {
      await api.post('/v1/user-access/security/unlock', { userId: user.id });
      addNotification('Account unlocked successfully', 'success');
      setFormData(prev => ({ ...prev, status: 'ACTIVE' }));
      fetchUserDetails();
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to unlock account', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        
        <div className="space-y-6">

          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-black flex items-center justify-center text-sm uppercase">
                {user.name ? user.name.charAt(0) : user.email.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">{user.name || 'Unnamed User'}</h3>
                <p className="text-xs text-slate-400 font-semibold">{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"><X size={18} /></button>
          </div>

          {/* Basic Profile & Department */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Basic Information &amp; Role</h4>
            
            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1 text-[10px] uppercase text-slate-400">Full Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block mb-1 text-[10px] uppercase text-slate-400">Department</label>
                <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold">
                  <option value="Accounts">Accounts</option>
                  <option value="Sales">Sales</option>
                  <option value="Purchase">Purchase</option>
                  <option value="Management">Management</option>
                  <option value="Store">Store</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1 text-[10px] uppercase text-slate-400">Assigned Role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold">
                  <option value="ADMIN">Administrator</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="MANAGER">Manager</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-[10px] uppercase text-slate-400">Account Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="LOCKED">Locked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Security Actions */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Security &amp; Account Controls</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button onClick={handleSendResetLink} className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors">
                <Key size={13} /> Send Reset Link
              </button>
              <button onClick={handleForceLogout} className="flex items-center justify-center gap-1.5 p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition-colors">
                <LogOut size={13} /> Force Logout
              </button>
            </div>
            {formData.status === 'LOCKED' && (
              <button onClick={handleUnlockAccount} className="w-full p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5">
                <Lock size={13} /> Unlock Account
              </button>
            )}
          </div>

          {/* Last 10 Logins History */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock size={13} /> Last 10 Logins (Forensic History)
            </h4>

            {loadingHistory ? (
              <div className="text-center py-4 text-xs font-bold text-slate-400">Loading history...</div>
            ) : loginHistory.length === 0 ? (
              <div className="text-center py-4 text-xs font-bold text-slate-400">No login history recorded</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {loginHistory.map(h => (
                  <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        {h.device?.includes('iPhone') || h.device?.includes('Android') ? <Smartphone size={12} /> : <Monitor size={12} />}
                        {h.device || 'Windows'} • {h.browser || 'Chrome'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{h.ipAddress || '127.0.0.1'}</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${h.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {h.status}
                      </span>
                      <div className="text-[9px] text-slate-400 mt-1">
                        {new Date(h.loginTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">Cancel</button>
          <button onClick={handleSaveProfile} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-200">
            <Save size={13} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserDetailsDrawer;
