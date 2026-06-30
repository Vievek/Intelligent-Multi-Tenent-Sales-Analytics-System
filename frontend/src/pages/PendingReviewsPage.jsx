import React, { useState } from 'react';
import { useAuth, usePendingReviews, useAgents, useTenants } from '../hooks';
import Layout from '../components/ui/Layout';
import { AlertCircle, CheckCircle, ChevronDown, Building2, Eye, ShieldAlert, Sparkles } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function PendingReviewsPage() {
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { tenants } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const effectiveTenantId = isAdmin ? selectedTenantId : user?.tenantId;

  const { reviews, loading, error, approveReview, rejectReview } = usePendingReviews(effectiveTenantId);
  const { agents } = useAgents(effectiveTenantId);

  const [reviewingItem, setReviewingItem] = useState(null);
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [agentId, setAgentId] = useState('');
  const [localError, setLocalError] = useState(null);
  const [success, setSuccess] = useState(null);

  const startReview = (item) => {
    setReviewingItem(item);
    setProduct(item.partialExtraction?.product || '');
    setQuantity(item.partialExtraction?.quantity || '1');
    setPrice(item.partialExtraction?.price || '0');
    setAgentId(item.agentId || '');
    setLocalError(null);
    setSuccess(null);
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(null);

    if (!product || !quantity || !price || !agentId) {
      setLocalError('All fields are required to approve the transaction.');
      return;
    }

    try {
      await approveReview(reviewingItem.id, {
        product,
        quantity: parseInt(quantity, 10),
        price: parseFloat(price),
        agentId,
      });
      setSuccess('Transaction approved and written to the ledger.');
      setReviewingItem(null);
    } catch (err) {
      setLocalError(err.message || 'Approval failed');
    }
  };

  const handleReject = async (item) => {
    if (!window.confirm('Are you sure you want to reject and archive this message?')) return;
    setLocalError(null);
    setSuccess(null);
    try {
      await rejectReview(item.id);
      setSuccess('Message rejected and archived.');
      if (reviewingItem?.id === item.id) {
        setReviewingItem(null);
      }
    } catch (err) {
      setLocalError(err.message || 'Rejection failed');
    }
  };

  return (
    <Layout user={user} onSignOut={signOut}>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Pending Reviews</h1>
            <p className="page-subtitle">Inspect messages that failed extraction and manually approve or reject them.</p>
          </div>
        </div>

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
                    setReviewingItem(null);
                  }}
                  className="input pr-8 appearance-none"
                >
                  <option value="">— Select tenant to view pending reviews —</option>
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

        {reviewingItem && (
          <div className="card animate-slide-up border border-primary-500/30">
            <div className="flex items-center gap-2 mb-4 font-bold text-white">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <h2>Correct & Approve Extraction</h2>
            </div>
            
            <div className="mb-4 p-3 bg-slate-900 rounded border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Raw Telegram Message</span>
              <p className="text-sm text-slate-300 mt-1 font-mono">"{reviewingItem.rawMessage}"</p>
              <p className="text-xs text-rose-400 mt-2">Error: {reviewingItem.errorReason}</p>
            </div>

            <form onSubmit={handleApprove} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Product Name</label>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="input"
                    placeholder="e.g. Apples"
                    required
                  />
                </div>
                <div>
                  <label className="label">Agent/Salesperson</label>
                  <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">— Select Agent —</option>
                    {agents.map((a) => (
                      <option key={a.telegramUserId} value={a.telegramUserId}>
                        {a.name} ({a.telegramUserId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="input"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="label">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="input"
                    min="0.01"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Approve & Record
                </button>
              </div>
            </form>
          </div>
        )}

        {!effectiveTenantId ? (
          <div className="card text-center py-10 text-slate-500">
            Please select a tenant context above to view reviews.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <span className="animate-pulse">Loading pending reviews...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600 card">
            <ShieldAlert className="w-12 h-12 mb-3 opacity-30 text-emerald-400" />
            <p className="text-sm">Clean ledger! No failed records needing review.</p>
          </div>
        ) : (
          <div className="card animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white font-mono">Unresolved Extractions</h2>
              <span className="badge badge-danger">{reviews.length} pending</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Received</th>
                    <th className="py-3 px-4">Raw Text</th>
                    <th className="py-3 px-4">Reason / Error</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 text-sm">
                  {reviews.map((item) => (
                    <tr key={item.id} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs">{formatDate(item.receivedAt)}</td>
                      <td className="py-3 px-4 font-semibold text-white">{item.rawMessage}</td>
                      <td className="py-3 px-4 text-xs text-rose-400">{item.errorReason}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startReview(item)}
                            className="btn-icon hover:text-primary-400 flex items-center gap-1"
                            title="Review & Correct"
                          >
                            <Eye className="w-4 h-4" /> Review
                          </button>
                          <button
                            onClick={() => handleReject(item)}
                            className="btn-icon hover:text-rose-400"
                            title="Reject & Archive"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
