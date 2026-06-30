import React from 'react';
import { Sparkles, Cpu, AlertTriangle } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';

export default function SalesTable({ sales = [], loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-500">
        <span className="text-3xl mb-2">🛒</span>
        <p className="text-sm">No sales records found</p>
      </div>
    );
  }

  return (
    <div className="table-container no-scrollbar">
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total Value</th>
            <th>Agent</th>
            <th>Confidence</th>
            <th>Method</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => {
            const hasHigh = sale.confidence === 'HIGH';
            const hasMedium = sale.confidence === 'MEDIUM';

            return (
              <tr key={sale.id}>
                <td className="font-semibold text-white truncate max-w-[150px]" title={sale.product}>
                  {sale.product}
                </td>
                <td className="tabular-nums">{sale.quantity}</td>
                <td className="tabular-nums">{formatCurrency(sale.price)}</td>
                <td className="font-bold text-white tabular-nums">
                  {formatCurrency(sale.totalValue || sale.quantity * sale.price)}
                </td>
                <td className="font-mono text-xs text-slate-400">
                  Agent-{sale.agentId ? String(sale.agentId).slice(-4) : '????'}
                </td>
                <td>
                  <span className={`badge ${
                    hasHigh ? 'badge-success' : hasMedium ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {sale.confidence || 'LOW'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${
                    sale.extractionMethod === 'huggingface' ? 'badge-primary' : 'badge-accent'
                  }`}>
                    <span className="mr-1">
                      {sale.extractionMethod === 'huggingface' ? (
                        <Cpu className="w-3 h-3 inline" />
                      ) : (
                        <Sparkles className="w-3 h-3 inline" />
                      )}
                    </span>
                    {sale.extractionMethod === 'huggingface' ? 'BERT' : 'Gemini'}
                  </span>
                </td>
                <td className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDate(sale.date?.toDate ? sale.date.toDate() : sale.date)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
