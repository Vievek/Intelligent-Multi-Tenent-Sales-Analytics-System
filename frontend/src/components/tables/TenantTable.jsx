import React from 'react';
import { formatDate, getStatusColor } from '../../utils/formatters';

const TenantTable = ({ tenants, loading, onToggleStatus, onDelete }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
        Loading tenants...
      </div>
    );
  }

  if (!tenants || tenants.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
        No tenants created yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-2 font-medium text-gray-500">Business Name</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Tenant Code</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500 hidden md:table-cell">Email</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500 hidden lg:table-cell">Created</th>
            <th className="text-center py-3 px-2 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
              <td className="py-2 px-2 text-gray-800 font-medium">
                {tenant.name || 'Unnamed'}
              </td>
              <td className="py-2 px-2 font-mono text-sm text-gray-600">
                {tenant.tenantCode || '—'}
              </td>
              <td className="py-2 px-2 text-gray-600 hidden md:table-cell">
                {tenant.email || '—'}
              </td>
              <td className="py-2 px-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(tenant.status)}`}>
                  {tenant.status || 'unknown'}
                </span>
              </td>
              <td className="py-2 px-2 text-gray-500 text-xs hidden lg:table-cell">
                {formatDate(tenant.createdAt)}
              </td>
              <td className="py-2 px-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  {onToggleStatus && (
                    <button
                      onClick={() => onToggleStatus(tenant)}
                      className={`px-2 py-1 rounded text-xs font-medium transition ${
                        tenant.status === 'active'
                          ? 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                          : 'text-green-700 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {tenant.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(tenant)}
                      className="px-2 py-1 rounded text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TenantTable;
