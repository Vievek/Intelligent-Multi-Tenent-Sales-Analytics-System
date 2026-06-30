import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTenants } from '../hooks/useTenants';
import Layout from '../components/ui/Layout';
import CreateTenantForm from '../components/forms/CreateTenantForm';
import TenantTable from '../components/tables/TenantTable';
import { Plus, X, ShieldAlert, CheckCircle, Info } from 'lucide-react';

export default function TenantManagement() {
  const { user, signOut } = useAuth();
  const { tenants, loading, createTenant, updateTenant, deactivateTenant, activateTenant, deleteTenant } = useTenants();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleCreateTenant = async (data) => {
    setError(null);
    setSuccess(null);
    try {
      const result = await createTenant(data);
      setSuccess(`Tenant "${result.name}" created successfully!`);
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Failed to create tenant');
    }
  };

  const handleToggleStatus = async (tenant) => {
    setError(null);
    setSuccess(null);
    try {
      if (tenant.status === 'active') {
        await deactivateTenant(tenant.id);
        setSuccess(`Tenant "${tenant.name}" deactivated`);
      } else {
        await activateTenant(tenant.id);
        setSuccess(`Tenant "${tenant.name}" activated`);
      }
    } catch (err) {
      setError(err.message || 'Failed to update tenant status');
    }
  };

  const handleDeleteTenant = async (tenant) => {
    setError(null);
    setSuccess(null);
    if (!confirm(`Are you sure you want to delete "${tenant.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteTenant(tenant.id);
      setSuccess(`Tenant "${tenant.name}" deleted`);
    } catch (err) {
      setError(err.message || 'Failed to delete tenant');
    }
  };

  return (
    <Layout user={user} onSignOut={signOut}>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Tenant Management</h1>
            <p className="page-subtitle">Add, deactivate, or purge tenant spaces from the database</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> New Tenant
              </>
            )}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert-error flex items-center gap-3 animate-fade-in">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-success flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form Panel */}
        {showForm && (
          <div className="card animate-slide-up">
            <div className="flex items-center gap-2 mb-4 text-white font-bold">
              <Info className="w-5 h-5 text-primary-400" />
              <h2>Configure New Tenant Profile</h2>
            </div>
            <CreateTenantForm onSubmit={handleCreateTenant} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* List Card */}
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">All Tenant Listings</h2>
            <span className="badge badge-muted">{tenants.length} profiles</span>
          </div>
          <TenantTable
            tenants={tenants}
            loading={loading}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteTenant}
          />
        </div>
      </div>
    </Layout>
  );
}
