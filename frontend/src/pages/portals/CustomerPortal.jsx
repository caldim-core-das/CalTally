import React, { useState } from 'react';
import { FileText, Wallet, CheckCircle, Clock, MessageSquare, ArrowLeft } from 'lucide-react';
import { formatIndianRupee } from '../../components/MoneyInput';

const CustomerPortal = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [messages, setMessages] = useState([
    { sender: 'System', text: 'Welcome to your Customer Portal. You can view and track your invoices here.', time: '10:00 AM' }
  ]);
  const [newMsg, setNewMsg] = useState('');

  const invoices = [
    { number: 'INV-00042', date: '2026-07-15', amount: 15400, status: 'Paid' },
    { number: 'INV-00043', date: '2026-07-20', amount: 48900, status: 'Draft' },
    { number: 'INV-00044', date: '2026-07-22', amount: 12000, status: 'Approved' }
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setMessages([...messages, { sender: 'You', text: newMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setNewMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-bold">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Portal</h1>
            <p className="text-slate-500 text-[13px] tracking-wide uppercase mt-1">Acme Corp Billing Interface</p>
          </div>
          <button 
            onClick={() => window.history.back()} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all text-xs"
          >
            <ArrowLeft size={14} /> Back to App
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={22} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Total Invoiced</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{formatIndianRupee(76300)}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={22} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Total Paid</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{formatIndianRupee(15400)}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={22} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Outstanding</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{formatIndianRupee(60900)}</div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-6 border-b-2 text-sm uppercase tracking-wider ${activeTab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Invoices
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`py-3 px-6 border-b-2 text-sm uppercase tracking-wider ${activeTab === 'messages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Support Messages
          </button>
        </div>

        {/* Content View */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6">
          {activeTab === 'invoices' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-4">Invoice #</th>
                    <th className="pb-4">Issue Date</th>
                    <th className="pb-4">Amount</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {invoices.map(inv => (
                    <tr key={inv.number} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 text-blue-600 font-black">{inv.number}</td>
                      <td className="py-4 text-slate-500">{inv.date}</td>
                      <td className="py-4 text-slate-900 font-bold">{formatIndianRupee(inv.amount)}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                          ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            inv.status === 'Approved' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Message Log */}
              <div className="h-64 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-sm shadow-sm
                      ${msg.sender === 'You' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{msg.sender} • {msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Input box */}
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input 
                  type="text" 
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Type your message to accounting office..." 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none text-xs text-slate-800"
                />
                <button type="submit" className="px-5 py-3 rounded-xl bg-slate-900 text-white text-xs uppercase tracking-wider hover:bg-slate-800 transition-all">
                  Send
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CustomerPortal;
