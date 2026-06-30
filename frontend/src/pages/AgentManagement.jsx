import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAgents } from '../hooks/useAgents';
import { useTenants } from '../hooks/useTenants';
import Layout from '../components/ui/Layout';
import AgentTable from '../components/tables/AgentTable';
import AgentForm from '../components/forms/AgentForm';
import { Plus, X, AlertCircle, CheckCircle, Info, ChevronDown, Building2 } from 'lucide-react';

export default function AgentManagement() {
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { tenants } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState('');

  // Use designated tenant ID if super admin, else tenant's own workspace
  const effectiveTenantId = isAdmin ? selectedTenantId : user?.tenantId;

  const {
    agents,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
  } = useAgents(effectiveTenantId || 'invalid');

  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleCreateOrUpdate = async (data) => {
    setLocalError(null);
    setSuccess(null);
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, data);
        setSuccess(`Agent details for "${data.name}" updated successfully.`);
      } else {
        await createAgent(data);
        setSuccess(`Agent "${data.name}" registered successfully.`);
      }
      setShowForm(false);
      setEditingAgent(null);
    } catch (err) {
      setLocalError(err.message || 'Operation failed');
    }
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setShowForm(true);
  };

  const handleDelete = async (agent) => {
    setLocalError(null);
    setSuccess(null);
    if (!confirm(`Are you sure you want to delete Agent "${agent.name}" (${agent.telegramUserId})?`)) {
      return;
    }
    try {
      await deleteAgent(agent.id);
      setSuccess(`Agent "${agent.name}" purged successfully.`);
    } catch (err) {
      setLocalError(err.message || 'Failed to delete agent');
    }
  };

  const handleToggleStatus = async (agent) => {
    setLocalError(null);
    setSuccess(null);
    try {
      await toggleAgentStatus(agent.id, agent.status);
      setSuccess(`Agent status switched successfully.`);
    } catch (err) {
      setLocalError(err.message || 'Failed to toggle status');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAgent(null);
  };

  return (
    <Layout user={user} onSignOut={signOut}>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Agent Registry</h1>
            <p className="page-subtitle">Add, suspend, or manage Telegram sales agent profiles</p>
          </div>
          {(effectiveTenantId && effectiveTenantId !== 'invalid') && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Register Agent</>}
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
                  <option value="">— Select tenant to manage agents —</option>
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
              <h2>{editingAgent ? 'Edit Agent Profile' : 'Configure New Agent Profile'}</h2>
            </div>
            <AgentForm
              initialData={editingAgent || {}}
              onSubmit={handleCreateOrUpdate}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Main List */}
        {(!effectiveTenantId || effectiveTenantId === 'invalid') ? (
          <div className="card text-center py-10 text-slate-500">
            Please select a tenant context above to manage agents list.
          </div>
        ) : (
          <div className="card animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Registered Agents</h2>
              <span className="badge badge-muted">{agents.length} active profiles</span>
            </div>
            <AgentTable
              agents={agents}
              loading={loading}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
