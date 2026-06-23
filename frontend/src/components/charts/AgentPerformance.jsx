import React, { useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';

const AgentPerformance = ({ sales }) => {
  const agentStats = useMemo(() => {
    const map = {};
    for (const sale of sales) {
      const key = sale.agentId || 'unknown';
      if (!map[key]) {
        map[key] = { agentId: key, count: 0, revenue: 0, quantity: 0 };
      }
      map[key].count++;
      map[key].revenue += sale.totalValue || 0;
      map[key].quantity += sale.quantity || 0;
    }
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [sales]);

  if (agentStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No agent data available
      </div>
    );
  }

  const maxRevenue = Math.max(...agentStats.map(a => a.revenue), 1);

  return (
    <div className="space-y-3">
      {agentStats.map((agent, index) => {
        const percentage = Math.min((agent.revenue / maxRevenue) * 100, 100);
        const rank = index + 1;
        const medalColors = ['text-yellow-500', 'text-gray-400', 'text-orange-500'];
        const rankColor = rank <= 3 ? medalColors[rank - 1] : 'text-gray-400';

        return (
          <div key={agent.agentId} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-700 font-medium">
                <span className={rankColor}>
                  #{rank}
                </span>
                <span className="truncate max-w-[80px]">
                  Agent {agent.agentId.slice(0, 6)}
                </span>
              </span>
              <span className="text-gray-600">
                {formatCurrency(agent.revenue)} ({agent.count} sales)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  rank === 1 ? 'bg-yellow-500' :
                  rank === 2 ? 'bg-gray-400' :
                  rank === 3 ? 'bg-orange-500' :
                  'bg-primary-400'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AgentPerformance;
