'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  DollarSign,
  Clock,
  CheckCircle,
  Download,
  Calendar,
  TrendingUp,
  Award,
  Users,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { StatCard } from '@/components/StatCard';
import { useI18n } from '@/lib/i18n';

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-11');

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      if (json.success) {
        setData(json.analytics);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    if (!data) return;
    let csv = "Metric,Value\n";
    csv += `Total Paid Revenue,$${data.totalPaidRevenue.toFixed(2)}\n`;
    csv += `Pending Payments,$${data.totalPendingPayments.toFixed(2)}\n`;
    csv += `Total Orders,${data.totalOrders}\n`;
    csv += `Completed Orders,${data.completedOrders}\n\n`;
    csv += "Top Products,Quantity Sold,Revenue\n";
    data.topProducts?.forEach((p: any) => {
      csv += `"${p.name}",${p.quantity},$${p.revenue.toFixed(2)}\n`;
    });
    csv += "\nBest Customers,Orders,Total Spent\n";
    data.bestCustomers?.forEach((c: any) => {
      csv += `"${c.name}",${c.total_orders},$${c.total_spent.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sakhidesk-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
              {t('analytics')} & Monthly Income
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real earnings calculated strictly from confirmed PAID PayPal Sandbox invoices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2.5 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand-800 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-brand-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-xs shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Earned Paid Revenue"
          value={`$${(data?.totalPaidRevenue || 0).toFixed(2)}`}
          subtitle="Confirmed received payments"
          icon={DollarSign}
          colorScheme="emerald"
        />
        <StatCard
          title="Pending Payments Due"
          value={`$${(data?.totalPendingPayments || 0).toFixed(2)}`}
          subtitle="Awaiting customer transfer"
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          title="Total Lifetime Orders"
          value={data?.totalOrders || 0}
          subtitle="Created through SakhiDesk"
          icon={TrendingUp}
          colorScheme="purple"
        />
        <StatCard
          title="Completed & Delivered"
          value={data?.completedOrders || 0}
          subtitle="Successfully fulfilled"
          icon={CheckCircle}
          colorScheme="teal"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trends Line Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-brand-950">
                Revenue & Growth Trends
              </h3>
              <p className="text-xs text-slate-500">
                Monthly progression of paid earnings vs pending invoices (USD)
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.monthlySales || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [`$${val}`, '']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Line type="monotone" dataKey="paidRevenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Paid Revenue" />
                <Line type="monotone" dataKey="pendingRevenue" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} name="Pending" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-brand-950">
              Order Pipeline Breakdown
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Current lifecycle distribution of bookings
            </p>

            <div className="space-y-3">
              {data?.statusDistribution?.map((item: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-cream-50 border border-brand-100/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-brand-950">{item.count} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid: Top Products & Best Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Popular Products */}
        <div className="bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-base text-brand-950">
              Top Selling Products
            </h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {data?.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.map((p: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-400">{p.quantity} units sold</p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-700 text-sm">
                    ${Number(p.revenue).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-slate-400">No product sales data yet.</p>
            )}
          </div>
        </div>

        {/* Best Customers */}
        <div className="bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-base text-brand-950">
              Customer Leaderboard
            </h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {data?.bestCustomers && data.bestCustomers.length > 0 ? (
              data.bestCustomers.map((c: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-cream-200 text-slate-800 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{c.total_orders} total order(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700 text-sm">${Number(c.total_spent).toFixed(2)}</p>
                    {Number(c.outstanding_balance) > 0 && (
                      <p className="text-[10px] text-amber-600 font-semibold">${Number(c.outstanding_balance).toFixed(2)} due</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-slate-400">No customer spend history yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
