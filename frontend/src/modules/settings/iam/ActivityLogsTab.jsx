import React, { useState, useEffect } from 'react';
import { FileText, Filter, AlertCircle, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import useNotificationStore from '../../../store/notificationStore';

const SEVERITY_BADGES = {
  INFO: { label: 'INFO', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle },
  WARNING: { label: 'WARNING', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  CRITICAL: { label: 'CRITICAL', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle }
};

const ActivityLogsTab = () => {
  const { addNotification } = useNotificationStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/user-access/activity-logs', {
        params: { module: selectedModule, severity: selectedSeverity }
      });
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
      addNotification('Failed to fetch activity logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
  }, [selectedModule, selectedSeverity]);

  return (
    <div className="space-y-6">

      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
        <div>
          <h3 className="text-sm font-black text-slate-800">Business Activity Audit Trail</h3>
          <p className="text-xs text-slate-400 mt-0.5">Chronological stream of all business operations categorized by Severity level.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Module Filter */}
          <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
            <option value="ALL">All Modules</option>
            <option value="Users">Users</option>
            <option value="Roles">Roles</option>
            <option value="Security">Security</option>
            <option value="Sales">Sales</option>
            <option value="Purchase">Purchase</option>
            <option value="Financial Closing">Financial Closing</option>
          </select>

          {/* Severity Filter */}
          <select value={selectedSeverity} onChange={e => setSelectedSeverity(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
            <option value="ALL">All Severities</option>
            <option value="INFO">🔵 INFO</option>
            <option value="WARNING">🟡 WARNING</option>
            <option value="CRITICAL">🔴 CRITICAL</option>
          </select>

          <button onClick={fetchActivityLogs} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Logs Table / Stream */}
      <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-600 border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-400">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Severity</th>
              <th className="p-4">User</th>
              <th className="p-4">Module</th>
              <th className="p-4">Action</th>
              <th className="p-4">IP &amp; Device</th>
              <th className="p-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {logs.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">No activity audit logs found</td>
              </tr>
            ) : (
              logs.map(log => {
                const sev = SEVERITY_BADGES[log.severity] || SEVERITY_BADGES.INFO;
                const Icon = sev.icon;
                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-black ${sev.bg}`}>
                        <Icon size={11} /> {sev.label}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-900">{log.userName || 'System'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{log.action}</td>
                    <td className="p-4 text-[10px] text-slate-400">
                      {log.ipAddress} • {log.device || 'Windows'}
                    </td>
                    <td className="p-4 text-slate-600 font-medium max-w-xs truncate" title={log.details}>
                      {log.details || 'N/A'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default ActivityLogsTab;
