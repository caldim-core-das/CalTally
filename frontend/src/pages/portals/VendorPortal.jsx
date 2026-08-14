import React, { useState } from 'react';
import { ShoppingBag, FileText, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { formatIndianRupee } from '../../components/MoneyInput';

const VendorPortal = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [messages, setMessages] = useState([
    { sender: 'System', text: 'Welcome to the Vendor Portal. You can verify purchase orders and bill settlements here.', time: '09:00 AM' }
  ]);
  const [newMsg, setNewMsg] = useState('');

  const orders = [
    { number: 'PO-00109', date: '2026-07-10', amount: 35000, status: 'Completed' },
    { number: 'PO-00110', date: '2026-07-22', amount: 15800, status: 'Draft' }
  ];

  const bills = [
    { number: 'BILL-00021', date: '2026-07-12', amount: 35000, status: 'Paid' },
    { number: 'BILL-00022', date: '2026-07-24', amount: 15800, status: 'Open' }
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
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vendor Portal</h1>
            <p className="text-slate-500 text-[13px] tracking-wide uppercase mt-1">Supplier Billing Center</p>
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
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Purchase Orders</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{formatIndianRupee(50800)}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={22} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Settled Bills</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{formatIndianRupee(35000)}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={22} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Pending Bills</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{formatIndianRupee(15800)}</div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-6 border-b-2 text-sm uppercase tracking-wider ${activeTab === 'orders' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Purchase Orders
          </button>
          <button 
            onClick={() => setActiveTab('bills')}
            className={`py-3 px-6 border-b-2 text-sm uppercase tracking-wider ${activeTab === 'bills' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Bills
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`py-3 px-6 border-b-2 text-sm uppercase tracking-wider ${activeTab === 'messages' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Messages
          </button>
        </div>

        {/* Content View */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6">
          {activeTab === 'orders' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-4">Order #</th>
                    <th className="pb-4">Order Date</th>
                    <th className="pb-4">Amount</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {orders.map(order => (
                    <tr key={order.number} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 text-purple-600 font-black">{order.number}</td>
                      <td className="py-4 text-slate-500">{order.date}</td>
                      <td className="py-4 text-slate-900 font-bold">{formatIndianRupee(order.amount)}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                          ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'bills' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-4">Bill #</th>
                    <th className="pb-4">Bill Date</th>
                    <th className="pb-4">Amount</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {bills.map(bill => (
                    <tr key={bill.number} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 text-purple-600 font-black">{bill.number}</td>
                      <td className="py-4 text-slate-500">{bill.date}</td>
                      <td className="py-4 text-slate-900 font-bold">{formatIndianRupee(bill.amount)}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                          ${bill.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="h-64 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-sm shadow-sm
                      ${msg.sender === 'You' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{msg.sender} • {msg.time}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input 
                  type="text" 
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Type your message to procurement team..." 
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

export default VendorPortal;
