import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { Calendar, Trash2, Play, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SavedReportsView({ companyId }) {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Schedule form state
  const [cronExp, setCronExp] = useState('0 8 * * 1'); // Default weekly
  const [recipients, setRecipients] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.getSavedReports(companyId);
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this saved report?')) return;
    try {
      await reportsAPI.deleteSavedReport(companyId, id);
      fetchReports();
    } catch (err) {
      alert('Failed to delete report');
    }
  };

  const handleOpenSchedule = (report) => {
    setSelectedReport(report);
    setCronExp(report.cronExpression || '0 8 * * 1');
    setRecipients((report.emailRecipients || []).join(', '));
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async () => {
    try {
      const emailArray = recipients.split(',').map(e => e.trim()).filter(e => e);
      await reportsAPI.updateSavedReport(companyId, selectedReport.id, {
        isScheduled: true,
        cronExpression: cronExp,
        emailRecipients: emailArray,
        isActive: true
      });
      setShowScheduleModal(false);
      fetchReports();
    } catch (err) {
      alert('Failed to save schedule');
    }
  };

  const handleStopSchedule = async () => {
    try {
      await reportsAPI.updateSavedReport(companyId, selectedReport.id, {
        isScheduled: false,
        isActive: false
      });
      setShowScheduleModal(false);
      fetchReports();
    } catch (err) {
      alert('Failed to stop schedule');
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'SUCCESS': return <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Success</span>;
      case 'FAILED': return <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Failed</span>;
      case 'RUNNING': return <span className="inline-flex items-center gap-1 text-blue-600 text-xs font-medium bg-blue-50 px-2 py-1 rounded-full"><Loader2 className="w-3 h-3 animate-spin" /> Running</span>;
      default: return <span className="text-slate-400 text-xs">Never Run</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your report templates and automated schedules.</p>
        </div>
        <button
          onClick={() => navigate('/reports/custom')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + New Custom Report
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-slate-900">No saved reports yet</h3>
            <p className="text-slate-500 mt-1 mb-4 text-sm">Create a custom report and save it to see it here.</p>
            <button
              onClick={() => navigate('/reports/custom')}
              className="text-emerald-600 font-medium hover:underline text-sm"
            >
              Build your first report &rarr;
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Report Name</th>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4">Last Run / Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{report.name}</td>
                  <td className="px-6 py-4 capitalize">{report.module}</td>
                  <td className="px-6 py-4">
                    {report.isScheduled ? (
                      <div className="flex flex-col">
                        <span className="text-emerald-600 font-medium">{report.cronExpression}</span>
                        <span className="text-xs text-slate-400 truncate max-w-[150px]" title={report.emailRecipients?.join(', ')}>
                          To: {report.emailRecipients?.join(', ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded">Not Scheduled</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      {getStatusIcon(report.executionStatus)}
                      {report.lastRunAt && (
                        <span className="text-xs text-slate-400">
                          {new Date(report.lastRunAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        title="Edit / Run Now in Builder"
                        onClick={() => navigate('/reports/custom', { state: { report } })}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        title="Automate Schedule"
                        onClick={() => handleOpenSchedule(report)}
                        className={`p-2 rounded-lg transition-colors ${report.isScheduled ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete Report"
                        onClick={() => handleDelete(report.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showScheduleModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Schedule: {selectedReport.name}
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-500">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cron Schedule</label>
                <input
                  type="text"
                  value={cronExp}
                  onChange={(e) => setCronExp(e.target.value)}
                  placeholder="0 8 * * 1 (Every Monday at 8AM)"
                  className="w-full rounded-lg border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">Uses standard cron format. e.g., <code>0 8 * * 1</code> = Mon 8:00 AM</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Recipients (Comma separated)</label>
                <textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="ceo@company.com, accounting@company.com"
                  rows={3}
                  className="w-full rounded-lg border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {selectedReport.isScheduled ? (
                <button onClick={handleStopSchedule} className="text-sm font-medium text-red-600 hover:text-red-700">Stop Schedule</button>
              ) : (
                <div></div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button onClick={handleSaveSchedule} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">Save Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
