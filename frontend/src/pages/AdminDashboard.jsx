import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTenants } from '../hooks/useTenants';
import Layout from '../components/ui/Layout';
import StatCard from '../components/ui/StatCard';
import TenantTable from '../components/tables/TenantTable';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Building2, Users, DollarSign, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const { tenants, loading, getTenantStats } = useTenants();
  const [stats, setStats] = useState({ totalTenants: 0, totalAgents: 0, totalRevenue: 0, totalSales: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  React.useEffect(() => {
    const loadStats = async () => {
      if (tenants.length === 0) {
        setStatsLoading(false);
        return;
      }

      setStatsLoading(true);
      let totalTenants = tenants.length;
      let totalAgents = 0;
      let totalRevenue = 0;
      let totalSales = 0;

      for (const tenant of tenants) {
        if (tenant.status !== 'active') continue;
        try {
          const tenantStats = await getTenantStats(tenant.id);
          totalAgents += tenantStats.totalAgents || 0;
          totalRevenue += tenantStats.totalRevenue || 0;
          totalSales += tenantStats.totalSales || 0;
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
      color: 'text-primary-600 bg-primary-50',
    },
    {
      title: 'Total Agents',
      value: statsLoading ? '...' : formatNumber(stats.totalAgents),
      icon: Users,
      color: 'text-green-600 bg-green-50',
    },
    {
      title: 'Total Sales',
      value: statsLoading ? '...' : formatNumber(stats.totalSales),
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Total Revenue',
      value: statsLoading ? '...' : formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'text-yellow-600 bg-yellow-50',
    },
  ];

  return (
    <Layout user={user} onSignOut={signOut}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500">Overview of all tenants and their performance</p>
          </div>
          <Link to="/admin/tenants" className="btn-primary">
            Manage Tenants
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((item) => (
            <StatCard key={item.title} {...item} />
          ))}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Tenants</h2>
          <TenantTable tenants={tenants} loading={loading} />
        </div>
      </div>
    </Layout>
  );
}
