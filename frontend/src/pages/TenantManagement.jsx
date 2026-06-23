import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTenants } from '../hooks/useTenants';
import Layout from '../components/ui/Layout';
import CreateTenantForm from '../components/forms/CreateTenantForm';
import TenantTable from '../components/tables/TenantTable';

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
      setSuccess(`Tenant "${result.name}" created successfully! Code: ${result.tenantCode}`);
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Failed to create tenant');
    }
  };

  const handleToggleStatus = async (tenant) => {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
            <p className="text-gray-500">Create and manage tenant accounts</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancel' : '+ New Tenant'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {showForm && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Tenant</h2>
            <CreateTenantForm onSubmit={handleCreateTenant} onCancel={() => setShowForm(false)} />
          </div>
        )}

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Tenants</h2>
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
