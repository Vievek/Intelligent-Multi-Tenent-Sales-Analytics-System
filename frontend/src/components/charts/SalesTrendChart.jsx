import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const SalesTrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        No sales data available
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    date: item.key || item.date,
    revenue: item.revenue || 0,
    count: item.count || 0,
  }));

  const formatXAxis = (tick) => {
    if (!tick) return '';
    const parts = tick.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return tick;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
        <p className="font-medium text-gray-700">{label}</p>
        <p className="text-gray-600">Revenue: {formatCurrency(payload[0]?.value || 0)}</p>
        <p className="text-gray-600">Sales: {payload[1]?.value || 0}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9ca3af" fontSize={11} />
        <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `$${v}`} />
        <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: '#3b82f6' }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="count"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: '#10b981' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SalesTrendChart;
