'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Plus,
  Trash2,
  Check,
  X,
  DollarSign,
  Clock,
  TrendingUp,
  ShoppingBag,
  Store,
  Receipt,
  Award,
  Users,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useI18n } from '@/lib/i18n';

interface OfflineSaleRow {
  id: string;
  sale_date: string;
  description: string;
  quantity: number;
  amount: number;
  payment_method: string;
  customer_name: string | null;
}

const CURRENCY = 'USD';
const money = (n: any) => `$${Number(n || 0).toFixed(2)}`;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1, 1);
  if (isNaN(d.getTime())) return m;
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function csvCell(value: any): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AnalyticsPage() {
  const { t } = useI18n();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    sale_date: today(),
    description: '',
    quantity: '1',
    amount: '',
    payment_method: 'CASH',
    customer_name: ''
  });

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (month: string) => {
    try {
      const res = await fetch(`/api/analytics?month=${month}`);
      const json = await res.json();
      if (json.success) setData(json.analytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(selectedMonth);
  }, [selectedMonth, fetchAnalytics]);

  const resetForm = () => {
    setForm({
      sale_date: today(),
      description: '',
      quantity: '1',
      amount: '',
      payment_method: 'CASH',
      customer_name: ''
    });
    setFormError('');
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Client-side validation mirrors the API rules.
    if (!form.description.trim()) return setFormError('Please enter a product or description.');
    const qty = Number(form.quantity);
    if (!Number.isFinite(qty) || qty <= 0) return setFormError('Quantity must be a positive number.');
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) return setFormError('Amount must be a positive number.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.sale_date)) return setFormError('Please enter a valid sale date.');

    setSaving(true);
    try {
      const res = await fetch('/api/offline-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_date: form.sale_date,
          description: form.description.trim(),
          quantity: qty,
          amount: amt,
          payment_method: form.payment_method,
          customer_name: form.customer_name.trim()
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save the offline sale.');

      const savedMonth = form.sale_date.slice(0, 7);
      resetForm();
      setShowForm(false);
      if (savedMonth !== selectedMonth) {
        setSelectedMonth(savedMonth); // effect will refetch
      } else {
        await fetchAnalytics(savedMonth);
      }
    } catch (err: any) {
      setFormError(err.message || 'Could not save the offline sale.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/offline-sales/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not delete the record.');
      setConfirmId(null);
      await fetchAnalytics(selectedMonth);
    } catch (err: any) {
      alert(err.message || 'Could not delete the record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCsv = () => {
    const records: any[] = data?.monthRecords || [];
    if (records.length === 0) {
      alert(`No records found for ${monthLabel(selectedMonth)}. Nothing to export.`);
      return;
    }

    const header = [
      'Date',
      'Record Type',
      'Reference',
      'Customer',
      'Product / Description',
      'Quantity',
      `Amount (${CURRENCY})`,
      'Payment Method',
      'Payment Status'
    ];

    const lines = [header.map(csvCell).join(',')];
    for (const r of records) {
      lines.push(
        [
          r.date,
          r.type,
          r.reference,
          r.customer,
          r.product,
          r.quantity,
          Number(r.amount || 0).toFixed(2),
          r.method,
          r.status
        ]
          .map(csvCell)
          .join(',')
      );
    }

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sakhidesk-records-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading your business records…
      </div>
    );
  }

  const monthly = data?.monthly || { onlineSales: 0, offlineSales: 0, offlineCount: 0, totalRecorded: 0 };
  const offlineRecords = (data?.monthRecords || []).filter((r: any) => r.type === 'Offline') as OfflineSaleRow[];
  const overviewTiles = [
    { label: 'Total orders', value: data?.totalOrders || 0, icon: ShoppingBag, tone: 'text-brand-700 bg-brand-50' },
    { label: 'Paid online sales', value: money(data?.paidOnline), icon: DollarSign, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Offline sales', value: money(data?.offlineTotal), icon: Store, tone: 'text-amber-700 bg-amber-50' },
    { label: 'Combined recorded sales', value: money(data?.combinedRecordedSales), icon: TrendingUp, tone: 'text-sakhi-lavender bg-brand-50' },
    { label: 'Pending payments', value: money(data?.pendingPayments), icon: Clock, tone: 'text-rose-700 bg-rose-50' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
              {t('analytics')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Your simple business overview and records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand-800 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-brand-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand-800 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-brand-600" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Sandbox notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed">
          {data?.sandboxNote}
          {data?.hasDemoData && (
            <>
              {' '}Sample records included: {money(data?.paidOnlineDemo)} paid / {money(data?.pendingDemo)} pending.
            </>
          )}
        </p>
      </div>

      {/* A. Business overview */}
      <section className="bg-white rounded-2xl border border-brand-100 shadow-card p-5">
        <h2 className="text-sm font-bold text-brand-950 uppercase tracking-wider mb-4">Business overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {overviewTiles.map((tile) => (
            <div key={tile.label} className="p-3 rounded-xl bg-cream-50 border border-brand-100/70">
              <div className={`w-8 h-8 rounded-lg ${tile.tone} flex items-center justify-center mb-2`}>
                <tile.icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-brand-950 leading-tight">{tile.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{tile.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Online sales are verified PayPal payments. Offline sales are the ones you record yourself.
        </p>
      </section>

      {/* B + C. Monthly records and add offline sale */}
      <section className="bg-white rounded-2xl border border-brand-100 shadow-card p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-brand-950 uppercase tracking-wider">Monthly records</h2>
            <p className="text-xs text-slate-500 mt-0.5">{monthLabel(selectedMonth)}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold">Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || currentMonth())}
              className="px-3 py-2 rounded-xl border border-brand-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <p className="text-[11px] text-emerald-800 font-semibold">Online sales</p>
            <p className="text-xl font-bold text-emerald-950 mt-1">{money(monthly.onlineSales)}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
            <p className="text-[11px] text-amber-800 font-semibold">Offline sales</p>
            <p className="text-xl font-bold text-amber-950 mt-1">{money(monthly.offlineSales)}</p>
          </div>
          <div className="p-3 rounded-xl bg-brand-50/70 border border-brand-100">
            <p className="text-[11px] text-brand-800 font-semibold">Total recorded</p>
            <p className="text-xl font-bold text-brand-950 mt-1">{money(monthly.totalRecorded)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] text-slate-600 font-semibold">Offline transactions</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{monthly.offlineCount}</p>
          </div>
        </div>

        {/* Add offline sale */}
        <div className="pt-1">
          {!showForm ? (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-xs shadow-soft hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Offline Sale</span>
            </button>
          ) : (
            <form onSubmit={handleAddSale} className="p-4 rounded-2xl bg-cream-50 border border-brand-100 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-brand-950 uppercase tracking-wider">New offline sale</h3>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="p-1 rounded-lg hover:bg-white text-slate-400"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <label className="text-xs text-slate-600 space-y-1">
                  <span className="font-semibold">Sale date *</span>
                  <input
                    type="date"
                    value={form.sale_date}
                    onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </label>
                <label className="text-xs text-slate-600 space-y-1 sm:col-span-2">
                  <span className="font-semibold">Product / description *</span>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. Chocolate cake (1 kg)"
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </label>
                <label className="text-xs text-slate-600 space-y-1">
                  <span className="font-semibold">Quantity *</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </label>
                <label className="text-xs text-slate-600 space-y-1">
                  <span className="font-semibold">Total amount (USD) *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </label>
                <label className="text-xs text-slate-600 space-y-1">
                  <span className="font-semibold">Payment method</span>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other offline</option>
                  </select>
                </label>
                <label className="text-xs text-slate-600 space-y-1 sm:col-span-2">
                  <span className="font-semibold">Customer name (optional)</span>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="e.g. Ananya"
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </label>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {formError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-xs shadow-soft disabled:opacity-60 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{saving ? 'Saving…' : 'Save sale'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2.5 rounded-xl border border-brand-200 bg-white text-brand-800 font-semibold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Offline records for the month */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-bold text-brand-950 uppercase tracking-wider">
              Offline sales in {monthLabel(selectedMonth)}
            </h3>
          </div>

          {offlineRecords.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {offlineRecords.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{r.description}</p>
                    <p className="text-[11px] text-slate-400">
                      {r.sale_date} · Qty {r.quantity} · {r.payment_method === 'OTHER' ? 'Other offline' : 'Cash'}
                      {r.customer_name ? ` · ${r.customer_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-amber-700">{money(r.amount)}</span>
                    {confirmId === r.id ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold text-[11px] disabled:opacity-60"
                        >
                          {deletingId === r.id ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 font-semibold text-[11px]"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmId(r.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete this record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              No offline sales recorded for this month yet.
            </p>
          )}
        </div>
      </section>

      {/* Recorded sales trend (real data) */}
      <section className="bg-white rounded-2xl border border-brand-100 shadow-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-brand-950 uppercase tracking-wider">Recorded sales — last 6 months</h2>
          <p className="text-xs text-slate-500 mt-0.5">Online (verified PayPal) vs offline (recorded by you)</p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.monthlyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(val: any) => [`$${val}`, '']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} name="Online sales" />
              <Bar dataKey="offline" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Offline sales" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* D. Order pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-brand-100 shadow-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-brand-950 uppercase tracking-wider">Order pipeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">Every order falls in exactly one stage below</p>
          </div>
          <div className="space-y-2">
            {(data?.pipeline || []).map((item: any) => (
              <div key={item.key} className="p-2.5 rounded-xl bg-cream-50 border border-brand-100/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                </div>
                <span className="font-mono text-xs font-bold text-brand-950">{item.count}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-brand-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Total orders</span>
            <span className="font-mono font-bold text-brand-950">{data?.pipelineTotal || 0}</span>
          </div>
        </section>

        {/* Top selling products */}
        <section className="bg-white rounded-2xl border border-brand-100 shadow-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-brand-950 uppercase tracking-wider">Top selling products</h2>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {data?.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.map((p: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-emerald-700">{money(p.revenue)}</p>
                    <p className="text-[10px] text-slate-400">{p.quantity} sold</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-slate-400">No product sales yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Best customers */}
      <section className="bg-white rounded-2xl border border-brand-100 shadow-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-bold text-brand-950 uppercase tracking-wider">Best customers</h2>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {data?.bestCustomers && data.bestCustomers.length > 0 ? (
            data.bestCustomers.map((c: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-cream-200 text-slate-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-emerald-700">{money(c.total_spent)}</p>
                  <p className="text-[10px] text-slate-400">{c.total_orders} order(s)</p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-slate-400">No customer spend history yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
