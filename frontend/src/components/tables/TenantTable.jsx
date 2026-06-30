import React from 'react';
import { ToggleLeft, ToggleRight, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function TenantTable({ tenants = [], loading, onToggleStatus, onDelete }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-500">
        <span className="text-3xl mb-2">🏢</span>
        <p className="text-sm">No tenants registered yet</p>
      </div>
    );
  }

  return (
    <div className="table-container no-scrollbar">
      <table className="table">
        <thead>
          <tr>
            <th>Business Name</th>
            <th>Email</th>
            <th>Tenant Code</th>
            <th>Status</th>
            <th>Created At</th>
            {onToggleStatus && onDelete && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => {
            const isActive = tenant.status === 'active';

            return (
              <tr key={tenant.id}>
                <td className="font-semibold text-white">{tenant.name}</td>
                <td className="text-slate-300">{tenant.email}</td>
                <td>
                  <code className="px-2.5 py-1 rounded bg-slate-800 text-primary-300 font-mono text-sm border border-slate-700/50">
                    {tenant.tenantCode}
                  </code>
                </td>
                <td>
                  <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                    <span className="relative flex h-1.5 w-1.5 mr-1.5">
                      {isActive && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                        isActive ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}></span>
                    </span>
                    {tenant.status}
                  </span>
                </td>
                <td className="text-xs text-slate-400">
                  {formatDate(tenant.createdAt?.toDate ? tenant.createdAt.toDate() : tenant.createdAt)}
                </td>
                {onToggleStatus && onDelete && (
                  <td className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => onToggleStatus(tenant)}
                        className={`p-1.5 rounded-lg border transition-all duration-200 ${
                          isActive
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'
                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40'
                        }`}
                        title={isActive ? 'Deactivate Tenant' : 'Activate Tenant'}
                      >
                        {isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => onDelete(tenant)}
                        className="p-1.5 rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-all duration-200"
                        title="Delete Tenant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
