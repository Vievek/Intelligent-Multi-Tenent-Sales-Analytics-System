import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Trash2, Edit2, ShoppingBag } from 'lucide-react';

export default function ExtendedSalesTable({ sales, loading, onDelete, onEdit }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-500">
        <span className="animate-pulse">Loading transaction journals...</span>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-600">
        <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No recorded transactions for this tenant space yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
            <th className="py-3 px-4">Date</th>
            <th className="py-3 px-4">Product</th>
            <th className="py-3 px-4">Qty</th>
            <th className="py-3 px-4">Price</th>
            <th className="py-3 px-4">Total</th>
            <th className="py-3 px-4">Agent ID</th>
            <th className="py-3 px-4">Method</th>
            <th className="py-3 px-4">Confidence</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-300 text-sm">
          {sales.map((sale) => {
            const dateStr = sale.date?.seconds
              ? formatDate(new Date(sale.date.seconds * 1000).toISOString())
              : formatDate(sale.date);
            return (
              <tr key={sale.id} className="hover:bg-white/3 transition-colors">
                <td className="py-3 px-4 font-mono text-xs">{dateStr}</td>
                <td className="py-3 px-4 font-semibold text-white">{sale.product}</td>
                <td className="py-3 px-4">{sale.quantity}</td>
                <td className="py-3 px-4">{formatCurrency(sale.price)}</td>
                <td className="py-3 px-4 font-semibold text-emerald-400">{formatCurrency(sale.totalValue)}</td>
                <td className="py-3 px-4 font-mono text-xs">{sale.agentId}</td>
                <td className="py-3 px-4 text-xs capitalize">{sale.extractionMethod || 'manual'}</td>
                <td className="py-3 px-4">
                  <span className={`badge ${
                    sale.confidence === 'HIGH' ? 'badge-success' :
                    sale.confidence === 'MEDIUM' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {sale.confidence || 'HIGH'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(sale)}
                      className="btn-icon hover:text-primary-400"
                      title="Edit Sale"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(sale)}
                      className="btn-icon hover:text-rose-400"
                      title="Delete Sale"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
