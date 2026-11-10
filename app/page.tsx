'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Clock,
  ShoppingBag,
  CheckCircle,
  FileText,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Bell,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useI18n } from '@/lib/i18n';

interface DashboardData {
  kpis: {
    totalRevenue: number;
    pendingRevenue: number;
    totalOrders: number;
    completedOrders: number;
    outstandingInvoices: number;
  };
  recentOrders: any[];
  recentActivity: any[];
  upcomingReminders: any[];
  seller: any;
}

export default function DashboardPage() {
  const { t, language } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const chartData = [
    { month: 'Jun', paid: 120, pending: 0 },
    { month: 'Jul', paid: 240, pending: 30 },
    { month: 'Aug', paid: 310, pending: 45 },
    { month: 'Sep', paid: 420, pending: 60 },
    { month: 'Oct', paid: 510, pending: 50 },
    { month: 'Nov (Current)', paid: data?.kpis?.totalRevenue || 50, pending: data?.kpis?.pendingRevenue || 35 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-sakhi-deep p-6 sm:p-8 text-white shadow-elevated">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              {language === 'en' ? 'Welcome back' : 'Namaste'}, {data?.seller?.name || 'Pooja'}! ✨
            </h1>
            <p className="text-sm text-brand-200 max-w-xl">
              {data?.seller?.business_name || 'SakhiDesk'} — here is your business at a glance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all text-xs flex items-center gap-1.5"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/create-order"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-sakhi-pink to-brand-500 text-white font-semibold text-sm shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('createOrderAI')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title={t('totalRevenue')}
          value={`$${(data?.kpis?.totalRevenue || 0).toFixed(2)}`}
          subtitle="Strictly confirmed PAID invoices"
          icon={DollarSign}
          colorScheme="emerald"
        />
        <StatCard
          title={t('pendingPayments')}
          value={`$${(data?.kpis?.pendingRevenue || 0).toFixed(2)}`}
          subtitle="Sent & waiting customer payment"
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          title={t('totalOrders')}
          value={data?.kpis?.totalOrders || 0}
          subtitle="Orders processed"
          icon={ShoppingBag}
          colorScheme="purple"
        />
        <StatCard
          title={t('completedOrders')}
          value={data?.kpis?.completedOrders || 0}
          subtitle="Delivered & confirmed"
          icon={CheckCircle}
          colorScheme="teal"
        />
        <StatCard
          title={t('outstandingInvoices')}
          value={data?.kpis?.outstandingInvoices || 0}
          subtitle="Invoices pending payment"
          icon={FileText}
          colorScheme="rose"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-brand-950">
                Monthly Business Revenue
              </h2>
              <p className="text-xs text-slate-500">
                Comparing confirmed Paid Revenue vs Pending Invoices (USD)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                Paid Revenue
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
                Pending Payments
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [`$${val}`, '']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} name="Paid Revenue" />
                <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending Payments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Payment Reminders Widget */}
        <div className="bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-brand-950 uppercase tracking-wider">
                  Payment Reminders
                </h3>
              </div>
              <Link href="/reminders" className="text-xs text-brand-600 hover:text-brand-800 font-semibold">
                View All &rarr;
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Customers with outstanding PayPal invoices:
            </p>

            <div className="space-y-2.5">
              {data?.upcomingReminders && data.upcomingReminders.length > 0 ? (
                data.upcomingReminders.map((rem: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-cream-50 border border-brand-100/80 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-brand-950">{rem.customer_name}</p>
                      <p className="text-[11px] text-slate-500">{rem.invoice_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-amber-700">${Number(rem.amount).toFixed(2)}</p>
                      <StatusBadge status={rem.paypal_status} isDemo={Boolean(rem.is_demo)} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No pending invoices! All payments up to date. 🎉
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-brand-100">
            <Link
              href="/invoices"
              className="w-full py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100/70 border border-brand-200 text-brand-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Manage PayPal Invoices</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders & Recent Customer Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-brand-950">
                {t('recentOrders')}
              </h3>
              <p className="text-xs text-slate-500">
                Latest customer requests and confirmed bookings
              </p>
            </div>
            <Link href="/orders" className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-1">Order #</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Items</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-1">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data?.recentOrders && data.recentOrders.length > 0 ? (
                  data.recentOrders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 pl-1 font-mono font-bold text-brand-950">
                        {ord.order_number}
                      </td>
                      <td className="py-3">
                        <p className="font-semibold text-slate-900">{ord.customer_name}</p>
                        <p className="text-[11px] text-slate-400">{ord.customer_phone || ord.customer_email || 'No contact'}</p>
                      </td>
                      <td className="py-3 text-slate-600">
                        {ord.items?.length || 0} item(s)
                      </td>
                      <td className="py-3 font-bold text-slate-900">
                        ${Number(ord.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={ord.status} isDemo={Boolean(ord.is_demo)} />
                      </td>
                      <td className="py-3 text-right pr-1">
                        <Link
                          href={`/orders?id=${ord.id}`}
                          className="px-2.5 py-1 text-[11px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No orders yet. Click "+ Create Order with AI" to add your first order!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-brand-950">
              {t('recentActivity')}
            </h3>
            <span className="text-[11px] text-slate-400">Live Feed</span>
          </div>

          <div className="space-y-4">
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.map((log: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                  <div className="flex-1 space-y-0.5">
                    <p className="font-semibold text-slate-800">{log.title}</p>
                    <p className="text-slate-500 text-[11px] line-clamp-2">{log.description}</p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No recent activity logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
