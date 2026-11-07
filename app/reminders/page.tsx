'use client';

import React, { useEffect, useState } from 'react';
import {
  BellRing,
  Sparkles,
  Send,
  Copy,
  Check,
  ExternalLink,
  Clock,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useI18n } from '@/lib/i18n';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  paypal_invoice_id: string;
  paypal_status: string;
  amount: number;
  payment_url: string;
  created_at: string;
  is_demo: number;
}

export default function RemindersAndMarketingPage() {
  const { t } = useI18n();
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Marketing state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi' | 'Hinglish'>('Hinglish');
  const [selectedTone, setSelectedTone] = useState<'friendly' | 'festive' | 'urgent'>('friendly');
  const [generatedPromo, setGeneratedPromo] = useState('');
  const [promoWhatsAppUrl, setPromoWhatsAppUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reminders state
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [invRes, prodRes] = await Promise.all([
        fetch('/api/invoices?status=SENT'),
        fetch('/api/products')
      ]);
      const invData = await invRes.json();
      const prodData = await prodRes.json();

      if (invData.success) {
        setUnpaidInvoices(invData.invoices);
      }
      if (prodData.success) {
        setProducts(prodData.products);
        if (prodData.products.length > 0) {
          setSelectedProductId(prodData.products[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Send PayPal Sandbox Reminder
  const handleSendPayPalReminder = async (inv: Invoice) => {
    setSendingReminderId(inv.id);
    setActionNotice(null);

    try {
      const res = await fetch('/api/paypal/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: inv.id })
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`Official PayPal payment reminder sent to ${inv.customer_name} for Invoice #${inv.invoice_number}!`);
      } else {
        alert(data.error || 'Failed to send reminder');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSendingReminderId(null);
    }
  };

  // Generate AI WhatsApp Promotional Message
  const handleGeneratePromo = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          language: selectedLanguage,
          tone: selectedTone
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedPromo(data.message);
        setPromoWhatsAppUrl(data.whatsappUrl);
      } else {
        alert(data.error || 'Failed to generate promotional message');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPromo = () => {
    navigator.clipboard.writeText(generatedPromo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
            <BellRing className="w-4 h-4" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
            {t('reminders')}
          </h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Collect pending PayPal payments and generate engaging WhatsApp promotional campaigns
        </p>
      </div>

      {actionNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-800">Dismiss</button>
        </div>
      )}

      {/* SECTION 1: UNPAID INVOICES & REMINDERS */}
      <div className="bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-brand-950">
              Outstanding Invoices Pending Payment ({unpaidInvoices.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            PayPal Sandbox Invoices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-cream-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {unpaidInvoices.length > 0 ? (
                unpaidInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-cream-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-950">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{inv.customer_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{inv.customer_email}</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-700">
                      ${Number(inv.amount).toFixed(2)} USD
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.paypal_status} isDemo={Boolean(inv.is_demo)} />
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleSendPayPalReminder(inv)}
                        disabled={sendingReminderId === inv.id}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs border border-amber-200 transition-colors"
                      >
                        {sendingReminderId === inv.id ? 'Sending...' : 'Send PayPal Reminder'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No overdue or pending invoices! All customer payments are up to date. 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: AI WHATSAPP PROMOTIONAL GENERATOR */}
      <div className="bg-white rounded-2xl border border-brand-100 p-6 shadow-card space-y-6">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-sakhi-pink text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-brand-950">
              AI WhatsApp Promotional Message Generator
            </h2>
            <p className="text-xs text-slate-500">
              Create ready-to-share promotional broadcasts in English, Hindi, or Hinglish with product details and ordering link
            </p>
          </div>
        </div>

        {/* Generator Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Product *</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.price.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Hinglish">Hinglish (Natural spoken Hindi in English letters)</option>
              <option value="Hindi">हिन्दी (Hindi Script)</option>
              <option value="English">English</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tone & Occasion</label>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="friendly">Warm & Friendly (Everyday)</option>
              <option value="festive">Festive & Special Occasion ✨</option>
              <option value="urgent">Limited Stock / Weekend Special ⏳</option>
            </select>
          </div>
        </div>

        <div>
          <button
            onClick={handleGeneratePromo}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-xs sm:text-sm shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating with Gemini AI...' : 'Generate WhatsApp Promo Message'}</span>
          </button>
        </div>

        {/* Generated Message Display */}
        {generatedPromo && (
          <div className="p-5 rounded-2xl bg-cream-50 border border-brand-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-900 uppercase tracking-wider">
                Generated Message (Ready for WhatsApp)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedLanguage} &bull; {selectedTone}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-brand-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {generatedPromo}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyPromo}
                className="px-4 py-2 rounded-xl border border-brand-300 text-brand-900 bg-white hover:bg-brand-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-brand-600" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Message'}</span>
              </button>

              {promoWhatsAppUrl && (
                <a
                  href={promoWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-soft flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open WhatsApp with Message Prefilled</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Notice: Opens your WhatsApp app or WhatsApp Web directly with this message ready to send to your customer groups or status broadcast.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
