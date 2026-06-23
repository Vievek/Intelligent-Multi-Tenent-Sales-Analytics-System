import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency, truncateText } from '../../utils/formatters';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fb7185', '#f59e0b', '#10b981'];

const TopProductsChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        No product data available
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    product: truncateText(item.product || 'Unknown', 15),
    revenue: item.totalRevenue || 0,
  })).sort((a, b) => b.revenue - a.revenue);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0]?.payload;
    if (!data) return null;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
        <p className="font-medium text-gray-700">{data.product}</p>
        <p className="text-gray-600">Revenue: {formatCurrency(data.revenue)}</p>
        <p className="text-gray-600">Quantity: {data.totalQuantity || 0}</p>
        <p className="text-gray-600">Sales: {data.count || 0}</p>
      </div>
    );
  };

  const formatYAxis = (value) => {
    if (value >= 1000000) return `${value / 1000000}M`;
    if (value >= 1000) return `${value / 1000}K`;
    return value;
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" stroke="#9ca3af" fontSize={11} tickFormatter={formatYAxis} />
        <YAxis type="category" dataKey="product" stroke="#9ca3af" fontSize={11} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopProductsChart;
