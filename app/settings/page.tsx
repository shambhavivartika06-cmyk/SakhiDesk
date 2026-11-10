'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Save,
  Sparkles
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function SettingsPage() {
  const { t } = useI18n();
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bio, setBio] = useState('');

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.seller) {
          setSeller(d.seller);
          setName(d.seller.name || '');
          setBusinessName(d.seller.business_name || '');
          setCategory(d.seller.category || '');
          setPhone(d.seller.phone || '');
          setEmail(d.seller.email || '');
          setAddress(d.seller.address || '');
          setUpiId(d.seller.upi_id || '');
          setCurrency(d.seller.currency || 'USD');
          setBio(d.seller.bio || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          business_name: businessName,
          category,
          phone,
          email,
          address,
          upi_id: upiId,
          currency,
          bio
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save business settings.');
      }
      if (data.seller) {
        setSeller(data.seller);
      }
      // Notify the header (and any other listeners) to refresh the business identity immediately
      window.dispatchEvent(new Event('seller-updated'));
      setSaveNotice(true);
      setTimeout(() => setSaveNotice(false), 3000);
    } catch (err: any) {
      alert('Could not save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
            <SettingsIcon className="w-4 h-4" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
            {t('settings')} & Business Profile
          </h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Manage your business branding, contact details, and PayPal Sandbox integration
        </p>
      </div>

      {saveNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Business settings updated successfully!</span>
        </div>
      )}

      {/* SECTION 1: PAYPAL SANDBOX INTEGRATION STATUS */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <h3 className="font-bold text-sm text-emerald-950 uppercase tracking-wider">
              PayPal Sandbox REST API Integration Active
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            Connected
          </span>
        </div>
        <p className="text-xs text-emerald-800 leading-relaxed">
          SakhiDesk is connected to PayPal Developer Sandbox via OAuth 2.0 Client Credentials flow.
          Invoices are created and sent through the live endpoint <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300">https://api-m.sandbox.paypal.com/v2/invoicing/invoices</code>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-emerald-900">
          <div className="p-2 rounded-lg bg-white/70 border border-emerald-200">
            <span className="text-slate-400 block text-[10px]">PAYPAL_ENV</span>
            sandbox
          </div>
          <div className="p-2 rounded-lg bg-white/70 border border-emerald-200">
            <span className="text-slate-400 block text-[10px]">DEFAULT CURRENCY</span>
            USD (Configurable)
          </div>
          <div className="p-2 rounded-lg bg-white/70 border border-emerald-200">
            <span className="text-slate-400 block text-[10px]">AI MODEL</span>
            Gemini 3.5 Flash Lite
          </div>
        </div>
      </div>

      {/* SECTION 2: SELLER PROFILE FORM */}
      <div className="bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-6">
        <h3 className="font-bold text-base text-brand-950">
          Seller & Business Information
        </h3>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Entrepreneur Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PayPal Merchant Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone with country code"
                className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            {/* UPI ID field hidden per country-neutral requirements (code and state preserved) */}
            <div className="hidden">
              <label className="block font-semibold text-slate-700 mb-1">UPI ID (Optional)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency</label>
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-brand-200 text-xs text-slate-700 font-medium flex items-center h-[38px]">
                Customers pay in USD through PayPal.
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Studio Address / Location</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Your studio address"
              className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Business Bio / Story</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-xs sm:text-sm shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
