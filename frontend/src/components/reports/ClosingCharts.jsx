import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

export const SalesVsPurchaseChart = ({ data = [] }) => {
  const defaultData = [
    { name: 'M-2', Sales: 0, Purchases: 0 },
    { name: 'M-1', Sales: 0, Purchases: 0 },
    { name: 'This', Sales: 0, Purchases: 0 }
  ];

  const chartData = data.length > 0 ? data : defaultData;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
        <Bar dataKey="Sales" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />
        <Bar dataKey="Purchases" fill="#9333ea" radius={[4, 4, 0, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const GSTTrendChart = ({ data = [] }) => {
  const defaultData = [
    { name: 'M-2', Output: 0, Input: 0 },
    { name: 'M-1', Output: 0, Input: 0 },
    { name: 'This', Output: 0, Input: 0 }
  ];

  const chartData = data.length > 0 ? data : defaultData;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
        <Line type="monotone" dataKey="Output" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="Input" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const WithholdingTrendChart = ({ data = [] }) => {
  const defaultData = [
    { name: 'M-2', TDS: 0, TCS: 0 },
    { name: 'M-1', TDS: 0, TCS: 0 },
    { name: 'This', TDS: 0, TCS: 0 }
  ];

  const chartData = data.length > 0 ? data : defaultData;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
        <Area type="monotone" dataKey="TDS" stroke="#f59e0b" fill="rgba(245, 158, 11, 0.1)" strokeWidth={2} />
        <Area type="monotone" dataKey="TCS" stroke="#ec4899" fill="rgba(236, 72, 153, 0.1)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
};
