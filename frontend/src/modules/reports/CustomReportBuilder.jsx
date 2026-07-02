import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Save, Play, Code } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import QueryRuleBuilder from './QueryRuleBuilder';

const MODULES = [
  { id: 'sales', label: 'Sales (Invoices)' },
  { id: 'purchases', label: 'Purchases (Orders)' },
  { id: 'inventory', label: 'Inventory (Items)' },
  { id: 'ledgers', label: 'Ledgers (Accounts)' },
  { id: 'projects', label: 'Projects' }
];

// Helper to generate SQL-like preview
const generateSqlPreview = (node) => {
  if (!node || !node.rules) return '';
  if (node.rules.length === 0) return '';
  
  const parts = node.rules.map(rule => {
    if (rule.combinator) {
      const childSql = generateSqlPreview(rule);
      return childSql ? `(${childSql})` : '';
    } else {
      const val = rule.operator === 'IN' || rule.operator === 'LIKE' || isNaN(rule.value) 
        ? `'${rule.value}'` 
        : rule.value;
      return `${rule.field} ${rule.operator} ${val}`;
    }
  }).filter(Boolean);

  if (parts.length === 0) return '';
  return parts.join(` ${node.combinator.toUpperCase()} `);
};

export default function CustomReportBuilder({ companyId }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [module, setModule] = useState('sales');
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  
  // Advanced Filter Tree State
  const [filterTree, setFilterTree] = useState({ combinator: 'and', rules: [] });
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reportName, setReportName] = useState('');

  useEffect(() => {
    // If coming from Saved Reports, load the configuration
    if (location.state?.report) {
      const r = location.state.report;
      setModule(r.module);
      setReportName(r.name);
      
      const config = r.reportConfig || {};
      
      // Load filters (handle backward compatibility for old flat arrays)
      if (Array.isArray(config.filters)) {
        setFilterTree({ combinator: 'and', rules: config.filters });
      } else if (config.filters && config.filters.combinator) {
        setFilterTree(config.filters);
      } else {
        setFilterTree({ combinator: 'and', rules: [] });
      }

      // Need to fetch columns for this module before setting selected, 
      // otherwise checkboxes won't render if module changed.
      fetchColumns(r.module).then(() => {
        if (config.columns) {
          setSelectedColumns(config.columns);
        }
      });
      
      // Clear state so a refresh doesn't keep reloading it
      window.history.replaceState({}, document.title)
    } else {
      fetchColumns(module);
      setFilterTree({ combinator: 'and', rules: [] });
    }
  }, [module]);

  const fetchColumns = async (mod) => {
    try {
      const res = await reportsAPI.getValidColumns(mod);
      setAvailableColumns(res.data);
      setSelectedColumns(res.data.slice(0, 5));
    } catch (err) {
      setError('Failed to fetch columns for ' + mod);
    }
  };

  const handleColumnToggle = (col) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter(c => c !== col));
    } else {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  const handleRunReport = async () => {
    // Validate empty groups before running
    const hasEmptyGroups = (node) => {
      if (node.combinator && node.rules.length === 0) return true;
      if (node.combinator) return node.rules.some(hasEmptyGroups);
      return false;
    };

    if (hasEmptyGroups(filterTree)) {
      setError('Cannot run query: One or more filter groups are empty.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = { module, columns: selectedColumns, filters: filterTree };
      const res = await reportsAPI.runCustomReport(companyId, payload);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to run report');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }
    
    try {
      const payload = {
        name: reportName,
        module,
        reportConfig: { columns: selectedColumns, filters: filterTree },
        isScheduled: false
      };
      await reportsAPI.createSavedReport(companyId, payload);
      setShowSaveModal(false);
      navigate('/reports/saved');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save report');
    }
  };

  const columnDefs = selectedColumns.map(col => ({
    field: col,
    headerName: col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    sortable: true,
    filter: true,
    resizable: true
  }));

  const sqlPreview = generateSqlPreview(filterTree);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Advanced Query Engine</h1>
          <p className="text-sm text-slate-500 mt-1">Design complex queries with nested groups and relational data.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSaveModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Template
          </button>
          <button
            onClick={handleRunReport}
            className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Play className="w-4 h-4" /> Run Query
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-800 mb-3">1. Data Source</label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full rounded-lg border-slate-300 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 font-medium"
            >
              {MODULES.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
            <label className="block text-sm font-bold text-slate-800 mb-3">2. Output Columns</label>
            <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              {availableColumns.map(col => (
                <label key={col} className="flex items-center gap-3 text-sm text-slate-700 hover:bg-slate-50 p-2 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col)}
                    onChange={() => handleColumnToggle(col)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="truncate font-medium">{col}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Area: Advanced Rule Builder & Results */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 lg:p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 mb-4">3. Advanced Rule Builder</h3>
              <QueryRuleBuilder
                node={filterTree}
                onChange={setFilterTree}
                availableColumns={availableColumns}
              />
            </div>
            {/* SQL Preview */}
            <div className="bg-slate-900 p-4 border-t border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Code className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Query Preview</span>
              </div>
              <div className="text-slate-300 font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap">
                <span className="text-blue-400">SELECT</span> {selectedColumns.slice(0, 3).join(', ')}{selectedColumns.length > 3 ? ', ...' : ''} <br/>
                <span className="text-blue-400">FROM</span> {module.toUpperCase()}<br/>
                {sqlPreview ? (
                  <>
                    <span className="text-emerald-400">WHERE</span> {sqlPreview}
                  </>
                ) : (
                  <span className="text-slate-500 italic">-- No filters applied. Querying all records --</span>
                )}
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '400px' }}>
            <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm z-10">
              <h3 className="text-sm font-bold text-slate-800">4. Execution Results</h3>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{data.length} records returned</span>
            </div>
            <div className="flex-1 ag-theme-alpine w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-slate-600">Executing Query Engine...</span>
                  </div>
                </div>
              ) : (
                <AgGridReact
                  rowData={data}
                  columnDefs={columnDefs}
                  defaultColDef={{ sortable: true, filter: true, resizable: true }}
                  pagination={true}
                  paginationPageSize={20}
                  suppressCellFocus={true}
                  overlayNoRowsTemplate={data.length === 0 ? "No data found matching criteria" : ""}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Save Report Template</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Report Name</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="e.g., Q3 High Value Invoices"
                  className="w-full rounded-lg border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 shadow-sm h-10"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSaveReport} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors">Save Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
