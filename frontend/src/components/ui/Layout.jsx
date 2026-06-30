import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  LogOut,
  ChevronRight,
  Activity,
  BarChart3,
  Settings,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';
import { usePendingReviews } from '../../hooks';

export default function Layout({ children, user, onSignOut }) {
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const [mobileOpen, setMobileOpen] = useState(false);

  const effectiveTenantId = isAdmin ? null : user?.tenantId;
  const { reviews } = usePendingReviews(effectiveTenantId);

  const navItems = isAdmin
    ? [
        { path: '/admin', label: 'Overview', icon: LayoutDashboard },
        { path: '/admin/tenants', label: 'Tenants', icon: Building2 },
        { path: '/agents', label: 'Agents CRUD', icon: Settings },
        { path: '/sales', label: 'Sales CRUD', icon: Activity },
        { path: '/pending-reviews', label: 'Pending Reviews', icon: ShieldAlert, badge: true },
      ]
    : [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/agents', label: 'Agents CRUD', icon: Settings },
        { path: '/sales', label: 'Sales CRUD', icon: Activity },
        { path: '/pending-reviews', label: 'Pending Reviews', icon: ShieldAlert, badge: true },
      ];

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const role = user?.role === 'admin' ? 'Super Admin' : 'Tenant User';

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        if (item.disabled) {
          return (
            <div
              key={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 cursor-not-allowed text-sm font-medium select-none"
            >
              <Icon className="w-4 h-4" />
              {item.label}
              <span className="ml-auto text-[10px] bg-white/5 text-slate-600 px-1.5 py-0.5 rounded-md font-mono">Soon</span>
            </div>
          );
        }
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={isActive ? 'nav-item-active' : 'nav-item'}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
            {item.badge && reviews && reviews.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full leading-none">
                {reviews.length}
              </span>
            )}
            {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />}
          </Link>
        );
      })}
    </>
  );

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-surface-950 border-r border-white/5 w-64 py-6">
      {/* Logo */}
      <div className="px-5 mb-8">
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow duration-300">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">RMET Analytics</div>
            <div className="text-[10px] text-slate-500 font-medium tracking-wide">SALES INTELLIGENCE</div>
          </div>
        </Link>
      </div>

      {/* Nav Section */}
      <div className="px-3 flex-1">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 mb-2">
          {isAdmin ? 'Administration' : 'Analytics'}
        </div>
        <nav className="space-y-1">
          <NavLinks />
        </nav>
      </div>

      {/* System status dot */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-emerald-400 font-medium">All systems operational</span>
        </div>
      </div>

      {/* User section */}
      <div className="px-3">
        <div className="divider" />
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/3 transition-colors group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{displayName}</div>
            <div className="text-xs text-slate-500 truncate">{role}</div>
          </div>
          <button
            onClick={onSignOut}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-surface-950 flex bg-mesh">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-40">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface-950/80 backdrop-blur-xl sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-icon"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">RMET Analytics</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
