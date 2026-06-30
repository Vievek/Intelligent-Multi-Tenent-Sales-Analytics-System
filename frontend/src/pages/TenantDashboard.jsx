import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSales } from '../hooks/useSales';
import { useAgents } from '../hooks/useAgents';
import Layout from '../components/ui/Layout';
import StatCard from '../components/ui/StatCard';
import SalesTrendChart from '../components/charts/SalesTrendChart';
import TopProductsChart from '../components/charts/TopProductsChart';
import AgentPerformance from '../components/charts/AgentPerformance';
import SalesTable from '../components/tables/SalesTable';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Package, ShoppingCart, DollarSign, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

export default function TenantDashboard() {
  const { user, signOut } = useAuth();
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const { sales, loading, error, getStats, getTopProducts, getSalesByDate } = useSales(dateRange);
  const { agents } = useAgents();

  const stats = getStats();
  const topProducts = getTopProducts(10);
  const salesByDate = getSalesByDate('day');

  // Dynamically calculate trend percentages
  const getDynamicTrend = (type) => {
    if (!sales || sales.length === 0) return { trend: 'neutral', value: '0%' };
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const getSalesInPeriod = (start, end) => {
      return sales.filter(s => {
        const d = s.date?.seconds ? new Date(s.date.seconds * 1000) : new Date(s.date);
        return d >= start && d < end;
      });
    };

    const currentPeriod = getSalesInPeriod(sevenDaysAgo, now);
    const priorPeriod = getSalesInPeriod(fourteenDaysAgo, sevenDaysAgo);

    let currentVal = 0;
    let priorVal = 0;

    if (type === 'sales') {
      currentVal = currentPeriod.length;
      priorVal = priorPeriod.length;
    } else if (type === 'revenue') {
      currentVal = currentPeriod.reduce((acc, s) => acc + (s.totalValue || 0), 0);
      priorVal = priorPeriod.reduce((acc, s) => acc + (s.totalValue || 0), 0);
    } else if (type === 'units') {
      currentVal = currentPeriod.reduce((acc, s) => acc + (s.quantity || 0), 0);
      priorVal = priorPeriod.reduce((acc, s) => acc + (s.quantity || 0), 0);
    } else if (type === 'aov') {
      const curRev = currentPeriod.reduce((acc, s) => acc + (s.totalValue || 0), 0);
      const priRev = priorPeriod.reduce((acc, s) => acc + (s.totalValue || 0), 0);
      currentVal = currentPeriod.length > 0 ? curRev / currentPeriod.length : 0;
      priorVal = priorPeriod.length > 0 ? priRev / priorPeriod.length : 0;
    }

    if (priorVal === 0) {
      return currentVal > 0 ? { trend: 'up', value: '+100%' } : { trend: 'neutral', value: '0%' };
    }

    const pct = ((currentVal - priorVal) / priorVal) * 100;
    if (pct > 0) {
      return { trend: 'up', value: `+${pct.toFixed(1)}%` };
    } else if (pct < 0) {
      return { trend: 'down', value: `${pct.toFixed(1)}%` };
    }
    return { trend: 'neutral', value: '0%' };
  };

  const salesTrend = getDynamicTrend('sales');
  const revenueTrend = getDynamicTrend('revenue');
  const unitsTrend = getDynamicTrend('units');
  const aovTrend = getDynamicTrend('aov');

  const statItems = [
    {
      title: 'Total Transactions',
      value: formatNumber(stats.totalSales),
      icon: ShoppingCart,
      color: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
      trend: salesTrend.trend,
      trendValue: salesTrend.value,
      subtitle: 'From incoming messages'
    },
    {
      title: 'Net Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      trend: revenueTrend.trend,
      trendValue: revenueTrend.value,
      subtitle: 'Calculated value'
    },
    {
      title: 'Units Sold',
      value: formatNumber(stats.totalQuantity),
      icon: Package,
      color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      trend: unitsTrend.trend,
      trendValue: unitsTrend.value,
      subtitle: 'Across all products'
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(stats.avgSaleValue),
      icon: TrendingUp,
      color: 'bg-accent-500/10 text-accent-400 border border-accent-500/20',
      trend: aovTrend.trend,
      trendValue: aovTrend.value,
      subtitle: 'Per transaction'
    },
  ];

  if (error) {
    return (
      <Layout user={user} onSignOut={signOut}>
        <div className="alert-error max-w-lg mx-auto mt-10 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Error loading sales: {error}</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onSignOut={signOut}>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-2">
              Performance Dashboard
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h1>
            <p className="page-subtitle">Real-time NLP-extracted metrics and analytics</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Real-time Sync Active</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          {statItems.map((item) => (
            <StatCard key={item.title} {...item} />
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="card">
            <h3 className="text-sm font-bold text-white mb-4">Volume & Revenue Trends</h3>
            <SalesTrendChart data={salesByDate} />
          </div>
          <div className="card">
            <h3 className="text-sm font-bold text-white mb-4">Top Performing Products</h3>
            <TopProductsChart data={topProducts} />
          </div>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Recent NLP Transcripts</h3>
              <span className="badge badge-muted">{sales.length} total</span>
            </div>
            <SalesTable sales={sales.slice(0, 10)} loading={loading} />
          </div>
          <div className="card">
            <h3 className="text-sm font-bold text-white mb-4">Leaderboard</h3>
            <AgentPerformance sales={sales} agents={agents} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
