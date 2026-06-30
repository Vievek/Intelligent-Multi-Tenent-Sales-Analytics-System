import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-800 border border-white/10 rounded-xl px-4 py-3 shadow-card-dark">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className="text-sm font-bold text-white">
          Revenue: ${payload[0]?.value?.toLocaleString() || 0}
        </p>
        {payload[1] && (
          <p className="text-xs text-primary-400 mt-0.5">
            Qty: {payload[1]?.value}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function TopProductsChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600">
        <div className="text-center">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-sm">No products yet</p>
        </div>
      </div>
    );
  }

  const top5 = data.slice(0, 5).map(d => ({
    name: d.product || d.name || 'Unknown',
    revenue: d.totalRevenue || d.revenue || 0,
    quantity: d.totalQuantity || d.quantity || 0,
  }));

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 5, left: 10, bottom: 0 }}>
          <defs>
            {COLORS.map((color, i) => (
              <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                <stop offset="100%" stopColor={color} stopOpacity={0.4} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={20}>
            {top5.map((_, index) => (
              <Cell key={index} fill={`url(#barGrad${index % COLORS.length})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
