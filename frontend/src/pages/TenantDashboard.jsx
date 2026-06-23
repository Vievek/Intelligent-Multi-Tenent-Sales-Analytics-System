import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSales } from '../hooks/useSales';
import Layout from '../components/ui/Layout';
import StatCard from '../components/ui/StatCard';
import SalesTrendChart from '../components/charts/SalesTrendChart';
import TopProductsChart from '../components/charts/TopProductsChart';
import AgentPerformance from '../components/charts/AgentPerformance';
import SalesTable from '../components/tables/SalesTable';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Package, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';

export default function TenantDashboard() {
  const { user, signOut } = useAuth();
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const { sales, loading, error, getStats, getTopProducts, getSalesByDate } = useSales(dateRange);

  const stats = getStats();
  const topProducts = getTopProducts(10);
  const salesByDate = getSalesByDate('day');

  const statItems = [
    {
      title: 'Total Sales',
      value: formatNumber(stats.totalSales),
      icon: ShoppingCart,
      color: 'text-primary-600 bg-primary-50',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
    },
    {
      title: 'Total Quantity',
      value: formatNumber(stats.totalQuantity),
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Average Sale Value',
      value: formatCurrency(stats.avgSaleValue),
      icon: TrendingUp,
      color: 'text-yellow-600 bg-yellow-50',
    },
  ];

  if (loading) {
    return (
      <Layout user={user} onSignOut={signOut}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout user={user} onSignOut={signOut}>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error loading sales: {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onSignOut={signOut}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Real-time sales analytics for your business</p>
          </div>
          <div className="text-sm text-gray-500">
            {sales.length} sales recorded
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((item) => (
            <StatCard key={item.title} {...item} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Sales Trend</h3>
            <SalesTrendChart data={salesByDate} />
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Top Products</h3>
            <TopProductsChart data={topProducts} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Sales</h3>
            <SalesTable sales={sales.slice(0, 20)} loading={false} />
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Agent Performance</h3>
            <AgentPerformance sales={sales} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
