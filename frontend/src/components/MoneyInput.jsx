import React, { useState } from 'react';

export const formatIndianRupee = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '₹0.00';
  
  // Format to Indian numbering system (Lakh/Crore format)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

const MoneyInput = ({ value, onChange, placeholder = '0.00', className = '', ...props }) => {
  const [focused, setFocused] = useState(false);
  const displayValue = value ? formatIndianRupee(value) : '';

  const handleInputChange = (e) => {
    // Only allow numbers and decimal point
    const cleanValue = e.target.value.replace(/[^0-9.]/g, '');
    onChange(cleanValue);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center relative rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200 bg-white">
        <span className="pl-3.5 text-slate-400 font-bold shrink-0">₹</span>
        <input
          type="text"
          value={focused ? value : (value ? parseFloat(value).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '')}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`w-full py-3.5 pl-2 pr-4 bg-transparent rounded-xl text-slate-900 font-bold outline-none text-[15px] ${className}`}
          {...props}
        />
      </div>
      {value && focused && (
        <div className="absolute left-0 mt-1.5 px-3 py-1 bg-slate-900 text-white text-[11px] font-black rounded-lg shadow-md tracking-wider uppercase animate-fade-in z-10">
          Preview: {displayValue}
        </div>
      )}
    </div>
  );
};

export default MoneyInput;
