import React, { useState } from 'react';
import { formatDate, formatCurrency, getConfidenceColor, getConfidenceLabel, getExtractionMethodLabel, truncateText } from '../../utils/formatters';

const SalesTable = ({ sales, loading }) => {
  const [filter, setFilter] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
        Loading sales...
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
        No sales recorded yet
      </div>
    );
  }

  const filteredSales = filter
    ? sales.filter(s =>
        (s.product || '').toLowerCase().includes(filter.toLowerCase()) ||
        (s.agentId || '').toLowerCase().includes(filter.toLowerCase())
      )
    : sales;

  const displayedSales = filteredSales.slice(0, 50);

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          placeholder="Filter by product or agent..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500">Product</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Qty</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Unit Price</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Total</th>
              <th className="text-center py-3 px-2 font-medium text-gray-500">Confidence</th>
              <th className="text-center py-3 px-2 font-medium text-gray-500 hidden md:table-cell">Method</th>
            </tr>
          </thead>
          <tbody>
            {displayedSales.map((sale) => (
              <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="py-2 px-2 text-gray-600 whitespace-nowrap">
                  {formatDate(sale.date)}
                </td>
                <td className="py-2 px-2 text-gray-800 font-medium">
                  {truncateText(sale.product || 'Unknown', 20)}
                </td>
                <td className="py-2 px-2 text-right text-gray-600">
                  {sale.quantity || 0}
                </td>
                <td className="py-2 px-2 text-right text-gray-600">
                  {formatCurrency(sale.price)}
                </td>
                <td className="py-2 px-2 text-right text-gray-800 font-medium">
                  {formatCurrency(sale.totalValue || sale.quantity * sale.price)}
                </td>
                <td className="py-2 px-2 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(sale.confidence)}`}>
                    {getConfidenceLabel(sale.confidence)}
                  </span>
                </td>
                <td className="py-2 px-2 text-center text-gray-500 text-xs hidden md:table-cell">
                  {getExtractionMethodLabel(sale.extractionMethod)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredSales.length > 50 && (
          <p className="text-xs text-gray-400 mt-3">Showing 50 of {filteredSales.length} sales</p>
        )}
      </div>
    </div>
  );
};

export default SalesTable;
