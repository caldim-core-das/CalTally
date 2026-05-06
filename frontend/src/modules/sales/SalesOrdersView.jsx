import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Download, Columns, Rows, ChevronLeft, ChevronRight, ChevronDown,
  Settings, X, HelpCircle, Package, User, Calendar, FileText, Trash2,
  ArrowLeft, Save, Send, Clock, MoreHorizontal, CheckCircle2, AlertCircle, Loader2, Edit2, RefreshCw, ShieldCheck
} from 'lucide-react';
import { salesAPI, ledgerAPI, inventoryAPI } from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import useNotificationStore from '../../store/notificationStore';

// ─────────────────────────────────────────────────
// MANAGE SALESPERSONS MODAL (Internal)
// ─────────────────────────────────────────────────
const ManageSalespersonsModal = ({ isOpen, onClose, salespersons, onSave, onSelect }) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  if (!isOpen) return null;

  const filtered = salespersons.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSaveAndSelect = () => {
    if (!newName.trim()) return;
    const entry = { id: Date.now(), name: newName.trim(), email: newEmail.trim() };
    const updated = [...salespersons, entry];
    localStorage.setItem('tally_salespersons', JSON.stringify(updated));
    onSave(updated);
    onSelect(entry.name);
    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.2)] w-full max-w-lg overflow-hidden animate-scale-up">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[18px] font-black text-slate-900 tracking-tight">Manage Salespersons</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Salesperson"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-blue-600 text-white text-[13px] font-black rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-blue-100">
            <Plus size={14} /> New Salesperson
          </button>
        </div>
        {showAddForm && (
          <div className="mx-6 my-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-black text-red-500 uppercase tracking-widest mb-1.5">Name*</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full h-9 px-3 border border-slate-300 rounded text-[13px] font-medium outline-none focus:border-blue-500 bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full h-9 px-3 border border-slate-300 rounded text-[13px] font-medium outline-none focus:border-blue-500 bg-white transition-all" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveAndSelect} disabled={!newName.trim()} className="px-5 py-2 bg-blue-600 text-white text-[12px] font-black rounded hover:bg-blue-700 transition-all disabled:opacity-40 shadow-sm">Save and Select</button>
              <button onClick={() => { setShowAddForm(false); setNewName(''); setNewEmail(''); }} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 text-[12px] font-black rounded hover:bg-slate-50 transition-all">Cancel</button>
            </div>
          </div>
        )}
        <div className="px-6">
          <div className="sticky top-0 bg-white grid grid-cols-2 py-3 border-b border-slate-100 z-10">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salesperson Name</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</span>
          </div>
          <div className="max-h-56 overflow-y-auto no-scrollbar">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-[13px] font-medium">No salespersons found.</div>
            ) : (
              filtered.map(s => (
                <div key={s.id} onClick={() => { onSelect(s.name); onClose(); }} className="grid grid-cols-2 py-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer rounded transition-colors">
                  <span className="text-[13px] font-bold text-blue-600">{s.name}</span>
                  <span className="text-[13px] text-slate-500 font-medium">{s.email || '—'}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="px-6 py-4" />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// CUSTOM SEARCHABLE SELECTORS
// ─────────────────────────────────────────────────

const CustomerSearchSelector = ({ value, onChange, customers, placeholder, onNewCustomer }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative" ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-11 px-4 bg-slate-50 border ${isOpen ? 'border-blue-500 bg-white ring-0' : 'border-slate-200'} rounded-none flex items-center justify-between cursor-pointer transition-all`}
            >
                <span className={`text-[14px] font-black ${value ? 'text-slate-900' : 'text-slate-400'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,0.1)] z-[200] rounded-none animate-fade-in overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Filter ledger..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-none text-[12px] font-black outline-none focus:border-slate-900 transition-all"
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto no-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="p-8 text-center bg-white">
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-4">No matching accounts</p>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onNewCustomer?.(); }}
                                    className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all rounded-none"
                                >
                                    + Create New Ledger
                                </button>
                            </div>
                        ) : (
                            <>
                                {filtered.map(c => (
                                    <div 
                                        key={c.id}
                                        onClick={() => { onChange(c.id); setIsOpen(false); setSearch(''); }}
                                        className="px-6 py-3.5 hover:bg-slate-900 hover:text-white cursor-pointer border-b border-slate-50 last:border-0 transition-all group"
                                    >
                                        <p className="text-[14px] font-black tracking-tight">{c.name}</p>
                                        <p className="text-[10px] uppercase font-black tracking-widest mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {c.Group?.name || 'SUNDRY DEBTOR'} • ₹{parseFloat(c.balance || 0).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                                <div 
                                    onClick={(e) => { e.stopPropagation(); onNewCustomer?.(); }}
                                    className="px-6 py-4 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-black text-[11px] uppercase tracking-[0.2em] cursor-pointer transition-all flex items-center gap-2 sticky bottom-0 border-t border-blue-100"
                                >
                                    <Plus size={16} strokeWidth={3} /> Add New Customer
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ItemSearchSelector = ({ value, onChange, items, placeholder, onNewItem }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative" ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full min-h-11 px-4 bg-transparent border-none rounded-none flex items-center justify-between cursor-pointer transition-all`}
            >
                <span className={`text-[14px] font-black ${value ? 'text-slate-900' : 'text-slate-400'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,0.1)] z-[200] rounded-none animate-fade-in overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Filter items..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-none text-[12px] font-black outline-none focus:border-slate-900 transition-all"
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto no-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="p-8 text-center bg-white">
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-4">No matching items</p>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onNewItem?.(); }}
                                    className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all rounded-none"
                                >
                                    + Add New Item
                                </button>
                            </div>
                        ) : (
                            <>
                                {filtered.map(it => (
                                    <div 
                                        key={it.id}
                                        onClick={() => { onChange(it); setIsOpen(false); setSearch(''); }}
                                        className="px-6 py-3.5 hover:bg-slate-900 hover:text-white cursor-pointer border-b border-slate-50 last:border-0 transition-all group"
                                    >
                                        <p className="text-[14px] font-black tracking-tight">{it.name}</p>
                                        <p className="text-[10px] uppercase font-black tracking-widest mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                            Rate: ₹{parseFloat(it.sellingPrice || 0).toLocaleString()} • Stock: {it.stock || 0}
                                        </p>
                                    </div>
                                ))}
                                <div 
                                    onClick={(e) => { e.stopPropagation(); onNewItem?.(); }}
                                    className="px-6 py-4 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-black text-[11px] uppercase tracking-[0.2em] cursor-pointer transition-all flex items-center gap-2 sticky bottom-0 border-t border-blue-100"
                                >
                                    <Plus size={16} strokeWidth={3} /> Create New Item
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const SalesOrdersView = ({ companyId }) => {
    const navigate = useNavigate();
    const [view, setView] = useState('list'); // 'list', 'form', 'detail'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [items, setItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info', showCancel: false });
    const { addNotification } = useNotificationStore();

    const [formData, setFormData] = useState({
        id: null,
        customerId: '',
        orderNumber: '',
        referenceNumber: '',
        date: new Date().toISOString().split('T')[0],
        expectedShipmentDate: '',
        paymentTerms: 'Due on Receipt',
        salesperson: '',
        items: [{ id: Date.now(), itemId: '', detail: '', quantity: 1, rate: 0, amount: 0 }],
        subTotal: 0,
        discount: 0,
        taxPercent: 18,
        taxAmount: 0,
        adjustment: 0,
        totalAmount: 0,
        status: 'Draft',
        customerNotes: '',
        termsConditions: ''
    });

    const fetchData = async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const [oRes, cRes, iRes] = await Promise.all([
                salesAPI.getOrders(companyId),
                ledgerAPI.getByCompany(companyId),
                inventoryAPI.getByCompany(companyId)
            ]);

            setOrders(Array.isArray(oRes.data) ? oRes.data : []);
            setCustomers(Array.isArray(cRes.data) ? cRes.data.filter(l => 
                l.Group?.name?.toLowerCase().includes('debtor') || 
                l.Group?.name?.toLowerCase().includes('customer')
            ) : []);
            setItems(Array.isArray(iRes.data) ? iRes.data : []);
        } catch (err) {
            console.error('Fetch error:', err);
            addNotification('Failed to sync sales data.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [companyId]);

    // Form Calculations
    useEffect(() => {
        const subTotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const taxAmount = subTotal * (parseFloat(formData.taxPercent || 0) / 100);
        const total = subTotal - (parseFloat(formData.discount || 0)) + taxAmount + (parseFloat(formData.adjustment || 0));
        setFormData(prev => ({ ...prev, subTotal, taxAmount, totalAmount: total }));
    }, [formData.items, formData.discount, formData.taxPercent, formData.adjustment]);

    const handleItemUpdate = (id, field, value) => {
        setFormData(prev => {
            const newItems = prev.items.map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'itemId') {
                        const selected = items.find(i => i.id === value);
                        if (selected) {
                            updated.detail = selected.name;
                            updated.rate = selected.sellingPrice || 0;
                        }
                    }
                    updated.amount = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.rate) || 0);
                    return updated;
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    };

    const handleSave = async (statusValue = 'Draft') => {
        if (!formData.customerId) {
            addNotification('Please select a customer.', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = { ...formData, companyId, status: statusValue };
            if (formData.id) {
                await salesAPI.updateOrder(formData.id, payload);
                addNotification('Sales Order updated.', 'success');
            } else {
                await salesAPI.createOrder(payload);
                addNotification('Sales Order created.', 'success');
            }
            setView('list');
            fetchData();
        } catch (err) {
            addNotification('Failed to save sales order.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await salesAPI.deleteOrder(deleteId);
            addNotification('Order deleted.', 'success');
            fetchData();
        } catch (err) {
            addNotification('Failed to delete order.', 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            id: null,
            customerId: '',
            orderNumber: `SO-${String(orders.length + 1).padStart(5, '0')}`,
            referenceNumber: '',
            date: new Date().toISOString().split('T')[0],
            expectedShipmentDate: '',
            paymentTerms: 'Due on Receipt',
            salesperson: '',
            items: [{ id: Date.now(), itemId: '', detail: '', quantity: 1, rate: 0, amount: 0 }],
            subTotal: 0,
            discount: 0,
            taxPercent: 18,
            taxAmount: 0,
            adjustment: 0,
            totalAmount: 0,
            status: 'Draft',
            customerNotes: '',
            termsConditions: ''
        });
    };

    const openForm = (order = null) => {
        if (order) {
            setFormData({
                ...order,
                customerId: order.LedgerId,
                items: order.Items?.map(i => ({ ...i, id: i.id })) || [{ id: Date.now(), itemId: '', detail: '', quantity: 1, rate: 0, amount: 0 }]
            });
        } else {
            resetForm();
        }
        setView('form');
    };

    const openDetail = (order) => {
        setSelectedOrder(order);
        setView('detail');
    };

    const filteredOrders = orders.filter(o => 
        o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.Customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderListView = () => (
        <div className="flex-1 flex flex-col h-full bg-white animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-[#fcfdfe]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 flex items-center justify-center text-white font-black text-xl rounded-none tracking-tighter">SO</div>
                    <div>
                        <h1 className="text-[18px] font-black text-slate-900 tracking-tight uppercase">Sales Orders</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Supply Chain & Fulfillment Tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => openForm()}
                        className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-2.5 rounded-none font-black text-[12px] uppercase tracking-[0.2em] flex items-center gap-2 transition-all shadow-xl shadow-slate-200"
                    >
                        <Plus size={16} strokeWidth={3} /> New Order
                    </button>
                </div>
            </div>

            <div className="px-8 py-4 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
                <div className="relative group w-96">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="SEARCH ORDERS BY NUMBER OR CUSTOMER..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-none text-[11px] font-black text-slate-700 outline-none focus:border-slate-900 shadow-sm transition-all uppercase tracking-widest"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="p-2.5 text-slate-400 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200 rounded-none">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b-2 border-slate-900">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Order Ref</th>
                            <th className="px-6 py-4">Client Entity</th>
                            <th className="px-6 py-4 text-center">Fulfillment</th>
                            <th className="px-6 py-4 text-right">Net Value</th>
                            <th className="px-6 py-4 text-center w-20">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse border-b border-slate-50">
                                    <td colSpan="6" className="px-6 py-8"><div className="h-4 bg-slate-50 rounded-none w-full"></div></td>
                                </tr>
                            ))
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="py-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-20">
                                        <Package size={64} strokeWidth={1} />
                                        <p className="text-[14px] font-black uppercase tracking-[0.3em]">No order records identified</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr 
                                    key={order.id} 
                                    onClick={() => openDetail(order)}
                                    className="hover:bg-slate-50/80 transition-all cursor-pointer group border-b border-slate-50"
                                >
                                    <td className="px-6 py-6 text-[13px] font-black text-slate-400 tabular-nums">
                                        {new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="text-[15px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{order.orderNumber}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: {order.referenceNumber || 'INTERNAL'}</div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="text-[14px] font-black text-slate-800 uppercase leading-none">{order.Customer?.name || 'GENERIC CLIENT'}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ledger: {order.LedgerId?.substring(0,8)}...</div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] border ${
                                            order.status === 'Draft' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                            order.status === 'Sent' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 text-right font-black text-slate-900 tabular-nums text-[15px]">
                                        ₹{parseFloat(order.totalAmount).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-6" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => openForm(order)} className="p-2 hover:bg-white hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all rounded-none text-slate-400">
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => { setDeleteId(order.id); setIsDeleteModalOpen(true); }}
                                                className="p-2 hover:bg-white hover:text-red-600 border border-transparent hover:border-red-100 transition-all rounded-none text-slate-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderFormView = () => (
        <div className="flex flex-col h-screen bg-[#f8fafc]">
            {/* Form Header */}
            <header className="fixed top-0 left-0 right-0 bg-white border-b border-slate-900 px-12 py-4 flex items-center justify-between z-[110] shadow-sm">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setView('list')}
                        className="p-2 hover:bg-slate-100 rounded-none text-slate-400 hover:text-slate-900 transition-all"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h2 className="text-[18px] font-black text-slate-900 tracking-[0.05em] uppercase flex items-center gap-2">
                            {formData.id ? 'Modify Order' : 'Create Sales Order'}
                            <span className="text-[11px] font-black text-white bg-slate-900 px-2 py-0.5 rounded-none uppercase tracking-[0.2em]">
                                {formData.orderNumber || 'DRAFT'}
                            </span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Official Sales Document Initialization</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Settings size={20}/></button>
                    <div className="w-px h-6 bg-slate-200" />
                    <button onClick={() => setView('list')} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </header>

            <div className="flex-1 mt-20 pb-32 bg-[#f8fafc] overflow-y-auto no-scrollbar">
                <div className="max-w-[1000px] mx-auto py-10 px-6">
                    <div className="bg-white rounded-none border border-slate-200 shadow-2xl shadow-slate-200/50 p-12 space-y-12 animate-fade-in">
                        
                        {/* Form Section: Core Details */}
                        <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2.5 relative">
                                <label className="text-[11px] font-black text-red-500 uppercase tracking-[0.2em] ml-1">Customer Selection*</label>
                                <CustomerSearchSelector 
                                    value={customers.find(c => c.id === formData.customerId)?.name}
                                    customers={customers}
                                    placeholder="Search or select ledger..."
                                    onChange={(id) => setFormData(p => ({ ...p, customerId: id }))}
                                    onNewCustomer={() => {
                                        localStorage.setItem('so_draft', JSON.stringify(formData));
                                        window.open('/ledger/new', '_blank');
                                    }}
                                />
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-red-500 uppercase tracking-[0.2em] ml-1">Sales Order #*</label>
                                <input 
                                    type="text" 
                                    value={formData.orderNumber} 
                                    onChange={e => setFormData(p => ({ ...p, orderNumber: e.target.value }))}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-none text-[14px] font-black text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase tracking-widest"
                                />
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reference ID</label>
                                <input 
                                    type="text" 
                                    value={formData.referenceNumber} 
                                    onChange={e => setFormData(p => ({ ...p, referenceNumber: e.target.value }))}
                                    placeholder="e.g. PO-12345"
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-none text-[14px] font-black text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                />
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-red-500 uppercase tracking-[0.2em] ml-1">Order Date*</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input 
                                        type="date" 
                                        value={formData.date} 
                                        onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-none text-[14px] font-black text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all pr-12"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Expected Shipment</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input 
                                        type="date" 
                                        value={formData.expectedShipmentDate} 
                                        onChange={e => setFormData(p => ({ ...p, expectedShipmentDate: e.target.value }))}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-none text-[14px] font-black text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all pr-12"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Payment Term</label>
                                <div className="relative group">
                                    <select 
                                        value={formData.paymentTerms} 
                                        onChange={e => setFormData(p => ({ ...p, paymentTerms: e.target.value }))}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-none text-[14px] font-black text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all appearance-none"
                                    >
                                        <option value="">Due on Receipt</option>
                                        <option value="Net 15">Net 15</option>
                                        <option value="Net 30">Net 30</option>
                                        <option value="Net 45">Net 45</option>
                                        <option value="Net 60">Net 60</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Item Table Section */}
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.1em]">Line Items</h3>
                                <button className="text-[11px] font-black text-slate-400 flex items-center gap-2 hover:bg-slate-50 px-3 py-1.5 rounded-none border border-slate-100 transition-all">
                                    <Settings size={14} /> Global Sync
                                </button>
                            </div>

                            <div className="border border-slate-900 rounded-none overflow-hidden shadow-sm bg-white">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 text-[10px] text-white font-black uppercase tracking-[0.2em]">
                                            <th className="px-6 py-4 text-left">Item Details</th>
                                            <th className="px-6 py-4 text-right w-28">Quantity</th>
                                            <th className="px-6 py-4 text-right w-36">Rate</th>
                                            <th className="px-6 py-4 text-right w-40">Amount</th>
                                            <th className="w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {formData.items.map((line, idx) => (
                                            <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5">
                                                    <ItemSearchSelector 
                                                        value={line.detail}
                                                        items={items}
                                                        placeholder="Type to select item..."
                                                        onChange={(it) => handleItemUpdate(line.id, 'itemId', it.id)}
                                                        onNewItem={() => {
                                                            localStorage.setItem('so_draft', JSON.stringify(formData));
                                                            window.open('/inventory/new', '_blank');
                                                        }}
                                                    />
                                                    <textarea 
                                                        value={line.description}
                                                        onChange={e => handleItemUpdate(line.id, 'description', e.target.value)}
                                                        placeholder="Add item description..." 
                                                        className="w-full mt-2 h-10 bg-transparent text-[11px] text-slate-400 outline-none resize-none border-none focus:ring-0 placeholder:italic font-black uppercase tracking-tight opacity-60"
                                                    />
                                                </td>
                                                <td className="px-6 py-5 align-top">
                                                    <input 
                                                        type="number" 
                                                        value={line.quantity} 
                                                        onChange={e => handleItemUpdate(line.id, 'quantity', parseFloat(e.target.value))}
                                                        className="w-full text-right bg-transparent border-none outline-none text-[13px] font-black text-slate-600 focus:bg-white rounded-none transition-all tabular-nums" 
                                                    />
                                                </td>
                                                <td className="px-6 py-5 align-top font-mono">
                                                    <input 
                                                        type="number" 
                                                        value={line.rate} 
                                                        onChange={e => handleItemUpdate(line.id, 'rate', parseFloat(e.target.value))}
                                                        className="w-full text-right bg-transparent border-none outline-none text-[13px] font-black text-slate-600 focus:bg-white rounded-none transition-all tabular-nums" 
                                                    />
                                                </td>
                                                <td className="px-6 py-5 text-right align-top">
                                                    <span className="text-[13px] font-black text-slate-900 tabular-nums">₹{(parseFloat(line.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </td>
                                                <td className="px-4 py-5 text-center align-top">
                                                    <button onClick={() => handleRemoveField(line.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <button onClick={handleAddField} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-[12px] font-black rounded-none shadow-lg hover:bg-slate-800 transition-all uppercase tracking-[0.2em]">
                                <Plus size={14} strokeWidth={3}/> Add Row
                            </button>
                        </div>

                        {/* Bottom Section */}
                        <div className="flex justify-between items-start pt-12 border-t border-slate-100 gap-20">
                             <div className="flex-1 max-w-md space-y-8">
                                    <div className="space-y-3">
                                         <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Customer Notes</label>
                                         <textarea 
                                                value={formData.customerNotes} 
                                                onChange={e => setFormData({ ...formData, customerNotes: e.target.value })} 
                                                placeholder="Displayed on the document"
                                                className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-none text-[13px] font-black text-slate-600 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none shadow-sm" 
                                         />
                                    </div>

                                    <div className="space-y-3">
                                         <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Terms & Conditions</label>
                                         <textarea 
                                                value={formData.termsConditions} 
                                                onChange={e => setFormData({ ...formData, termsConditions: e.target.value })} 
                                                placeholder="Business terms..." 
                                                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-none text-[13px] font-black text-slate-600 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none shadow-sm" 
                                         />
                                    </div>
                             </div>

                             <div className="w-80 space-y-4">
                                    <div className="flex justify-between text-[13px]">
                                        <span className="font-black text-slate-400 uppercase tracking-[0.2em]">Sub Total</span>
                                        <span className="font-black text-slate-900 tabular-nums">₹{formData.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-[13px]">
                                        <label className="text-slate-400 font-black uppercase tracking-[0.2em]">Discount (%)</label>
                                        <div className="flex items-center gap-4">
                                             <input type="number" value={formData.discount} onChange={e => setFormData({ ...formData, discount: parseFloat(e.target.value) })} className="w-20 h-9 px-2 bg-slate-50 border border-slate-200 rounded-none text-right font-black outline-none focus:border-slate-900 transition-all tabular-nums" />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[13px]">
                                        <label className="text-slate-400 font-black uppercase tracking-[0.2em]">Tax (GST)</label>
                                        <select 
                                                value={formData.taxPercent} 
                                                onChange={e => {
                                                    const rate = parseFloat(e.target.value) || 0;
                                                    setFormData(p => ({ ...p, taxPercent: rate, tax: p.subTotal * (rate/100) }));
                                                }}
                                                className="w-36 h-9 px-2 bg-slate-50 border border-slate-200 rounded-none text-[11px] font-black text-slate-700 outline-none focus:border-slate-900 transition-all"
                                        >
                                                <option value="0">GST (0%)</option>
                                                <option value="5">GST (5%)</option>
                                                <option value="12">GST (12%)</option>
                                                <option value="18">GST (18%)</option>
                                                <option value="28">GST (28%)</option>
                                        </select>
                                    </div>

                                    <div className="flex justify-between items-center text-[13px]">
                                        <span className="text-slate-400 font-black uppercase tracking-[0.2em]">Adjustment</span>
                                        <input type="number" value={formData.adjustment} onChange={e => setFormData({ ...formData, adjustment: e.target.value })} className="w-28 h-9 px-2 bg-slate-50 border border-slate-200 rounded-none text-right font-black outline-none focus:border-slate-900 transition-all tabular-nums" />
                                    </div>

                                    <div className="pt-6 mt-6 border-t-[3px] border-slate-900">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[14px] font-black text-slate-900 uppercase tracking-[0.1em]">Total</span>
                                            <span className="text-[28px] font-black text-slate-900 tabular-nums">₹{formData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Actions Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white px-12 py-4 flex items-center justify-between z-[110] shadow-[0_-5px_25px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Document Status</span>
                        <span className="text-[13px] font-black text-blue-400 flex items-center gap-2 uppercase tracking-widest"><Clock size={14}/> {formData.status || 'Draft'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => handleSave('Draft')}
                        disabled={saving}
                        className="px-6 py-2.5 bg-transparent border border-slate-700 text-slate-300 rounded-none text-[12px] font-black hover:bg-slate-800 transition-all uppercase tracking-[0.2em]"
                    >
                        {saving ? 'Processing...' : 'Save Draft'}
                    </button>
                    <button 
                        onClick={() => handleSave('Open')}
                        disabled={saving}
                        className="px-8 py-2.5 bg-blue-600 text-white rounded-none text-[12px] font-black hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2 uppercase tracking-[0.2em]"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Send size={16}/>}
                        Initialize Order
                    </button>
                </div>
            </footer>
        </div>
    );

    const renderDetailView = () => {
        const order = selectedOrder;
        if (!order) return null;
        const itemsList = order.Items || [];

        return (
            <div className="flex-1 flex flex-col h-full bg-[#f8fafc] animate-fade-in shadow-inner overflow-hidden">
                <div className="bg-[#fcfdfe] border-b border-slate-200 px-8 py-2.5 flex items-center justify-between sticky top-0 z-10 no-print">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setView('list')} className="text-[13px] font-bold text-blue-600 hover:underline flex items-center gap-1.5 transition-all">
                           <ChevronDown size={14} className="rotate-90"/> All Orders
                        </button>
                        <span className="text-slate-300">|</span>
                        <span className="text-[13px] font-black text-slate-800 uppercase">{order.orderNumber}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-none transition-all hover:text-slate-600"><History size={16}/></button>
                       <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-none transition-all hover:text-slate-600"><Share2 size={16}/></button>
                    </div>
                </div>

                <div className="bg-white border-b border-slate-100 px-8 py-2 flex items-center justify-between shadow-sm no-print">
                    <div className="flex items-center gap-1">
                        <button onClick={() => openForm(order)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-none flex items-center gap-1.5 text-[12px] font-bold border border-transparent hover:border-slate-100 transition-all"><Edit2 size={14}/> Modify</button>
                        <button onClick={() => window.print()} className="px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-none flex items-center gap-1.5 text-[12px] font-bold transition-all"><Printer size={14}/> PDF / Print</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-12 flex flex-col items-center custom-scrollbar print:p-0 print:bg-white transition-all bg-slate-50/50">
                    <div id="printable-order" className="bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] rounded-none min-h-[842px] w-full max-w-[800px] mx-auto p-8 md:p-20 relative overflow-hidden border border-slate-100 mb-20 group">
                        <div className="absolute top-16 right-16 rotate-[12deg] opacity-[0.03] no-print pointer-events-none select-none">
                            <div className="border-[12px] border-slate-900 text-slate-900 px-12 py-6 text-7xl font-black uppercase tracking-[0.2em] rounded-none">ORDER</div>
                        </div>

                        <div className="flex justify-between items-start mb-16 border-b border-slate-900 pb-12">
                            <div className="flex gap-4 items-start max-w-[65%]">
                                <div className="w-12 h-12 bg-slate-900 flex items-center justify-center text-white font-black text-xl shrink-0 rounded-none">M</div>
                                <div className="space-y-1 min-w-0">
                                    <h2 className="text-[18px] font-black text-slate-900 tracking-tight uppercase leading-tight">OFFICIAL SUPPLY CHAIN</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Fulfillment & Operations</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className="text-[18px] font-black text-slate-900 tracking-[0.2em] uppercase leading-none mb-3">SALES ORDER</h1>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Order Ref #</p>
                                    <p className="text-[15px] font-black text-slate-900 tracking-tight uppercase">{order.orderNumber}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-20 mb-16">
                            <div className="space-y-4">
                                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Bill To Entity</h5>
                                <div className="space-y-1">
                                    <p className="text-[15px] font-black text-slate-900 leading-tight uppercase">{order.Customer?.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">{order.Customer?.email}</p>
                                </div>
                            </div>
                            <div className="text-right space-y-6">
                                <div>
                                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Issue Date</h5>
                                    <p className="text-[15px] font-black text-slate-900 uppercase">{new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                                {order.expectedShipmentDate && (
                                    <div>
                                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target Delivery</h5>
                                        <p className="text-[15px] font-black text-blue-600 uppercase">{new Date(order.expectedShipmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative mb-20">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-[3px] border-slate-900 text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
                                        <th className="py-6 text-left pb-4">Material / Service Specification</th>
                                        <th className="py-6 text-right w-24 pb-4">Qty</th>
                                        <th className="py-6 text-right w-32 pb-4">Rate</th>
                                        <th className="py-6 text-right w-40 pb-4">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {itemsList.map((it, idx) => (
                                        <tr key={idx} className="group/row hover:bg-slate-50/50 transition-colors">
                                            <td className="py-8">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 flex items-center justify-center text-slate-400 group-hover/row:text-slate-900 font-black text-[12px] rounded-none border border-transparent group-hover/row:border-slate-200 transition-all">{idx + 1}</div>
                                                    <div>
                                                        <p className="text-[16px] font-black text-slate-900 tracking-tight mb-1 uppercase leading-none">{it.detail}</p>
                                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mt-1">{it.description || 'Standard Fulfillment Unit'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-8 text-right text-[15px] font-black text-slate-500 tabular-nums uppercase">{it.quantity} units</td>
                                            <td className="py-8 text-right text-[15px] font-black text-slate-500 tabular-nums">₹{parseFloat(it.rate).toLocaleString()}</td>
                                            <td className="py-8 text-right text-[16px] font-black text-slate-900 tabular-nums">₹{parseFloat(it.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-12 border-t-2 border-slate-900">
                            <div className="w-full max-w-md space-y-6">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Subtotal</span>
                                    <span className="text-[16px] font-bold text-slate-600 tabular-nums">₹{parseFloat(order.subTotal).toLocaleString()}</span>
                                </div>
                                {parseFloat(order.taxAmount || 0) > 0 && (
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tax Levy</span>
                                        <span className="text-[16px] font-bold text-slate-600 tabular-nums">₹{parseFloat(order.taxAmount).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="bg-slate-900 text-white p-6 md:p-8 shadow-2xl relative overflow-hidden rounded-none">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-none blur-[60px] opacity-20"></div>
                                    <div className="flex justify-between items-center relative z-10">
                                        <span className="text-[11px] font-black text-blue-300 uppercase tracking-[0.2em]">Order Total</span>
                                        <span className="text-[24px] md:text-[32px] font-black text-white tracking-tighter tabular-nums leading-none">₹{parseFloat(order.totalAmount).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-32 flex justify-between items-end opacity-40">
                             <div className="space-y-1">
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em]">Validated Order Status: {order.status}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hash ID: {order.id?.substring(0, 16)}</p>
                             </div>
                             <div className="text-right">
                                 <div className="w-32 h-0.5 bg-slate-900 mb-2 ml-auto"></div>
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em]">Authorized Signatory</p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && view === 'list') return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 font-black">
            <Loader2 size={40} className="animate-spin text-slate-900 mb-4" />
            <span className="text-[11px] tracking-[0.4em] uppercase">Initializing Supply Chain...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fcfcfd] p-0 font-sans text-slate-900">
            {view === 'list' && renderListView()}
            {view === 'form' && renderFormView()}
            {view === 'detail' && renderDetailView()}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="TERMINATE ORDER RECORD"
                message="Are you certain you wish to terminate this sales order record? This action is irreversible within the current block."
            />
        </div>
    );
};


export default SalesOrdersView;
