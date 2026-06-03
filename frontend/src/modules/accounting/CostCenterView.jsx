import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Search, Trash2, LayoutGrid, 
  Activity, Briefcase, RefreshCcw, AlertCircle,
  Building2, Users2, Target, X
} from 'lucide-react';
import { costCenterAPI } from '../../services/api';

const CostCenterView = ({ showNew }) => {
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(showNew || false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const companyId = localStorage.getItem('companyId');

    const fetchCenters = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const res = await costCenterAPI.getByCompany(companyId);
            setCenters(Array.isArray(res.data) ? res.data : []);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [companyId]);

    useEffect(() => { fetchCenters(); }, [fetchCenters]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await costCenterAPI.create({ 
                name, 
                description, 
                CompanyId: companyId 
            });
            setName('');
            setDescription('');
            setShowModal(false);
            fetchCenters();
        } catch (err) { alert('Failed to create cost center'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this cost center?')) return;
        try {
            await costCenterAPI.delete(id);
            fetchCenters();
        } catch (err) { alert('Delete failed'); }
    };

    const filtered = centers.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-fade-in font-sans min-h-[calc(100vh-80px)]">
            
            {/* Header */}
            <div className="flex justify-between items-end border-b border-slate-100 pb-8">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-indigo-600/10 text-indigo-600 rounded-xl flex items-center justify-center">
                         <Target size={18}/>
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">Resource Allocation</span>
                   </div>
                   <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Cost Centers</h1>
                   <p className="text-slate-400 text-xs font-semibold mt-2">Track financials by Project, Department, or Business Unit.</p>
                </div>
                <div className="flex gap-3">
                   <button onClick={fetchCenters} className="p-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm"><RefreshCcw size={18} className={loading ? 'animate-spin' : ''} /></button>
                   <button 
                      onClick={() => setShowModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/30 transition-all active:scale-[0.98] flex items-center gap-1.5"
                   >
                      <Plus size={16}/> New Center
                   </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<Briefcase size={20}/>} label="Total Centers" value={centers.length} color="indigo" />
                <StatCard icon={<Target size={20}/>}    label="Active Projects" value={centers.length} color="emerald" />
                <StatCard icon={<Users2 size={20}/>}    label="Allocations" value="Professional" color="blue" />
            </div>

            {/* Search & List */}
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                    <div className="relative max-w-md group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Filter cost centers..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="divide-y divide-slate-100/60">
                    {loading ? (
                        <div className="p-24 text-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse flex flex-col items-center gap-3">
                            <RefreshCcw size={20} className="animate-spin text-indigo-500" />
                            Loading Units...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 border border-slate-100">
                                <LayoutGrid size={28}/>
                            </div>
                            <p className="text-slate-400 font-bold text-sm">No Cost Centers found.</p>
                        </div>
                    ) : (
                        filtered.map(center => (
                            <div key={center.id} className="px-8 py-5 hover:bg-slate-50/40 transition-all flex items-center justify-between group">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-slate-50/50 border border-slate-100/80 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50/50 group-hover:border-indigo-100/50 transition-all duration-300 shadow-sm">
                                        <Building2 size={20}/>
                                    </div>
                                    <div>
                                        <div className="text-[14px] font-bold text-slate-900 leading-snug">{center.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">ID: {center.id.substring(0,8)}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Description</div>
                                        <div className="text-[13px] font-bold text-slate-500">{center.description || '—'}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(center.id)}
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-200 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Creation Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300" onClick={() => setShowModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white/95 backdrop-blur-lg shadow-2xl border border-white/50 rounded-[28px] overflow-hidden transform transition-all scale-100 animate-zoom-in flex flex-col">
                        <header className="px-8 py-6 border-b border-slate-100/80 bg-slate-50/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600/10 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <Target size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[17px] font-black text-slate-900 leading-tight">Create Cost Center</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Resource Allocation</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowModal(false)} 
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-full transition-all border border-transparent hover:border-slate-200"
                            >
                                <X size={18} />
                            </button>
                        </header>
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Center Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Marketing, Project X..."
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-500/20 focus:bg-white font-bold text-slate-800 placeholder:text-slate-400 transition-all font-sans"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Notes (Optional)</label>
                                <textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Add optional notes..."
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-500/20 focus:bg-white font-bold text-slate-800 placeholder:text-slate-400 transition-all min-h-[100px] font-sans"
                                />
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-slate-100/50">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all font-sans">Cancel</button>
                                <button type="submit" className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/15 hover:shadow-indigo-600/30 transition-all font-sans active:scale-95">Create Unit</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const StatCard = ({ icon, label, value, color }) => {
    const colorClasses = {
        indigo: 'text-indigo-600 bg-indigo-50/70 border-indigo-100/50',
        emerald: 'text-emerald-600 bg-emerald-50/70 border-emerald-100/50',
        blue: 'text-blue-600 bg-blue-50/70 border-blue-100/50'
    };
    const currentClass = colorClasses[color] || colorClasses.indigo;
    return (
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${currentClass}`}>
                {icon}
            </div>
            <div className="space-y-1">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.15em]">{label}</div>
                <div className="text-3xl font-black text-slate-950 tracking-tight leading-none">{value}</div>
            </div>
        </div>
    );
};

export default CostCenterView;
