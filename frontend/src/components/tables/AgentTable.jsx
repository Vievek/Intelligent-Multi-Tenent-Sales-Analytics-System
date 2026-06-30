import React from 'react';
import { ShieldAlert, Trash2, Edit2, ShieldCheck, User } from 'lucide-react';

export default function AgentTable({ agents, loading, onToggleStatus, onDelete, onEdit }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-500">
        <span className="animate-pulse">Loading agents registry...</span>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-600">
        <User className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No agents registered for this tenant space yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
            <th className="py-3 px-4">Name</th>
            <th className="py-3 px-4">Telegram User ID</th>
            <th className="py-3 px-4">Chat ID</th>
            <th className="py-3 px-4">Message Count</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-300 text-sm">
          {agents.map((agent) => (
            <tr key={agent.id} className="hover:bg-white/3 transition-colors group">
              <td className="py-3 px-4 font-semibold text-white">{agent.name}</td>
              <td className="py-3 px-4 font-mono text-xs">{agent.telegramUserId}</td>
              <td className="py-3 px-4 font-mono text-xs">{agent.chatId || '—'}</td>
              <td className="py-3 px-4">{agent.messageCount || 0}</td>
              <td className="py-3 px-4">
                <span className={`badge ${agent.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                  {agent.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onToggleStatus(agent)}
                    className={`btn-icon ${agent.status === 'active' ? 'hover:text-amber-400' : 'hover:text-emerald-400'}`}
                    title={agent.status === 'active' ? 'Block Agent' : 'Activate Agent'}
                  >
                    {agent.status === 'active' ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onEdit(agent)}
                    className="btn-icon hover:text-primary-400"
                    title="Edit Agent"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(agent)}
                    className="btn-icon hover:text-rose-400"
                    title="Delete Agent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
