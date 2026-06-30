import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSales } from '../hooks/useSales';
import { useAgents } from '../hooks/useAgents';
import { useTenants } from '../hooks/useTenants';
import Layout from '../components/ui/Layout';
import ExtendedSalesTable from '../components/tables/ExtendedSalesTable';
import SaleForm from '../components/forms/SaleForm';
import { Plus, X, AlertCircle, CheckCircle, Info, ChevronDown, Building2 } from 'lucide-react';

export default function SalesManagement() {
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { tenants } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const effectiveTenantId = isAdmin ? selectedTenantId : user?.tenantId;

  // Retrieve sales and hooks
  const {
    sales,
    loading,
    error,
    createSale,
    updateSale,
    deleteSale,
  } = useSales(effectiveTenantId ? { tenantId: effectiveTenantId, limit: 100 } : { limit: 0 });

  // Retrieve agents for assignment dropdown select
  const { agents } = useAgents(effectiveTenantId);

  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleCreateOrUpdate = async (data) => {
    setLocalError(null);
    setSuccess(null);
    try {
      if (editingSale) {
        await updateSale(editingSale.id, data);
        setSuccess(`Manual sale journal updated successfully.`);
      } else {
        await createSale(data);
        setSuccess(`New transaction recorded successfully.`);
      }
      setShowForm(false);
      setEditingSale(null);
    } catch (err) {
      setLocalError(err.message || 'Operation failed');
    }
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setShowForm(true);
  };

  const handleDelete = async (sale) => {
    setLocalError(null);
    setSuccess(null);
    if (!confirm(`Are you sure you want to delete this sale transaction record?`)) {
      return;
    }
    try {
      await deleteSale(sale.id);
      setSuccess(`Transaction entry deleted successfully.`);
    } catch (err) {
      setLocalError(err.message || 'Failed to delete transaction record');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSale(null);
  };

  return (
    <Layout user={user} onSignOut={signOut}>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Sales Ledger</h1>
            <p className="page-subtitle">Track, record manually, or audit transaction journals</p>
          </div>
          {(effectiveTenantId && effectiveTenantId !== 'invalid') && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Record Sale</>}
            </button>
          )}
        </div>

        {/* Super admin tenant selector */}
        {isAdmin && (
          <div className="card flex items-center gap-4 flex-wrap">
            <Building2 className="w-5 h-5 text-primary-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Select Tenant Context</p>
              <div className="relative">
                <select
                  value={selectedTenantId}
                  onChange={(e) => {
                    setSelectedTenantId(e.target.value);
                    handleCancel();
                  }}
                  className="input pr-8 appearance-none"
                >
                  <option value="">— Select tenant to manage sales —</option>
                  {tenants.filter(t => t.status === 'active').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.tenantCode})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {(error || localError) && (
          <div className="alert-error flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{localError || error}</span>
          </div>
        )}

        {success && (
          <div className="alert-success flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form Panel */}
        {showForm && (
          <div className="card animate-slide-up">
            <div className="flex items-center gap-2 mb-4 text-white font-bold">
              <Info className="w-5 h-5 text-primary-400" />
              <h2>{editingSale ? 'Edit Transaction Details' : 'Record New Transaction Manually'}</h2>
            </div>
            <SaleForm
              initialData={editingSale || {}}
              agents={agents}
              onSubmit={handleCreateOrUpdate}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Main List */}
        {!effectiveTenantId ? (
          <div className="card text-center py-10 text-slate-500">
            Please select a tenant context above to view sales ledger.
          </div>
        ) : (
          <div className="card animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Recorded Transactions</h2>
              <span className="badge badge-muted">{sales.length} records</span>
            </div>
            <ExtendedSalesTable
              sales={sales}
              loading={loading}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
