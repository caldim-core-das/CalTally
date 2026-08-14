import React, { useState, useEffect } from 'react';
import { Lock, LogOut, Key, ShieldAlert, Monitor, Smartphone, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import useNotificationStore from '../../../store/notificationStore';

const SecurityTab = () => {
  const { addNotification } = useNotificationStore();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForLogout, setSelectedUserForLogout] = useState(null); // Force Logout confirmation modal

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/user-access/security/sessions');
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error(err);
      addNotification('Failed to fetch security sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const onlineCount = sessions.filter(s => s.status === 'ONLINE').length;
  const failedCount = sessions.filter(s => s.status === 'FAILED_LOGIN').length;
  const forcedCount = sessions.filter(s => s.status === 'FORCE_LOGGED_OUT').length;

  const handleConfirmForceLogout = async () => {
    if (!selectedUserForLogout) return;
    try {
      await api.post('/v1/user-access/security/force-logout', { userId: selectedUserForLogout.userId });
      addNotification(`User ${selectedUserForLogout.userName} force logged out successfully!`, 'success');
      setSelectedUserForLogout(null);
      fetchSecurityData();
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to force logout', 'error');
    }
  };

  const handleSendResetLink = async (userId, userEmail) => {
    try {
      await api.post('/v1/user-access/security/reset-link', { userId });
      addNotification(`Password reset email link sent to ${userEmail}!`, 'success');
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to send reset link', 'error');
    }
  };

  return (
    <div className="space-y-6">

      {/* Security Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Today's Logins</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{sessions.length}</div>
          <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Authentication Events</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Currently Online</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {onlineCount}
          </div>
          <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Active Sessions</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Failed Logins</span>
          <div className={`text-2xl font-black mt-1 ${failedCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {failedCount}
          </div>
          <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Incorrect Password Attempts</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Reset Requests</span>
          <div className="text-2xl font-black text-purple-600 mt-1">0</div>
          <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Password Reset Link Triggers</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Force Logged Out</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{forcedCount}</div>
          <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Terminated Sessions</span>
        </div>
      </div>

      {/* Header & Refresh */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
        <div>
          <h3 className="text-sm font-black text-slate-800">User Access &amp; Session Security</h3>
          <p className="text-xs text-slate-400 mt-0.5">Live session monitoring with Device breakdown (Windows, Mac, Android, iPhone) &amp; Force Logout controls.</p>
        </div>
        <button onClick={fetchSecurityData} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-600 border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-400">
              <th className="p-4">User</th>
              <th className="p-4">Device</th>
              <th className="p-4">IP Address</th>
              <th className="p-4">Browser</th>
              <th className="p-4">Login Time</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">No active sessions recorded</td>
              </tr>
            ) : (
              sessions.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{s.userName}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{s.userEmail}</div>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800">
                      {s.device?.includes('iPhone') || s.device?.includes('Android') ? <Smartphone size={13} className="text-purple-600" /> : <Monitor size={13} className="text-blue-600" />}
                      {s.device || 'Windows'}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-slate-500">{s.ipAddress || '127.0.0.1'}</td>
                  <td className="p-4 text-slate-700">{s.browser || 'Chrome'}</td>
                  <td className="p-4 text-slate-500 text-[11px]">
                    {new Date(s.loginTime).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                      s.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      s.status === 'FAILED_LOGIN' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleSendResetLink(s.userId, s.userEmail)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors">
                      Reset Link
                    </button>
                    {s.status === 'ONLINE' && (
                      <button onClick={() => setSelectedUserForLogout(s)} className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg transition-colors">
                        Force Logout
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Force Logout Confirmation Modal */}
      {selectedUserForLogout && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center mx-auto">
              <LogOut size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Force Logout User?</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Are you sure you want to force logout <strong className="text-slate-800">{selectedUserForLogout.userName}</strong>? Their active session will be terminated immediately.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button onClick={() => setSelectedUserForLogout(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl">Cancel</button>
              <button onClick={handleConfirmForceLogout} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-200">
                Yes, Force Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SecurityTab;
