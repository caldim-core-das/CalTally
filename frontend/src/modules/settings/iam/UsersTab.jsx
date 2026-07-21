import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserPlus, Mail, Shield, CheckCircle, Clock, AlertTriangle, RefreshCw, Send, XCircle, Search, Filter, Download, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import api from '../../../services/api';
import useNotificationStore from '../../../store/notificationStore';
import UserDetailsDrawer from './UserDetailsDrawer';
import ReportExporter from '../../../utils/ReportExporter';

const STATUS_BADGES = {
  ACTIVE: { label: 'Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  INVITED: { label: 'Invited', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  INACTIVE: { label: 'Inactive', bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  LOCKED: { label: 'Locked', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  SUSPENDED: { label: 'Suspended', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' }
};

const PAGE_SIZE = 25;

const UsersTab = () => {
  const { addNotification } = useNotificationStore();
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, onlineUsers: 0, lockedUsers: 0, pendingInvitations: 0 });
  const [users, setUsers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'ACCOUNTANT', department: 'Accounts' });
  const [inviting, setInviting] = useState(false);

  // Search, Filters, Bulk Selection & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsersData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, pendingRes] = await Promise.allSettled([
        api.get('/v1/user-access/stats'),
        api.get('/v1/user-access/users'),
        api.get('/v1/user-access/invitations/pending')
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.users || []);
      if (pendingRes.status === 'fulfilled') setPendingInvites(pendingRes.value.data.invitations || []);
    } catch (err) {
      console.error(err);
      addNotification('Failed to fetch user access data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  // Filter & Search Logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchQuery.trim() || 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept = filterDept === 'ALL' || u.department === filterDept;
      const matchesRole = filterRole === 'ALL' || u.role === filterRole;
      const matchesStatus = filterStatus === 'ALL' || u.status === filterStatus;

      return matchesSearch && matchesDept && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, filterDept, filterRole, filterStatus]);

  // Paginated View
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  // Bulk Select Toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Bulk Actions
  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Deactivate ${selectedIds.length} selected user(s)?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.put(`/v1/user-access/users/${id}`, { status: 'INACTIVE' })));
      addNotification(`${selectedIds.length} users deactivated successfully`, 'success');
      setSelectedIds([]);
      fetchUsersData();
    } catch (err) {
      addNotification('Failed to execute bulk deactivate', 'error');
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const companyName = sessionStorage.getItem('companyName') || 'Company';
    const headers = [
      { label: 'Full Name', field: 'name' },
      { label: 'Email Address', field: 'email' },
      { label: 'Department', field: 'department' },
      { label: 'Assigned Role', field: 'role' },
      { label: 'Status', field: 'status' },
      { label: 'Last Login', field: 'lastLoginAt', format: (v) => v ? new Date(v).toLocaleString() : 'Never' }
    ];

    ReportExporter.exportToExcel({
      filename: `${companyName.replace(/\s+/g, '_')}_User_Directory`,
      sheets: [{ name: 'Workspace Users', headers, data: filteredUsers, columnWidths: [24, 30, 18, 18, 14, 24] }]
    });
  };

  // Export PDF (Vector)
  const handleExportPDF = () => {
    const companyName = sessionStorage.getItem('companyName') || 'Company';
    const summaryData = filteredUsers.map(u => ({
      category: u.department || 'Accounts',
      metric: u.name || 'Unnamed',
      value: u.role,
      note: `${u.email} (${u.status})`
    }));

    ReportExporter.exportVectorPDF({
      title: 'WORKSPACE USER DIRECTORY REPORT',
      companyName,
      period: `Total Users: ${filteredUsers.length}`,
      status: 'AUDIT VERIFIED',
      summaryData,
      exceptionData: [],
      checklistData: [],
      filename: `${companyName.replace(/\s+/g, '_')}_User_Directory`
    });
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      addNotification('Name and Email are required', 'warning');
      return;
    }
    setInviting(true);
    try {
      await api.post('/v1/user-access/users/invite', inviteForm);
      addNotification(`Invitation sent to ${inviteForm.email}!`, 'success');
      setIsInviteModalOpen(false);
      setInviteForm({ name: '', email: '', role: 'ACCOUNTANT', department: 'Accounts' });
      fetchUsersData();
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to send invite', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (id) => {
    try {
      await api.post(`/v1/user-access/invitations/${id}/resend`);
      addNotification('Invitation resent successfully!', 'success');
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to resend invite', 'error');
    }
  };

  const handleCancelInvite = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) return;
    try {
      await api.delete(`/v1/user-access/invitations/${id}`);
      addNotification('Invitation cancelled', 'info');
      fetchUsersData();
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to cancel invite', 'error');
    }
  };

  return (
    <div className="space-y-6">

      {/* Statistics Header Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Total Users</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalUsers}</div>
          <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Workspace Members</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Currently Online</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {stats.onlineUsers}
          </div>
          <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Active Sessions</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Locked Accounts</span>
          <div className={`text-2xl font-black mt-1 ${stats.lockedUsers > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {stats.lockedUsers}
          </div>
          <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Failed Logins / Locked</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Pending Invitations</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.pendingInvitations}</div>
          <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Awaiting Acceptance</span>
        </div>
      </div>

      {/* Search, Filter & Bulk Actions Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm space-y-4">
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Live Search Bar */}
          <div className="relative w-full lg:w-96">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search user name, email, or department..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500" />
          </div>

          {/* Filters & Export Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            
            {/* Department Filter */}
            <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
              <option value="ALL">All Departments</option>
              <option value="Accounts">Accounts</option>
              <option value="Sales">Sales</option>
              <option value="Purchase">Purchase</option>
              <option value="Management">Management</option>
              <option value="Store">Store</option>
            </select>

            {/* Role Filter */}
            <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="AUDITOR">Auditor</option>
              <option value="MANAGER">Manager</option>
              <option value="VIEWER">Viewer</option>
            </select>

            {/* Status Filter */}
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="INACTIVE">Inactive</option>
              <option value="LOCKED">Locked</option>
            </select>

            {/* Export Buttons */}
            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-700">
              <Download size={13} /> Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-700">
              <Download size={13} /> PDF
            </button>

            <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200">
              <UserPlus size={14} /> Invite User
            </button>

          </div>
        </div>

        {/* Bulk Action Toolbar (When users are selected) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900">
            <span>{selectedIds.length} User(s) Selected</span>
            <div className="flex items-center gap-2">
              <button onClick={handleBulkDeactivate} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-black">
                Deactivate Selected
              </button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 bg-white text-slate-600 rounded-lg text-[11px]">
                Deselect All
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-600 border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-400">
              <th className="p-4 w-10">
                <input type="checkbox" checked={selectedIds.length === paginatedUsers.length && paginatedUsers.length > 0} onChange={toggleSelectAll}
                  className="rounded text-blue-600 border-slate-300 focus:ring-blue-500" />
              </th>
              <th className="p-4">User</th>
              <th className="p-4">Department</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Login</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">No user members match search/filter</td>
              </tr>
            ) : (
              paginatedUsers.map(u => {
                const badge = STATUS_BADGES[u.status] || STATUS_BADGES.ACTIVE;
                const isSelected = selectedIds.includes(u.id);
                return (
                  <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>
                    <td className="p-4">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelectUser(u.id)}
                        className="rounded text-blue-600 border-slate-300 focus:ring-blue-500" />
                    </td>
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 font-black text-slate-700 flex items-center justify-center text-xs uppercase">
                        {u.name ? u.name.charAt(0) : u.email.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.name || 'Unnamed User'}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{u.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {u.department || 'Accounts'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{u.role}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setSelectedUser(u)} className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-bold rounded-lg transition-colors">
                        Edit / View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar (25 items per page) */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Showing Page {currentPage} of {totalPages} ({filteredUsers.length} total users)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-1.5 rounded-lg border bg-white disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border bg-white disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/85 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Mail size={14} className="text-amber-500" /> Pending Invitations
            </h4>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {pendingInvites.length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Department</th>
                  <th className="py-2">Sent On</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {pendingInvites.map(inv => (
                  <tr key={inv.id}>
                    <td className="py-3 font-bold text-slate-800">{inv.email}</td>
                    <td className="py-3">{inv.role}</td>
                    <td className="py-3">{inv.department || 'Accounts'}</td>
                    <td className="py-3 text-slate-400 text-[10px]">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button onClick={() => handleResendInvite(inv.id)} className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-bold rounded-md transition-colors">
                        Resend Invite
                      </button>
                      <button onClick={() => handleCancelInvite(inv.id)} className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md transition-colors">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Invite New Workspace User</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleSendInvite} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1 text-[10px] uppercase text-slate-400 font-black">Full Name</label>
                <input type="text" value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="e.g. John Doe" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="block mb-1 text-[10px] uppercase text-slate-400 font-black">Email Address</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="user@company.com" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[10px] uppercase text-slate-400 font-black">Department</label>
                  <select value={inviteForm.department} onChange={e => setInviteForm({ ...inviteForm, department: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold">
                    <option value="Accounts">Accounts</option>
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Management">Management</option>
                    <option value="Store">Store</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-[10px] uppercase text-slate-400 font-black">Role</label>
                  <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold">
                    <option value="ADMIN">Admin</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="MANAGER">Manager</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={inviting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center gap-1.5 shadow-md shadow-blue-200">
                  <Send size={13} /> {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Drawer */}
      {selectedUser && (
        <UserDetailsDrawer user={selectedUser} onClose={() => { setSelectedUser(null); fetchUsersData(); }} />
      )}

    </div>
  );
};

export default UsersTab;
