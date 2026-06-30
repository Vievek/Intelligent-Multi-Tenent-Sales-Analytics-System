import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

const rankIcons = [
  <Trophy key={0} className="w-3.5 h-3.5 text-amber-400" />,
  <Medal key={1} className="w-3.5 h-3.5 text-slate-300" />,
  <Award key={2} className="w-3.5 h-3.5 text-amber-600" />,
];

export default function AgentPerformance({ sales = [], agents = [] }) {
  if (!sales || sales.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-600">
        <div className="text-center">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-sm">No agent data yet</p>
        </div>
      </div>
    );
  }

  // Build agentId -> name lookup from agents array
  const agentNameMap = {};
  agents.forEach(agent => {
    if (agent.telegramUserId) agentNameMap[agent.telegramUserId] = agent.name || null;
    if (agent.id) agentNameMap[agent.id] = agent.name || agentNameMap[agent.id] || null;
  });
  const resolveName = (agentId) => agentNameMap[agentId] || `Agent ${agentId.slice(-6)}`;

  // Aggregate by agent
  const agentMap = {};
  sales.forEach(sale => {
    const id = sale.agentId || 'unknown';
    if (!agentMap[id]) {
      agentMap[id] = { agentId: id, salesCount: 0, revenue: 0 };
    }
    agentMap[id].salesCount++;
    agentMap[id].revenue += sale.totalValue || sale.price * sale.quantity || 0;
  });

  const leaderboard = Object.values(agentMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const maxRevenue = leaderboard[0]?.revenue || 1;

  return (
    <div className="space-y-3">
      {leaderboard.map((agent, idx) => {
        const pct = Math.round((agent.revenue / maxRevenue) * 100);
        const name = resolveName(agent.agentId);
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const isTop = idx < 3;

        return (
          <div key={agent.agentId} className="flex items-center gap-3 group">
            {/* Rank / avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              idx === 0 ? 'bg-amber-500/20 text-amber-400' :
              idx === 1 ? 'bg-slate-400/15 text-slate-300' :
              idx === 2 ? 'bg-amber-700/20 text-amber-600' :
              'bg-white/5 text-slate-500'
            }`}>
              {isTop ? rankIcons[idx] : initials}
            </div>

            {/* Info + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-300 truncate" title={name}>
                  {name}
                </span>
                <span className="text-xs font-semibold text-slate-400 ml-2 flex-shrink-0">
                  {agent.salesCount} sales
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    idx === 0 ? 'bg-gradient-to-r from-primary-500 to-accent-500' :
                    idx === 1 ? 'bg-gradient-to-r from-primary-600 to-primary-400' :
                    'bg-primary-700/60'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Revenue */}
            <div className="text-right flex-shrink-0 w-16">
              <span className="text-xs font-bold text-white">
                ${agent.revenue >= 1000
                  ? `${(agent.revenue / 1000).toFixed(1)}k`
                  : agent.revenue.toFixed(0)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
