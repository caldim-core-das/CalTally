import { getUser } from '../../stores/authStore';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Sparkles, Bot, User, Loader, Lightbulb, ArrowRight,
  Download, ExternalLink, FileText
} from 'lucide-react';
import { AI_SUGGESTION_CHIPS } from '../../services/mockData';
import { purchaseAPI, reportsAPI, inventoryAPI } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AI_API_URL = import.meta.env.VITE_AI_API_URL || null;

// ── Utility: currency & date ────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(d); }
};

const fmtPlain = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);

// ── Action metadata: which actions are direct (no chat message) ─────
const DIRECT_ACTIONS = {
  // Navigation
  'View Purchase Register':    { type: 'navigate', path: '/bills' },
  'View Vendors':              { type: 'navigate', path: '/vendors' },
  'View Inventory':            { type: 'navigate', path: '/inventory' },
  'Go to Invoices':            { type: 'navigate', path: '/sales-invoices' },
  'Go to Payments Made':       { type: 'navigate', path: '/payments-made' },
  'View P&L':                  { type: 'navigate', path: '/reports/pl' },
  'View Balance Sheet':        { type: 'navigate', path: '/reports/bs' },
  'View Reports':              { type: 'navigate', path: '/reports/pl' },
  'View GST Reports':          { type: 'navigate', path: '/reports/trial-balance' },
  'Reconcile ITC':             { type: 'navigate', path: '/reconciliation' },
  'Process Payment':           { type: 'navigate', path: '/payments-made/new' },
  'Create Purchase Order':     { type: 'navigate', path: '/purchase-orders/new' },
  // PDF exports (handled in component)
  'Export PDF':                { type: 'export_pdf' },
  'Export List':               { type: 'export_pdf' },
};

// ── Professional styled table ───────────────────────────────────────
const DataTable = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mt-2 mb-1">
    <table className="min-w-full text-[12px] border-collapse">
      <thead>
        <tr className="bg-gradient-to-r from-[#1A73E8] to-blue-600">
          {headers.map((h, i) => (
            <th key={i} className="px-4 py-2.5 text-left text-white font-bold uppercase tracking-wider whitespace-nowrap">
              {String(h).trim()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
            {row.map((cell, ci) => (
              <td key={ci} className="px-4 py-2.5 text-slate-700 border-b border-slate-100 whitespace-nowrap">
                {String(cell).trim()}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Status badge ────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    OPEN:           'bg-red-100 text-red-700',
    PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
    PAID:           'bg-green-100 text-green-700',
    DRAFT:          'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {status?.replace('_', ' ') || '—'}
    </span>
  );
};

// ── Aging bucket badge ──────────────────────────────────────────────
const AgingBadge = ({ bucket }) => {
  const map = {
    'Current':    'bg-green-100 text-green-700',
    '1-30 Days':  'bg-yellow-100 text-yellow-700',
    '31-60 Days': 'bg-orange-100 text-orange-700',
    '61-90 Days': 'bg-red-100 text-red-700',
    '90+ Days':   'bg-red-200 text-red-800',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${map[bucket] || 'bg-slate-100 text-slate-500'}`}>
      {bucket}
    </span>
  );
};

// ── Unpaid bills table ──────────────────────────────────────────────
const UnpaidBillsTable = ({ bills, total }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mt-2 mb-1">
    <table className="min-w-full text-[12px] border-collapse">
      <thead>
        <tr className="bg-gradient-to-r from-[#1A73E8] to-blue-600">
          {['Vendor', 'Bill No.', 'Date', 'Due Date', 'Amount', 'Balance Due', 'Status'].map(h => (
            <th key={h} className="px-4 py-2.5 text-left text-white font-bold uppercase tracking-wider whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bills.map((bill, ri) => (
          <tr key={bill.id} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
            <td className="px-4 py-2.5 font-medium text-slate-800 border-b border-slate-100 whitespace-nowrap">
              {bill.vendorName || bill.Ledger?.name || '—'}
            </td>
            <td className="px-4 py-2.5 text-slate-700 border-b border-slate-100 font-mono whitespace-nowrap">
              {bill.billNumber || bill.voucherNumber || '—'}
            </td>
            <td className="px-4 py-2.5 text-slate-600 border-b border-slate-100 whitespace-nowrap">{fmtDate(bill.date)}</td>
            <td className="px-4 py-2.5 text-slate-600 border-b border-slate-100 whitespace-nowrap">
              {bill.dueDate ? fmtDate(bill.dueDate) : '—'}
            </td>
            <td className="px-4 py-2.5 text-slate-700 border-b border-slate-100 whitespace-nowrap">{fmt(bill.totalAmount)}</td>
            <td className="px-4 py-2.5 font-semibold text-red-700 border-b border-slate-100 whitespace-nowrap">{fmt(bill.balanceDue)}</td>
            <td className="px-4 py-2.5 border-b border-slate-100"><StatusBadge status={bill.status} /></td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-blue-50 border-t-2 border-blue-200">
          <td colSpan={5} className="px-4 py-2.5 font-bold text-blue-800">Total Payables</td>
          <td className="px-4 py-2.5 font-bold text-red-700">{fmt(total)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  </div>
);

// ── Payables statement table ────────────────────────────────────────
const PayablesStatementTable = ({ vendors, summary }) => (
  <div>
    {vendors.map((vendor) => (
      <div key={vendor.vendorId} className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold text-[13px] text-slate-800">{vendor.vendorName}</span>
          <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
            Outstanding: {fmt(vendor.total)}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mb-1">
          <table className="min-w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800">
                {['Bill No.', 'Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Aging'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-white font-bold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendor.bills.map((bill, ri) => (
                <tr key={bill.id} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="px-3 py-2 font-mono text-slate-700 border-b border-slate-100">{bill.billNumber || '—'}</td>
                  <td className="px-3 py-2 text-slate-600 border-b border-slate-100 whitespace-nowrap">{fmtDate(bill.date)}</td>
                  <td className="px-3 py-2 text-slate-600 border-b border-slate-100 whitespace-nowrap">
                    {bill.dueDate ? fmtDate(bill.dueDate) : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-700 border-b border-slate-100 whitespace-nowrap">{fmt(bill.billAmount)}</td>
                  <td className="px-3 py-2 text-green-700 border-b border-slate-100 whitespace-nowrap">{fmt(bill.amountPaid)}</td>
                  <td className="px-3 py-2 font-semibold text-red-700 border-b border-slate-100 whitespace-nowrap">{fmt(bill.balance)}</td>
                  <td className="px-3 py-2 border-b border-slate-100"><AgingBadge bucket={bill.agingBucket} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ))}
    {summary && (
      <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold text-blue-900">Grand Total Outstanding</span>
          <span className="text-[14px] font-bold text-red-700">{fmt(summary.grandTotal)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(summary.agingSummary || {}).filter(([, v]) => v > 0).map(([bucket, val]) => (
            <div key={bucket} className="bg-white rounded-lg p-2 border border-blue-100 text-center">
              <div className="text-[10px] text-slate-500 font-semibold">{bucket}</div>
              <div className="text-[12px] font-bold text-slate-800">{fmt(val)}</div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ── Markdown content renderer (bold + pipe tables) ──────────────────
const MessageContent = ({ content }) => {
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
      const parse = (l) => l.replace(/^\||\|$/g, '').split('|');
      if (tableLines.length >= 2 && !tableLines[1].replace(/\|/g, '').replace(/-/g, '').replace(/\s/g, '')) {
        result.push(<DataTable key={`tbl-${i}`} headers={parse(tableLines[0])} rows={tableLines.slice(2).map(parse)} />);
      }
      continue;
    }
    const parts = line.split(/\*\*(.*?)\*\*/g);
    result.push(
      <div key={i} className="mb-1 last:mb-0">
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>)}
      </div>
    );
    i++;
  }
  return <>{result}</>;
};

// ── Action button: smart icon ───────────────────────────────────────
const getActionIcon = (action) => {
  const a = action.toLowerCase();
  if (a.includes('pdf') || a.includes('export') || a.includes('list')) return <Download size={11} />;
  if (a.includes('navigate') || a.includes('view') || a.includes('go to') || a.includes('register') || a.includes('vendor') || a.includes('inventory') || a.includes('payment') || a.includes('invoice') || a.includes('balance') || a.includes('p&l') || a.includes('gst') || a.includes('reconcile')) return <ExternalLink size={11} />;
  return <ArrowRight size={11} />;
};

// ── Single chat bubble ──────────────────────────────────────────────
const ChatBubble = ({ msg, onActionClick }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md
        ${isUser ? 'bg-[#1A73E8]' : 'bg-gradient-to-br from-blue-600 to-blue-700'}`}>
        {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#fff" />}
      </div>

      <div className={`flex flex-col gap-2 max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-5 py-4 rounded-2xl text-[13px] leading-relaxed shadow-sm border
          ${isUser
            ? 'bg-[#1A73E8] border-[#1A73E8] text-white rounded-tr-sm'
            : 'bg-white border-slate-100 text-slate-800 rounded-tl-sm'
          }`}>
          {msg.richContent ? <>{msg.richContent}</> : <MessageContent content={msg.content} />}
        </div>

        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {msg.actions.map((action) => {
              const isDirect = DIRECT_ACTIONS[action];
              return (
                <button
                  key={action}
                  onClick={() => onActionClick(action, msg)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-full transition-all
                    ${isDirect?.type === 'export_pdf'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : isDirect?.type === 'navigate'
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
                    }`}
                >
                  {getActionIcon(action)}
                  {action}
                </button>
              );
            })}
          </div>
        )}

        <span className="text-[10px] text-slate-400 font-semibold px-1">
          {new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// PDF Export Helpers
// ══════════════════════════════════════════════════════════════════════

const exportUnpaidBillsPDF = (bills, companyName) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const total = bills.reduce((s, b) => s + parseFloat(b.balanceDue || 0), 0);
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Header
  doc.setFontSize(16);
  doc.setTextColor(26, 115, 232);
  doc.setFont('helvetica', 'bold');
  doc.text('Unpaid Vendor Bills', 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  if (companyName) doc.text(`Company: ${companyName}`, 14, 25);
  doc.text(`Generated: ${today}`, 14, companyName ? 30 : 25);

  autoTable(doc, {
    startY: companyName ? 35 : 32,
    head: [['Vendor', 'Bill No.', 'Date', 'Due Date', 'Total Amount', 'Balance Due', 'Status']],
    body: bills.map(b => [
      b.vendorName || b.Ledger?.name || '—',
      b.billNumber || b.voucherNumber || '—',
      fmtDate(b.date),
      b.dueDate ? fmtDate(b.dueDate) : '—',
      fmtPlain(b.totalAmount),
      fmtPlain(b.balanceDue),
      b.status?.replace('_', ' ') || '—',
    ]),
    foot: [['', '', '', 'Total Payables', '', fmtPlain(total), '']],
    headStyles: { fillColor: [26, 115, 232], fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: [239, 246, 255], fontStyle: 'bold', textColor: [26, 115, 232], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right', textColor: [185, 28, 28], fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Unpaid_Vendor_Bills_${today.replace(/ /g, '_')}.pdf`);
};

const exportPayablesStatementPDF = (vendors, summary, companyName) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFontSize(16);
  doc.setTextColor(26, 115, 232);
  doc.setFont('helvetica', 'bold');
  doc.text('Vendor Payables Statement', 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  if (companyName) doc.text(`Company: ${companyName}`, 14, 25);
  doc.text(`Generated: ${today}`, 14, companyName ? 30 : 25);
  if (summary?.grandTotal != null) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text(`Grand Total Outstanding: ${fmtPlain(summary.grandTotal)}`, 14, companyName ? 35 : 32);
  }

  let currentY = companyName ? 42 : 38;

  for (const vendor of vendors) {
    if (vendor.bills.length === 0) continue;

    // Vendor name header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`${vendor.vendorName}   (Outstanding: ${fmtPlain(vendor.total)})`, 14, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [['Bill No.', 'Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Aging']],
      body: vendor.bills.map(b => [
        b.billNumber || '—',
        fmtDate(b.date),
        b.dueDate ? fmtDate(b.dueDate) : '—',
        fmtPlain(b.billAmount),
        fmtPlain(b.amountPaid),
        fmtPlain(b.balance),
        b.agingBucket || '—',
      ]),
      headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right', textColor: [22, 163, 74] },
        5: { halign: 'right', textColor: [185, 28, 28], fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });
    currentY = doc.lastAutoTable.finalY + 8;

    if (currentY > 180) {
      doc.addPage();
      currentY = 15;
    }
  }

  doc.save(`Payables_Statement_${today.replace(/ /g, '_')}.pdf`);
};

const exportLowStockPDF = (items, companyName) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFontSize(16);
  doc.setTextColor(26, 115, 232);
  doc.setFont('helvetica', 'bold');
  doc.text('Low Stock Report', 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  if (companyName) doc.text(`Company: ${companyName}`, 14, 25);
  doc.text(`Generated: ${today}`, 14, companyName ? 30 : 25);

  autoTable(doc, {
    startY: companyName ? 35 : 32,
    head: [['Item Name', 'Current Stock', 'Reorder Level', 'Unit', 'Status']],
    body: items.map(item => {
      const stock = parseFloat(item.currentStock || item.stock || 0);
      const reorder = parseFloat(item.reorderLevel || item.minStockLevel || 0);
      return [
        item.name,
        String(stock),
        String(reorder),
        item.unit || '—',
        stock <= 0 ? 'Out of Stock' : 'Low Stock',
      ];
    }),
    headStyles: { fillColor: [26, 115, 232], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 4: { textColor: [185, 28, 28], fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Low_Stock_Report_${today.replace(/ /g, '_')}.pdf`);
};

// ══════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════
const AIAssistantView = () => {
  const navigate = useNavigate();
  const user = (() => { try { return getUser(); } catch { return {}; } })();
  const role = (user.role || 'ADMIN').toLowerCase();
  const companyId = sessionStorage.getItem('companyId');
  const companyName = sessionStorage.getItem('companyName') || '';

  const [messages, setMessages] = useState([{
    id: 0, role: 'assistant',
    content: "👋 Welcome to your **Dedicated Tally AI Workspace**.\n\nI can help you build custom reports, create items, record invoices, analyze ledger groups, and guide you through Tally-to-Zoho workflows. What would you like to achieve today?",
    actions: [], ts: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Store latest fetched data so PDF export can access it
  const lastBillsRef = useRef([]);
  const lastStatementRef = useRef({ vendors: [], summary: {} });
  const lastLowStockRef = useRef([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Fetch functions ──────────────────────────────────────────────
  const fetchUnpaidBills = useCallback(async () => {
    if (!companyId) throw new Error('No company selected. Please select a company first.');
    const res = await purchaseAPI.getBills(companyId);
    const all = res.data || [];
    return all.filter(b => b.status === 'OPEN' || b.status === 'PARTIALLY_PAID' || b.balanceDue > 0);
  }, [companyId]);

  const fetchPayablesStatement = useCallback(async () => {
    if (!companyId) throw new Error('No company selected. Please select a company first.');
    const res = await reportsAPI.payablesReport(companyId);
    return res.data;
  }, [companyId]);

  const fetchLowStockItems = useCallback(async () => {
    if (!companyId) throw new Error('No company selected. Please select a company first.');
    const res = await inventoryAPI.getByCompany(companyId);
    const items = res.data || [];
    return items.filter(item => {
      const stock = parseFloat(item.currentStock || item.stock || 0);
      const reorder = parseFloat(item.reorderLevel || item.minStockLevel || 0);
      return reorder > 0 && stock <= reorder;
    });
  }, [companyId]);

  // ── Build rich messages ──────────────────────────────────────────
  const buildUnpaidBillsMessage = (bills) => {
    lastBillsRef.current = bills;
    const total = bills.reduce((s, b) => s + parseFloat(b.balanceDue || 0), 0);
    return {
      content: `📋 **Unpaid Vendor Bills (${bills.length})**`,
      richContent: (
        <>
          <div className="font-bold mb-2">📋 Unpaid Vendor Bills ({bills.length})</div>
          {bills.length === 0
            ? <div className="text-slate-500 italic">No unpaid vendor bills found. 🎉 All bills are settled!</div>
            : <UnpaidBillsTable bills={bills} total={total} />
          }
          {bills.length > 0 && (
            <div className="mt-2 text-[12px] text-slate-600">
              Shall I process payment vouchers for these bills?
            </div>
          )}
        </>
      ),
      actions: bills.length > 0
        ? ['Process Payment', 'View Statement', 'Export PDF', 'View Purchase Register']
        : ['View Purchase Register'],
    };
  };

  const buildStatementMessage = (data) => {
    lastStatementRef.current = data;
    const { vendors = [], summary = {} } = data;
    const nonEmpty = vendors.filter(v => Math.abs(v.total) >= 0.01 || v.bills.length > 0);
    return {
      content: `📊 **Vendor Payables Statement**`,
      richContent: (
        <>
          <div className="font-bold mb-2">📊 Vendor Payables Statement</div>
          {nonEmpty.length === 0
            ? <div className="text-slate-500 italic">No outstanding payables. All vendors are fully settled. ✅</div>
            : <PayablesStatementTable vendors={nonEmpty} summary={summary} />
          }
        </>
      ),
      actions: nonEmpty.length > 0
        ? ['Export PDF', 'Show Unpaid Vendor Bills', 'View Purchase Register']
        : ['View Purchase Register'],
    };
  };

  const buildLowStockMessage = (items) => {
    lastLowStockRef.current = items;
    return {
      content: `⚠️ **Low Stock Alert (${items.length} Items)**`,
      richContent: (
        <>
          <div className="font-bold mb-2">⚠️ Low Stock Alert ({items.length} Items)</div>
          {items.length === 0
            ? <div className="text-slate-500 italic">All items are adequately stocked. ✅</div>
            : (
              <DataTable
                headers={['Item', 'Current Stock', 'Reorder Level', 'Unit', 'Status']}
                rows={items.map(item => {
                  const stock = parseFloat(item.currentStock || item.stock || 0);
                  const reorder = parseFloat(item.reorderLevel || item.minStockLevel || 0);
                  return [
                    item.name,
                    `${stock} ${item.unit || ''}`.trim(),
                    `${reorder} ${item.unit || ''}`.trim(),
                    item.unit || '—',
                    stock <= 0 ? 'Out of Stock ❌' : 'Low Stock ⚠️',
                  ];
                })}
              />
            )
          }
        </>
      ),
      actions: items.length > 0
        ? ['Export List', 'Create Purchase Order', 'View Inventory']
        : ['View Inventory'],
    };
  };

  // ── Handle action button clicks ─────────────────────────────────
  const handleActionClick = useCallback((action, sourceMsg) => {
    const directAction = DIRECT_ACTIONS[action];

    if (directAction?.type === 'navigate') {
      navigate(directAction.path);
      return;
    }

    if (directAction?.type === 'export_pdf') {
      // Determine what data to export based on last context
      const lowerAction = action.toLowerCase();

      if (lowerAction.includes('list') || lastLowStockRef.current.length > 0) {
        // Try low stock first if action says "Export List"
        if (lowerAction === 'export list' && lastLowStockRef.current.length > 0) {
          exportLowStockPDF(lastLowStockRef.current, companyName);
          return;
        }
      }

      // Determine from last message context
      if (sourceMsg?.actions?.includes('Show Unpaid Vendor Bills') || sourceMsg?.actions?.includes('Process Payment')) {
        // Statement context → export statement PDF
        if (lastStatementRef.current?.vendors?.length > 0) {
          exportPayablesStatementPDF(lastStatementRef.current.vendors, lastStatementRef.current.summary, companyName);
          return;
        }
      }

      if (lastBillsRef.current.length > 0) {
        exportUnpaidBillsPDF(lastBillsRef.current, companyName);
        return;
      }
      if (lastStatementRef.current?.vendors?.length > 0) {
        exportPayablesStatementPDF(lastStatementRef.current.vendors, lastStatementRef.current.summary, companyName);
        return;
      }
      if (lastLowStockRef.current.length > 0) {
        exportLowStockPDF(lastLowStockRef.current, companyName);
        return;
      }

      // No data yet — ask to fetch first
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'user', content: action, ts: new Date(),
      }, {
        id: Date.now() + 1, role: 'assistant',
        content: `⚠️ No data to export yet.\n\nPlease first load the data by clicking **"Show Unpaid Vendor Bills"** or **"View Statement"**, then click **Export PDF** to download it.`,
        actions: ['Show Unpaid Vendor Bills', 'View Statement'],
        ts: new Date(),
      }]);
      return;
    }

    // Otherwise, treat as a chat message (fetches real data)
    sendMessage(action);
  }, [navigate, companyName]);

  // ── Main send handler ────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    setInput('');

    const userMsg = { id: Date.now(), role: 'user', content: trimmed, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const lower = trimmed.toLowerCase();
      let aiMsg;

      if (lower.includes('unpaid') && (lower.includes('vendor') || lower.includes('bill'))) {
        const bills = await fetchUnpaidBills();
        const built = buildUnpaidBillsMessage(bills);
        aiMsg = { id: Date.now() + 1, role: 'assistant', ...built, ts: new Date() };

      } else if (lower.includes('view statement') || lower === 'view statement' || lower === 'statement' || lower.includes('payable statement') || lower.includes('vendor statement')) {
        const data = await fetchPayablesStatement();
        const built = buildStatementMessage(data);
        aiMsg = { id: Date.now() + 1, role: 'assistant', ...built, ts: new Date() };

      } else if (lower.includes('low in stock') || lower.includes('low stock') || (lower.includes('products') && lower.includes('stock'))) {
        const items = await fetchLowStockItems();
        const built = buildLowStockMessage(items);
        aiMsg = { id: Date.now() + 1, role: 'assistant', ...built, ts: new Date() };

      } else if (AI_API_URL) {
        const res = await fetch(AI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, role }),
        });
        const responseData = await res.json();
        aiMsg = {
          id: Date.now() + 1, role: 'assistant',
          content: responseData.text || responseData.message || 'I could not process that request.',
          actions: responseData.actions || [],
          ts: new Date(),
        };

      } else {
        await new Promise(r => setTimeout(r, 600 + Math.random() * 300));
        aiMsg = buildFallbackResponse(trimmed);
      }

      setMessages(prev => [...prev, aiMsg]);

    } catch (err) {
      console.error('AI error:', err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        content: `⚠️ **Could not fetch data**\n\n${err?.message || 'An error occurred. Please ensure you are logged in and a company is selected.'}`,
        actions: ['Show Unpaid Vendor Bills', 'View Statement'],
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, role, fetchUnpaidBills, fetchPayablesStatement, fetchLowStockItems]);

  // ── Fallback responses ────────────────────────────────────────────
  const buildFallbackResponse = (text) => {
    const l = text.toLowerCase();
    if (l.includes('invoice') || l.includes('create invoice'))
      return { id: Date.now() + 1, role: 'assistant', content: `📄 **Create Invoice**\n\nTo create an invoice, go to **Sales → Invoices → New Invoice**. Fill in the customer, items, taxes and due date.\n\nShall I navigate you there?`, actions: ['Go to Invoices', 'View Reports'], ts: new Date() };
    if (l.includes('gst') || l.includes('gstr'))
      return { id: Date.now() + 1, role: 'assistant', content: `📊 **GST Reports**\n\nNavigate to **Tax → GST Reports** to view GSTR-1, GSTR-3B, and ITC summaries for the current period.\n\nWould you like help with GST reconciliation or filing?`, actions: ['View GST Reports', 'Reconcile ITC'], ts: new Date() };
    if (l.includes('p&l') || l.includes('profit') || l.includes('loss'))
      return { id: Date.now() + 1, role: 'assistant', content: `📈 **P&L Report**\n\nGo to **Reports → Profit & Loss** to view the income statement for any date range. You can filter by period and export to PDF or Excel.`, actions: ['View P&L', 'View Balance Sheet'], ts: new Date() };
    if (l.includes('payment') || l.includes('process payment'))
      return { id: Date.now() + 1, role: 'assistant', content: `💳 **Process Vendor Payment**\n\nTo record a vendor payment, go to **Purchases → Vendor Payments → New Payment**. Select the vendor and the bills to pay against.`, actions: ['Go to Payments Made', 'View Vendors'], ts: new Date() };
    if (l.includes('balance sheet'))
      return { id: Date.now() + 1, role: 'assistant', content: `📊 **Balance Sheet**\n\nView your Balance Sheet under **Reports → Balance Sheet** to see assets, liabilities, and equity as of any date.`, actions: ['View Balance Sheet', 'View P&L'], ts: new Date() };

    return {
      id: Date.now() + 1, role: 'assistant',
      content: `I'm here to help with your Tally accounting tasks. I can help you:\n\n- 📄 Create invoices, bills, and vouchers\n- 💰 Record payments and receipts\n- 📊 Generate GST reports and returns\n- 📈 Show P&L, balance sheet, trial balance\n- 🔄 Set up recurring transactions\n- 👥 Manage customers and vendors\n\nWhat would you like to do today?`,
      actions: ['Show Unpaid Vendor Bills', 'View Statement', 'Which products are low in stock?'],
      ts: new Date(),
    };
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#f8fafc] font-sans overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1A73E8] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-slate-900 tracking-tight leading-none">AI Command Center</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Intelligent Copilot for Accounting Workflows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Role: {role}
          </span>
        </div>
      </header>

      {/* Chat + Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#fdfdfe]/70 border-r border-slate-100">
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {messages.map(msg => (
              <ChatBubble key={msg.id} msg={msg} onActionClick={handleActionClick} />
            ))}
            {loading && (
              <div className="flex gap-4 animate-slide-up">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0">
                  <Bot size={16} color="#fff" />
                </div>
                <div className="px-5 py-4 bg-white rounded-2xl rounded-tl-sm border border-slate-100 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-8 py-5 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus-within:border-blue-400 focus-within:bg-white transition-all shadow-sm">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask Tally AI to draft vouchers, list transactions, find tax ratios..."
                disabled={loading}
                className="flex-1 bg-transparent text-[13.5px] text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="px-4 py-2 rounded-xl bg-[#1A73E8] text-white text-[12px] font-bold flex items-center gap-1.5 hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                Send
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2.5">
              {AI_API_URL ? 'Securely connected to cloud LLM engine' : 'Live data mode — connected to your accounting database.'}
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-[300px] shrink-0 bg-white p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">Suggested Prompts</h3>
          </div>
          <div className="space-y-2.5">
            {AI_SUGGESTION_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="w-full text-left p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] text-slate-700 font-semibold hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 transition-all leading-normal"
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">Quick Actions</h4>
            <div className="space-y-2">
              {[
                { label: 'Bills & Payables', path: '/bills', icon: <FileText size={13} /> },
                { label: 'Vendors List', path: '/vendors', icon: <ExternalLink size={13} /> },
                { label: 'Payments Made', path: '/payments-made', icon: <ExternalLink size={13} /> },
                { label: 'Payables Report', path: '/reports/pl', icon: <ExternalLink size={13} /> },
              ].map(({ label, path, icon }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11.5px] text-slate-600 font-semibold hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">Capabilities</h4>
            <ul className="text-[11.5px] text-slate-500 space-y-2 leading-relaxed list-disc list-inside">
              <li>Formulate and record transactions</li>
              <li>Filter receivables/payables aging</li>
              <li>Synthesize tax summaries</li>
              <li>Resolve ledger account groups</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantView;
