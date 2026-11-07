'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  DollarSign,
  Clock,
  ExternalLink,
  X,
  CheckCircle2
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  total_orders: number;
  total_spent: number;
  outstanding_balance: number;
  created_at: string;
}

export default function CustomersPage() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          email: formEmail,
          address: formAddress,
          notes: formNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setFormName('');
        setFormPhone('');
        setFormEmail('');
        setFormAddress('');
        setFormNotes('');
        fetchCustomers();
      }
    } catch (err) {
      alert('Error creating customer');
    }
  };

  const totalSpentAll = customers.reduce((acc, c) => acc + Number(c.total_spent || 0), 0);
  const totalOutstanding = customers.reduce((acc, c) => acc + Number(c.outstanding_balance || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
              <Users className="w-4 h-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
              {t('customers')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track customer relationship history, contact info, total spend, and outstanding balances
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-xs sm:text-sm shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-brand-100 shadow-card">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered Customers</p>
          <p className="text-2xl font-bold text-brand-950 mt-1">{customers.length}</p>
          <p className="text-xs text-slate-500 mt-1">Clients across phone & WhatsApp</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-brand-100 shadow-card">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Total Spend</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">${totalSpentAll.toFixed(2)} USD</p>
          <p className="text-xs text-slate-500 mt-1">Cumulative lifetime purchases</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-brand-100 shadow-card">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Balance Due</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">${totalOutstanding.toFixed(2)} USD</p>
          <p className="text-xs text-slate-500 mt-1">Unpaid invoice amounts</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-brand-100 p-4 shadow-card">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-cream-50/50"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-cream-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Total Spent</th>
                <th className="py-3 px-4">Outstanding</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-cream-50/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      {c.notes && <p className="text-[11px] text-brand-600 line-clamp-1 italic">{c.notes}</p>}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <p className="text-slate-800">{c.phone || '-'}</p>
                      <p className="text-[11px] text-slate-400">{c.email || 'No email'}</p>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                      {c.address || 'Unspecified'}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {c.total_orders}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ${Number(c.total_spent).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      {Number(c.outstanding_balance) > 0 ? (
                        <span className="font-bold text-amber-600">${Number(c.outstanding_balance).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">Clear</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {c.phone && (
                        <a
                          href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg mr-1.5 transition-colors"
                        >
                          WhatsApp
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-brand-200 shadow-elevated relative animate-fade-in">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-brand-950">Add New Customer</h3>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sneha Patel"
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Flat, building, area, city"
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Preferences</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Prefers eggless cakes, size M"
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold shadow-soft"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Profile Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-brand-200 shadow-elevated relative animate-fade-in">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">
                {selectedCustomer.name.slice(0, 1)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-950">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedCustomer.email || 'No email registered'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-cream-50 border border-brand-100 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Total Spent</span>
                <span className="text-base font-bold text-emerald-700">${Number(selectedCustomer.total_spent).toFixed(2)} USD</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Pending Due</span>
                <span className="text-base font-bold text-amber-600">${Number(selectedCustomer.outstanding_balance).toFixed(2)} USD</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Total Orders</span>
                <span className="font-semibold text-slate-800">{selectedCustomer.total_orders} orders</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Phone</span>
                <span className="font-semibold text-slate-800">{selectedCustomer.phone || '-'}</span>
              </div>
            </div>

            <div className="text-xs space-y-2">
              <p><span className="font-semibold text-slate-700">Delivery Address:</span> {selectedCustomer.address || 'None saved'}</p>
              {selectedCustomer.notes && (
                <p><span className="font-semibold text-slate-700">Preferences / Notes:</span> {selectedCustomer.notes}</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
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
