import React from 'react';
import { FileText, Send, CheckCircle2, Wallet, Ban } from 'lucide-react';

const ApprovalTracker = ({ status = 'Draft' }) => {
  const steps = [
    { label: 'Draft', key: 'Draft', icon: FileText, color: 'text-slate-500 bg-slate-50 border-slate-200' },
    { label: 'Submitted', key: 'Submitted', icon: Send, color: 'text-amber-500 bg-amber-50 border-amber-200' },
    { label: 'Approved', key: 'Approved', icon: CheckCircle2, color: 'text-blue-500 bg-blue-50 border-blue-200' },
    { label: 'Paid', key: 'Paid', icon: Wallet, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' }
  ];

  const currentIdx = steps.findIndex(s => s.key.toLowerCase() === status?.toLowerCase());
  const isVoided = status?.toLowerCase() === 'voided';

  if (isVoided) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/50 text-rose-600 animate-pulse">
        <Ban size={20} className="shrink-0" />
        <span className="text-[13px] font-black tracking-wider uppercase">This invoice has been voided</span>
      </div>
    );
  }

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between relative max-w-2xl">
        {/* Connection line background */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full" />
        
        {/* Active connection line */}
        {currentIdx > 0 && (
          <div 
            className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500" 
            style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
          />
        )}

        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx <= currentIdx;
          const isActive = idx === currentIdx;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div 
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300
                  ${isActive ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-500/20' : 
                    isCompleted ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                <StepIcon size={18} />
              </div>
              <span className={`text-[11px] font-black tracking-tight mt-2 uppercase
                ${isActive ? 'text-blue-600 font-black' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalTracker;
