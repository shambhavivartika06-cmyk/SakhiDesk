'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Plus,
  Sparkles,
  AlertTriangle,
  FileText,
  Calendar,
  Clock,
  MapPin,
  X,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useI18n } from '@/lib/i18n';

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  customization?: string;
  notes?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_date: string;
  delivery_time: string;
  delivery_address: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  currency: string;
  status: string;
  notes: string;
  original_message: string;
  needs_attention: string[];
  input_type: string;
  paypal_invoice_id: string | null;
  is_demo: number;
  created_at: string;
}

function OrdersContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?status=${filterStatus}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        if (initialId) {
          const match = data.orders.find((o: Order) => o.id === initialId);
          if (match) setSelectedOrder(match);
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, search]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        if (selectedOrder) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (err) {
      alert('Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
              {t('orders')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage customer requests, review AI extracted orders, and track deliveries
          </p>
        </div>

        <Link
          href="/create-order"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-xs sm:text-sm shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('createOrderAI')}</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-brand-100 p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            'ALL',
            'NEW',
            'NEEDS_REVIEW',
            'CONFIRMED',
            'INVOICE_CREATED',
            'PAYMENT_PENDING',
            'PAID',
            'COMPLETED',
            'CANCELLED'
          ].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'text-slate-600 hover:text-brand-900 hover:bg-brand-50'
              }`}
            >
              {st === 'ALL' ? 'All' : st.replace('_', ' ')}
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
            placeholder="Search order or customer..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-cream-50/50"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-cream-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Delivery</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {orders.length > 0 ? (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-cream-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-950">
                      {ord.order_number}
                      {ord.needs_attention && ord.needs_attention.length > 0 && (
                        <span className="block text-[10px] text-amber-600 font-semibold mt-0.5">
                          ⚠️ {ord.needs_attention.length} warning(s)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{ord.customer_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {ord.customer_phone || ord.customer_email || 'No contact specified'}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800 line-clamp-1">
                        {ord.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Custom order'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {ord.items?.length || 0} product(s)
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-slate-800">{ord.delivery_date || 'Unspecified'}</p>
                      <p className="text-[11px] text-slate-400">{ord.delivery_time || ''}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 text-sm">
                        ${Number(ord.total_amount).toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={ord.status} isDemo={Boolean(ord.is_demo)} />
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium text-xs transition-colors"
                      >
                        Review / Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No orders found matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 border border-brand-200 shadow-elevated relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-brand-950">
                    Order {selectedOrder.order_number}
                  </h3>
                  <StatusBadge status={selectedOrder.status} isDemo={Boolean(selectedOrder.is_demo)} />
                </div>
                <p className="text-xs text-slate-500">
                  Placed {new Date(selectedOrder.created_at).toLocaleDateString()} &bull; Source: {selectedOrder.input_type}
                </p>
              </div>
            </div>

            {/* Needs Attention Warnings if any */}
            {selectedOrder.needs_attention && selectedOrder.needs_attention.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Needs Seller Attention</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pt-1">
                  {selectedOrder.needs_attention.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Original Customer Message */}
            {selectedOrder.original_message && (
              <div className="p-4 rounded-xl bg-cream-100/70 border border-brand-200 text-xs space-y-1">
                <span className="font-bold text-brand-900 uppercase tracking-wider text-[10px] block">
                  Original Customer Message
                </span>
                <p className="text-slate-800 italic leading-relaxed">
                  "{selectedOrder.original_message}"
                </p>
              </div>
            )}

            {/* Customer & Delivery Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                  Customer Information
                </span>
                <p className="font-bold text-sm text-slate-900">{selectedOrder.customer_name}</p>
                <p className="text-slate-600">Phone: {selectedOrder.customer_phone || 'N/A'}</p>
                <p className="text-slate-600">Email: {selectedOrder.customer_email || 'Missing email'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                  Delivery Details
                </span>
                <p className="text-slate-800">
                  <span className="font-semibold">Date:</span> {selectedOrder.delivery_date || 'Unspecified'}
                </p>
                <p className="text-slate-800">
                  <span className="font-semibold">Time:</span> {selectedOrder.delivery_time || 'Unspecified'}
                </p>
                <p className="text-slate-800">
                  <span className="font-semibold">Address:</span> {selectedOrder.delivery_address || 'Unspecified'}
                </p>
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-3">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-xs block">
                Itemized Products ({selectedOrder.items?.length || 0})
              </span>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.quantity}x {item.name}
                      </p>
                      {item.customization && (
                        <p className="text-[11px] text-brand-600 italic mt-0.5">
                          Note: {item.customization}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        ${((Number(item.unit_price) || 0) * (item.quantity || 1)).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        ${Number(item.unit_price || 0).toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-1 text-sm font-bold text-brand-950">
                <span>Total Amount:</span>
                <span className="text-base text-emerald-700">${Number(selectedOrder.total_amount).toFixed(2)} USD</span>
              </div>
            </div>

            {/* Status Change & Invoicing Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {selectedOrder.status !== 'CONFIRMED' && selectedOrder.status !== 'PAID' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CONFIRMED')}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-sm"
                  >
                    Confirm Order
                  </button>
                )}
                {selectedOrder.status === 'CONFIRMED' && !selectedOrder.paypal_invoice_id && (
                  <Link
                    href={`/invoices`}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold shadow-sm hover:opacity-95"
                  >
                    Proceed to PayPal Invoicing
                  </Link>
                )}
                {selectedOrder.status !== 'COMPLETED' && selectedOrder.status === 'PAID' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-sm"
                  >
                    Mark as Completed / Delivered
                  </button>
                )}
                {selectedOrder.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50"
                  >
                    Cancel Order
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
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

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
