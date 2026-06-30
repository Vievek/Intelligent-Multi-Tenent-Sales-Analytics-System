import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTenants } from '../hooks/useTenants';
import { useSales } from '../hooks/useSales';
import { useAgents } from '../hooks/useAgents';
import Layout from '../components/ui/Layout';
import StatCard from '../components/ui/StatCard';
import TenantTable from '../components/tables/TenantTable';
import SalesTrendChart from '../components/charts/SalesTrendChart';
import TopProductsChart from '../components/charts/TopProductsChart';
import AgentPerformance from '../components/charts/AgentPerformance';
import SalesTable from '../components/tables/SalesTable';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  Building2, Users, DollarSign, TrendingUp, Sparkles, Building,
  BarChart3, ChevronDown, Package, ShoppingCart, AlertCircle, Loader2
} from 'lucide-react';

// ── Tenant Inspector inner component ─────────────────────────────────────────
function TenantInspector({ tenants }) {
  const [selectedId, setSelectedId] = useState('');

  const selectedTenant = tenants.find(t => t.id === selectedId);

  const { sales, loading, error, getStats, getTopProducts, getSalesByDate } = useSales(
    selectedId ? { tenantId: selectedId } : {}
  );
  const { agents } = useAgents(selectedId || null);

  const stats   = getStats();
  const topProds = getTopProducts(10);
  const byDate   = getSalesByDate('day');

  const statItems = [
    {
      title: 'Transactions',
      value: loading ? '...' : formatNumber(stats.totalSales),
      icon: ShoppingCart,
      color: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
      trend: 'neutral',
      trendValue: ''
    },
    {
      title: 'Net Revenue',
      value: loading ? '...' : formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      trend: 'neutral',
      trendValue: ''
    },
    {
      title: 'Units Sold',
      value: loading ? '...' : formatNumber(stats.totalQuantity),
      icon: Package,
      color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      trend: 'neutral',
      trendValue: ''
    },
    {
      title: 'Avg Order Value',
      value: loading ? '...' : formatCurrency(stats.avgSaleValue),
      icon: TrendingUp,
      color: 'bg-accent-500/10 text-accent-400 border border-accent-500/20',
      trend: 'neutral',
      trendValue: ''
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tenant picker */}
      <div className="card flex items-center gap-4 flex-wrap">
        <Building2 className="w-5 h-5 text-primary-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Select a tenant to inspect</p>
          <div className="relative">
            <select
              id="tenant-selector"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="input pr-8 appearance-none"
            >
              <option value="">— Choose a tenant —</option>
              {tenants.filter(t => t.status === 'active').map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.tenantCode})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
        {selectedTenant && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Viewing: {selectedTenant.name}
          </div>
        )}
      </div>

      {!selectedId && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Select a tenant above to inspect their analytics</p>
        </div>
      )}

      {selectedId && error && (
        <div className="alert-error flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Error loading sales: {error}</span>
        </div>
      )}

      {selectedId && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
            {statItems.map(item => <StatCard key={item.title} {...item} />)}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="card">
              <h3 className="text-sm font-bold text-white mb-4">Volume & Revenue Trends</h3>
              <SalesTrendChart data={byDate} />
            </div>
            <div className="card">
              <h3 className="text-sm font-bold text-white mb-4">Top Performing Products</h3>
              <TopProductsChart data={topProds} />
            </div>
          </div>

          {/* Table + Leaderboard row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="lg:col-span-2 card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Recent NLP Transcripts</h3>
                <span className="badge badge-muted">{sales.length} total</span>
              </div>
              <SalesTable sales={sales.slice(0, 10)} loading={loading} />
            </div>
            <div className="card">
              <h3 className="text-sm font-bold text-white mb-4">Agent Leaderboard</h3>
              <AgentPerformance sales={sales} agents={agents} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const { tenants, loading, getTenantStats } = useTenants();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ totalTenants: 0, totalAgents: 0, totalRevenue: 0, totalSales: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (tenants.length === 0) { setStatsLoading(false); return; }
      setStatsLoading(true);
      let totalTenants = tenants.length;
      let totalAgents = 0, totalRevenue = 0, totalSales = 0;

      for (const tenant of tenants) {
        if (tenant.status !== 'active') continue;
        try {
          const s = await getTenantStats(tenant.id);
          totalAgents  += s.totalAgents  || 0;
          totalRevenue += s.totalRevenue || 0;
          totalSales   += s.totalSales   || 0;
        } catch (err) {
          console.error('Failed to load tenant stats:', err);
        }
      }
      setStats({ totalTenants, totalAgents, totalRevenue, totalSales });
      setStatsLoading(false);
    };
    loadStats();
  }, [tenants, getTenantStats]);

  const statItems = [
    {
      title: 'Total Tenants',
      value: statsLoading ? '...' : formatNumber(stats.totalTenants),
      icon: Building2,
      color: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
      trend: 'up', trendValue: '+2'
    },
    {
      title: 'Total Agents',
      value: statsLoading ? '...' : formatNumber(stats.totalAgents),
      icon: Users,
      color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      trend: 'up', trendValue: '+5'
    },
    {
      title: 'Total Transactions',
      value: statsLoading ? '...' : formatNumber(stats.totalSales),
      icon: TrendingUp,
      color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      trend: 'up', trendValue: '+18%'
    },
    {
      title: 'Cross-Tenant Revenue',
      value: statsLoading ? '...' : formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'bg-accent-500/10 text-accent-400 border border-accent-500/20',
      trend: 'up', trendValue: '+24%'
    },
  ];

  const tabs = [
    { id: 'overview',  label: 'Overview',         icon: Building2  },
    { id: 'inspector', label: 'Tenant Inspector',  icon: BarChart3  },
  ];

  return (
    <Layout user={user} onSignOut={signOut}>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-2">
              System Control Room <Sparkles className="w-5 h-5 text-accent-400 animate-pulse-glow" />
            </h1>
            <p className="page-subtitle">Cross-tenant operational metrics and business configurations</p>
          </div>
          <div className="flex gap-3">
            <Link to="/agents" className="btn-secondary">
              <Users className="w-4 h-4" />
              Manage Agents
            </Link>
            <Link to="/admin/tenants" className="btn-primary">
              <Building className="w-4 h-4" />
              Manage Tenants
            </Link>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
              {statItems.map(item => <StatCard key={item.title} {...item} />)}
            </div>
            <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Registered Tenants</h2>
                <span className="badge badge-muted">{tenants.length} total</span>
              </div>
              <TenantTable tenants={tenants} loading={loading} />
            </div>
          </div>
        )}

        {/* Tenant Inspector tab */}
        {activeTab === 'inspector' && (
          <TenantInspector tenants={tenants} />
        )}
      </div>
    </Layout>
  );
}
