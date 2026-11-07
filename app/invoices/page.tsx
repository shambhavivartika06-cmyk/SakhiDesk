'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  ExternalLink,
  Send,
  Bell,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  Eye,
  X,
  CreditCard
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useI18n } from '@/lib/i18n';

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  paypal_invoice_id: string;
  paypal_status: string;
  payment_url: string;
  amount: number;
  currency: string;
  notes: string;
  is_demo: number;
  sent_at: string | null;
  paid_at: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export default function InvoicesPage() {
  const { t } = useI18n();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/invoices?status=${filterStatus}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus, search]);

  // Refresh status directly from PayPal API
  const handleRefreshStatus = async (invoice: Invoice) => {
    setSyncingId(invoice.id);
    setActionMessage(null);

    try {
      const targetId = invoice.paypal_invoice_id || invoice.id;
      const res = await fetch(`/api/paypal/status/${targetId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync with PayPal API');
      }

      setActionMessage({
        type: 'success',
        text: `Invoice #${invoice.invoice_number} synced with PayPal! Live Status: ${data.status}`
      });

      // Update in state
      setInvoices(prev => prev.map(inv => (inv.id === invoice.id ? { ...inv, paypal_status: data.status, payment_url: data.paymentUrl || inv.payment_url } : inv)));
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice(prev => prev ? { ...prev, paypal_status: data.status } : null);
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Status refresh failed.'
      });
    } finally {
      setSyncingId(null);
    }
  };

  // Send draft invoice via PayPal
  const handleSendInvoice = async (invoice: Invoice) => {
    setSyncingId(invoice.id);
    setActionMessage(null);

    try {
      const res = await fetch('/api/paypal/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.paypal_invoice_id || invoice.id })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send invoice');
      }

      setActionMessage({
        type: 'success',
        text: `Invoice #${invoice.invoice_number} sent via PayPal! Customer can now pay via sandbox payment URL.`
      });

      fetchInvoices();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to send invoice.'
      });
    } finally {
      setSyncingId(null);
    }
  };

  // Send payment reminder
  const handleSendReminder = async (invoice: Invoice) => {
    setSyncingId(invoice.id);
    setActionMessage(null);

    try {
      const res = await fetch('/api/paypal/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send reminder');
      }

      setActionMessage({
        type: 'success',
        text: `Payment reminder sent to ${invoice.customer_name} via PayPal Sandbox!`
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to send reminder.'
      });
    } finally {
      setSyncingId(null);
    }
  };

  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.amount), 0);
  const totalPaid = invoices.filter(i => i.paypal_status === 'PAID').reduce((acc, i) => acc + Number(i.amount), 0);
  const totalPending = invoices.filter(i => i.paypal_status === 'SENT' || i.paypal_status === 'UNPAID').reduce((acc, i) => acc + Number(i.amount), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
              <FileText className="w-4 h-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
              {t('invoices')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real PayPal Sandbox Invoicing REST API &bull; Live Payment Tracking & Refresh
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sandbox Invoicing API Active</span>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
          actionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <div className="flex-1 text-xs sm:text-sm font-medium">{actionMessage.text}</div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600 text-xs">Dismiss</button>
        </div>
      )}

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-brand-100 shadow-card">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Confirmed Paid</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">${totalPaid.toFixed(2)} USD</p>
          <p className="text-xs text-slate-500 mt-1">Verified by PayPal API</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-brand-100 shadow-card">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Customer Payments</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">${totalPending.toFixed(2)} USD</p>
          <p className="text-xs text-slate-500 mt-1">Invoices sent & waiting payment</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-brand-100 shadow-card">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced Amount</p>
          <p className="text-2xl font-bold text-brand-950 mt-1">${totalInvoiced.toFixed(2)} USD</p>
          <p className="text-xs text-slate-500 mt-1">{invoices.length} total invoices in records</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-brand-100 p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'DRAFT', 'SENT', 'PAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'text-slate-600 hover:text-brand-900 hover:bg-brand-50'
              }`}
            >
              {st === 'ALL' ? 'All Invoices' : st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or customer..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-cream-50/50"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-cream-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status & Type</th>
                <th className="py-3 px-4">PayPal Invoice ID</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-cream-50/40 transition-colors">
                    {/* Invoice Number */}
                    <td className="py-3 px-4 font-mono font-bold text-brand-950">
                      {inv.invoice_number}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{inv.customer_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{inv.customer_email}</p>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">${Number(inv.amount).toFixed(2)}</span>{' '}
                      <span className="text-[11px] text-slate-400">{inv.currency}</span>
                    </td>

                    {/* Status & Demo/Live badge */}
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.paypal_status} isDemo={Boolean(inv.is_demo)} />
                    </td>

                    {/* PayPal ID */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {inv.paypal_invoice_id || 'Pending Generation'}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* View Details */}
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-900 hover:bg-brand-50"
                        title="View Full Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Refresh Live Status */}
                      <button
                        onClick={() => handleRefreshStatus(inv)}
                        disabled={syncingId === inv.id}
                        className="p-1.5 rounded-lg text-brand-600 hover:text-brand-900 hover:bg-brand-50"
                        title="Refresh Live Status with PayPal API"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingId === inv.id ? 'animate-spin' : ''}`} />
                      </button>

                      {/* If Draft: Send Invoice */}
                      {inv.paypal_status === 'DRAFT' && (
                        <button
                          onClick={() => handleSendInvoice(inv)}
                          disabled={syncingId === inv.id}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium text-[11px] hover:bg-emerald-700 shadow-sm"
                          title="Send Invoice to Customer"
                        >
                          Send Invoice
                        </button>
                      )}

                      {/* If Sent: Open Payment Link */}
                      {(inv.paypal_status === 'SENT' || inv.paypal_status === 'UNPAID') && inv.payment_url && (
                        <a
                          href={inv.payment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-800 font-semibold text-[11px] hover:bg-brand-100 border border-brand-200"
                          title="Open Customer PayPal Payment Link"
                        >
                          <span>Pay Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {/* Send Reminder */}
                      {(inv.paypal_status === 'SENT' || inv.paypal_status === 'UNPAID') && (
                        <button
                          onClick={() => handleSendReminder(inv)}
                          disabled={syncingId === inv.id}
                          className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                          title="Send PayPal Reminder"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No invoices matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 border border-brand-200 shadow-elevated relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedInvoice(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-950">
                  Invoice {selectedInvoice.invoice_number}
                </h3>
                <p className="text-xs text-slate-500">
                  Created {new Date(selectedInvoice.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Status & Badges */}
            <div className="p-4 rounded-2xl bg-cream-50 border border-brand-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Status</span>
                <StatusBadge status={selectedInvoice.paypal_status} isDemo={Boolean(selectedInvoice.is_demo)} />
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Amount</span>
                <span className="text-xl font-bold text-slate-900">${Number(selectedInvoice.amount).toFixed(2)} {selectedInvoice.currency}</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Customer</span>
                  <span className="font-semibold text-slate-800">{selectedInvoice.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Email</span>
                  <span className="font-mono text-slate-700">{selectedInvoice.customer_email}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block">PayPal Invoice ID</span>
                  <span className="font-mono text-brand-800 font-semibold">{selectedInvoice.paypal_invoice_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Order Ref</span>
                  <span className="font-mono text-slate-700">{selectedInvoice.order_id || 'N/A'}</span>
                </div>
              </div>

              {selectedInvoice.payment_url && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5">
                  <span className="text-purple-900 font-bold text-[11px] uppercase tracking-wider block">Customer Payment Link</span>
                  <p className="text-[11px] text-purple-700 font-mono break-all">{selectedInvoice.payment_url}</p>
                  <a
                    href={selectedInvoice.payment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-900 hover:underline pt-1"
                  >
                    <span>Open PayPal Payment Page in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleRefreshStatus(selectedInvoice)}
                disabled={syncingId === selectedInvoice.id}
                className="px-4 py-2 rounded-xl border border-brand-300 text-brand-800 text-xs font-semibold hover:bg-brand-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingId === selectedInvoice.id ? 'animate-spin' : ''}`} />
                <span>Sync with PayPal</span>
              </button>

              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
