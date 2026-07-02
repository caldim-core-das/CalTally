import React from 'react';
import { Plus, Trash2, GitBranch } from 'lucide-react';

const OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'IN'];

export default function QueryRuleBuilder({ node, onChange, onDelete, depth = 0, availableColumns }) {
  if (depth > 8) return <div className="text-red-500 text-xs">Maximum nesting depth (8) reached.</div>;

  if (node.combinator) {
    const handleCombinatorChange = (c) => onChange({ ...node, combinator: c });
    const handleAddRule = () => {
      onChange({ ...node, rules: [...node.rules, { field: availableColumns[0] || '', operator: '=', value: '' }] });
    };
    const handleAddGroup = () => {
      onChange({ ...node, rules: [...node.rules, { combinator: 'and', rules: [{ field: availableColumns[0] || '', operator: '=', value: '' }] }] });
    };
    const handleRuleChange = (idx, newRule) => {
      const newRules = [...node.rules];
      newRules[idx] = newRule;
      onChange({ ...node, rules: newRules });
    };
    const handleRuleDelete = (idx) => {
      const newRules = node.rules.filter((_, i) => i !== idx);
      onChange({ ...node, rules: newRules });
    };

    return (
      <div className={`p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ${depth > 0 ? 'ml-6 relative before:absolute before:left-[-1.5rem] before:top-6 before:w-6 before:h-px before:bg-slate-300 before:content-[""] border-l-4 border-l-emerald-400' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 bg-slate-100 rounded-md p-1 shadow-inner border border-slate-200">
            <button
              onClick={() => handleCombinatorChange('and')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${node.combinator === 'and' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              AND
            </button>
            <button
              onClick={() => handleCombinatorChange('or')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${node.combinator === 'or' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              OR
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddRule} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 bg-white border border-slate-300 rounded-lg shadow-sm text-slate-700 hover:bg-slate-50 transition-colors">
              <Plus className="w-3 h-3 text-emerald-600" /> Rule
            </button>
            {depth < 7 && (
              <button onClick={handleAddGroup} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 bg-white border border-slate-300 rounded-lg shadow-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <GitBranch className="w-3 h-3 text-blue-600" /> Group
              </button>
            )}
            {depth > 0 && onDelete && (
              <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-2 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {node.rules.length === 0 ? (
          <p className="text-xs font-medium text-red-500 bg-red-50 p-2 rounded-lg border border-red-100 italic">Group must contain at least one rule.</p>
        ) : (
          <div className="space-y-3 relative">
            {node.rules.map((rule, idx) => (
              <QueryRuleBuilder
                key={idx}
                node={rule}
                depth={depth + 1}
                availableColumns={availableColumns}
                onChange={(newRule) => handleRuleChange(idx, newRule)}
                onDelete={() => handleRuleDelete(idx)}
              />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    // Leaf node (rule)
    return (
      <div className="flex items-center gap-2 lg:gap-3 relative group">
        {depth > 0 && <div className="absolute left-[-1.5rem] top-1/2 w-6 h-px bg-slate-300 hidden md:block"></div>}
        <select
          value={node.field}
          onChange={(e) => onChange({ ...node, field: e.target.value })}
          className="rounded-lg border-slate-300 text-sm focus:ring-emerald-500 focus:border-emerald-500 flex-1 shadow-sm bg-white"
        >
          {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
        </select>
        <select
          value={node.operator}
          onChange={(e) => onChange({ ...node, operator: e.target.value })}
          className="rounded-lg border-slate-200 text-sm font-bold text-slate-700 focus:ring-emerald-500 focus:border-emerald-500 w-20 lg:w-24 shadow-sm bg-slate-50 text-center"
        >
          {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
        <input
          type="text"
          placeholder="Enter value..."
          value={node.value}
          onChange={(e) => onChange({ ...node, value: e.target.value })}
          className="rounded-lg border-slate-300 text-sm focus:ring-emerald-500 focus:border-emerald-500 flex-1 shadow-sm"
        />
        <button onClick={onDelete} className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }
}
