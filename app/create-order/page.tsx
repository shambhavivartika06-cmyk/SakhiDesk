'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Mic,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Save,
  RotateCcw,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { StatusBadge } from '@/components/StatusBadge';

const SAMPLE_MESSAGES = [
  {
    title: '🎂 2 Chocolate Cakes (Hindi/Hinglish)',
    desc: 'Cake message, missing price & email',
    text: 'Hi didi, mujhe kal ke liye 2 chocolate cakes chahiye, 1 kg each. One cake should have Happy Birthday Aanya written on it. Total price kitna hoga? Delivery tomorrow evening at 6.'
  },
  {
    title: '👗 1 Handcrafted Dress ($60)',
    desc: 'Size M, blue color, $60 price confirmed',
    text: 'Hello, I would like to order 1 handcrafted designer dress in royal blue, size M. The price is $60 USD. Delivery by Friday afternoon please.'
  },
  {
    title: '📿 5 Handmade Bracelets ($5 each)',
    desc: 'Price mentioned ($5 each, total $25)',
    text: 'Hello! I need 5 handmade beaded bracelets. They are $5 each, total $25. Can you deliver by next Monday?'
  }
];

// The Voice Note Transcript input is hidden in the simplified UI (the feature is not
// functional yet). All voice-related code below is preserved; set this to true to restore it.
const SHOW_VOICE_INPUT = false;

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number | '' | null;
  customization?: string;
  notes?: string;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const { t } = useI18n();

  // Input states
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'voice'>('text');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Flow states
  const [step, setStep] = useState<'input' | 'extracting' | 'review' | 'confirmed'>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted & Editable Order State
  const [originalMessage, setOriginalMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [needsAttention, setNeedsAttention] = useState<string[]>([]);
  const [currency, setCurrency] = useState('USD');

  // Confirmed order result
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<any>(null);

  // Handle Image Upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run AI Extraction
  const handleExtractOrder = async (overrideText?: string) => {
    const textToProcess = overrideText !== undefined ? overrideText : inputText;

    if (activeTab === 'text' && !textToProcess.trim()) {
      setErrorMessage('Please paste or type a customer message first.');
      return;
    }

    if (activeTab === 'image' && !selectedImage) {
      setErrorMessage('Please select an order screenshot or notebook image first.');
      return;
    }

    setErrorMessage(null);
    setStep('extracting');

    try {
      const payload: any = {
        mode: activeTab === 'image' ? 'image' : 'text'
      };

      if (activeTab === 'image') {
        payload.imageBase64 = selectedImage;
        payload.mimeType = imageFile?.type || 'image/jpeg';
      } else {
        payload.text = textToProcess;
      }

      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract order details.');
      }

      const ext = data.extracted;

      setOriginalMessage(data.original_text || textToProcess || 'Customer Image');
      setCustomerName(ext.customer_name || 'Customer');
      setCustomerPhone(ext.customer_phone || '');
      setCustomerEmail(ext.customer_email || '');
      setDeliveryDate(ext.delivery_date || '');
      setDeliveryTime(ext.delivery_time || '');
      setDeliveryAddress(ext.delivery_address || '');
      setItems(
        ext.items?.map((it: any) => ({
          name: it.name || 'Custom Product',
          quantity: it.quantity || 1,
          unit_price: it.unit_price !== null && it.unit_price !== undefined ? it.unit_price : '',
          customization: it.customization || '',
          notes: it.notes || ''
        })) || []
      );
      setOrderNotes(ext.additional_notes || '');
      setNeedsAttention(ext.needs_attention || []);
      setCurrency(ext.currency || 'USD');

      setStep('review');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during extraction.');
      setStep('input');
    }
  };

  // Item Management in Review Stage
  const handleAddItem = () => {
    setItems([...items, { name: 'New Item', quantity: 1, unit_price: '', customization: '', notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Subtotal Calculation
  const subtotal = items.reduce((acc, it) => {
    const price = typeof it.unit_price === 'number' ? it.unit_price : parseFloat(String(it.unit_price)) || 0;
    return acc + (price * (it.quantity || 1));
  }, 0);

  const hasUnpricedItems = items.some(it => it.unit_price === '' || it.unit_price === null || isNaN(Number(it.unit_price)));
  const hasMissingEmail = !customerEmail || !customerEmail.includes('@');

  // Submit Confirmed Order
  const handleConfirmOrder = async (isDraft = false) => {
    if (!customerName.trim()) {
      alert('Please enter a customer name.');
      return;
    }

    if (!items.length) {
      alert('Please add at least one item to the order.');
      return;
    }

    if (!isDraft && hasUnpricedItems) {
      alert('Every product must have a confirmed unit price before confirming the order for PayPal Invoicing.');
      return;
    }

    try {
      const orderPayload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        delivery_address: deliveryAddress,
        items: items.map(it => ({
          name: (it.name || 'Custom Item').slice(0, 200),
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          customization: it.customization,
          notes: it.notes
        })),
        notes: orderNotes,
        original_message: originalMessage,
        needs_attention: needsAttention,
        status: isDraft ? 'DRAFT' : 'CONFIRMED',
        currency,
        input_type: activeTab === 'image' ? 'IMAGE' : 'TEXT'
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save order');
      }

      setConfirmedOrder(data.order);
      setStep('confirmed');
    } catch (err: any) {
      alert('Error confirming order: ' + err.message);
    }
  };

  // Generate PayPal Sandbox Invoice immediately from Confirmed Order
  const handleCreatePayPalInvoice = async () => {
    if (!confirmedOrder?.id) return;
    setIsCreatingInvoice(true);
    setErrorMessage(null);

    // Validate customer email before calling PayPal API
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailToTest = (confirmedOrder.customer_email || customerEmail || '').trim();
    if (!emailToTest || !emailRegex.test(emailToTest)) {
      setErrorMessage('Customer email is missing or invalid. PayPal requires a valid customer email (e.g. buyer@example.com) to generate an invoice.');
      setIsCreatingInvoice(false);
      return;
    }

    try {
      const res = await fetch('/api/paypal/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: confirmedOrder.id })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create PayPal invoice.');
      }

      setInvoiceResult(data.invoice);
    } catch (err: any) {
      setErrorMessage(err.message || 'PayPal invoice creation failed.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Send the invoice via PayPal API
  const handleSendInvoice = async () => {
    if (!invoiceResult?.id && !invoiceResult?.paypal_invoice_id) return;
    setIsCreatingInvoice(true);
    setErrorMessage(null);

    try {
      const invId = invoiceResult.paypal_invoice_id || invoiceResult.id;
      const res = await fetch('/api/paypal/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send invoice via PayPal.');
      }

      const activePayLink = data.payLink || data.paymentUrl;
      alert(`PayPal invoice sent successfully! Status is now SENT.\nPay Link: ${activePayLink}`);
      router.push('/invoices');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send invoice via PayPal.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
              {t('extractOrderTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {t('extractOrderSubtitle')}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={`px-3 py-1 rounded-full ${step === 'input' ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-800'}`}>
            1. Input
          </span>
          <span className="text-slate-300">&rarr;</span>
          <span className={`px-3 py-1 rounded-full ${step === 'review' ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-800'}`}>
            2. Seller Approval
          </span>
          <span className="text-slate-300">&rarr;</span>
          <span className={`px-3 py-1 rounded-full ${step === 'confirmed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            3. PayPal Invoice
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Notice</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 text-xs">Dismiss</button>
        </div>
      )}

      {/* STEP 1: INPUT MESSAGE OR IMAGE */}
      {step === 'input' && (
        <div className="space-y-6">
          {/* Sample Prompts Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-cream-100 via-white to-brand-50 border border-brand-200/80 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-brand-900 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                {t('sampleMessages')} (One-Click Test)
              </span>
              <span className="text-[11px] text-slate-500">Click any sample to test Gemini AI Extraction</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_MESSAGES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(sample.text);
                    setActiveTab('text');
                    handleExtractOrder(sample.text);
                  }}
                  className="text-left p-3.5 rounded-xl bg-white border border-brand-200/70 hover:border-brand-500 hover:shadow-soft transition-all group"
                >
                  <p className="text-xs font-bold text-brand-950 group-hover:text-brand-600 transition-colors">
                    {sample.title}
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    {sample.desc}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 italic">
                    "{sample.text}"
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Input Card */}
          <div className="bg-white rounded-2xl border border-brand-100 shadow-card p-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-brand-100 pb-4 mb-5">
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'text'
                    ? 'bg-brand-600 text-white shadow-soft'
                    : 'text-slate-600 hover:text-brand-900 hover:bg-brand-50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp / Text Message</span>
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'image'
                    ? 'bg-brand-600 text-white shadow-soft'
                    : 'text-slate-600 hover:text-brand-900 hover:bg-brand-50'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Screenshot / Notebook Photo</span>
              </button>
              {SHOW_VOICE_INPUT && (
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === 'voice'
                      ? 'bg-brand-600 text-white shadow-soft'
                      : 'text-slate-600 hover:text-brand-900 hover:bg-brand-50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>Voice Note Transcript</span>
                </button>
              )}
            </div>

            {/* Tab 1: Text Input */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Paste Customer Message (English, Hindi, or Hinglish)
                  </label>
                  <textarea
                    rows={5}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="e.g. 'Hi didi, mujhe kal ke liye 2 chocolate cakes chahiye 1 kg each. One cake should have Happy Birthday Aanya written on it. Total price kitna hoga? Delivery tomorrow evening at 6.'"
                    className="w-full p-4 rounded-xl border border-brand-200 bg-cream-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm leading-relaxed"
                  />
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  SakhiDesk extracts items, quantities, dates, and alerts you to missing prices or email.
                </p>
              </div>
            )}

            {/* Tab 2: Image Upload */}
            {activeTab === 'image' && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Upload WhatsApp Chat Screenshot or Photo of Handwritten Order Slip
                </label>
                <div className="border-2 border-dashed border-brand-200 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors bg-cream-50/30">
                  {selectedImage ? (
                    <div className="space-y-3">
                      <img src={selectedImage} alt="Order preview" className="max-h-64 mx-auto rounded-xl shadow-card object-contain" />
                      <button
                        onClick={() => { setSelectedImage(null); setImageFile(null); }}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Remove and select another image
                      </button>
                    </div>
                  ) : (
                    <div>
                      <ImageIcon className="w-12 h-12 text-brand-300 mx-auto mb-3" />
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-xs hover:bg-brand-700 shadow-soft">
                        <span>Browse Image</span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                      <p className="text-xs text-slate-400 mt-2">Supports JPG, PNG, WEBP (Max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Voice Note (hidden in simplified UI — see SHOW_VOICE_INPUT) */}
            {SHOW_VOICE_INPUT && activeTab === 'voice' && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Voice Note Order
                </label>
                <div className="p-6 rounded-2xl bg-brand-50/50 border border-brand-200 text-center space-y-3">
                  <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                    isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-brand-600 text-white'
                  }`}>
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        if (!isRecording) {
                          setIsRecording(true);
                          setTimeout(() => {
                            setIsRecording(false);
                            setInputText("Hi didi, mujhe 2 custom dresses chahiye royal blue color me. Delivery next Friday tak.");
                            setActiveTab('text');
                          }, 3000);
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-brand-300 text-brand-900 hover:bg-brand-100 transition-colors"
                    >
                      {isRecording ? 'Recording customer voice... (Listening)' : 'Record Voice Note (Demo Simulation)'}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">
                      Transcribes spoken customer instructions in Hindi or English directly into the text parser.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleExtractOrder()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-sm shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Extract Order with AI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: EXTRACTING ANIMATION */}
      {step === 'extracting' && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sakhi-pink text-white mx-auto flex items-center justify-center animate-spin">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-950">
              {t('extracting')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Gemini AI is parsing items, quantities, Hindi/Hinglish phrasing, checking the catalog for pricing, and flagging any missing information...
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: SELLER APPROVAL AND ORDER REVIEW */}
      {step === 'review' && (
        <div className="space-y-6">
          {/* Header alert */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-900 shadow-sm flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">
                Mandatory Seller Review & Approval
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                SakhiDesk never sends an invoice automatically. Please review extracted information, fill in missing prices or email if flagged below, and confirm.
              </p>
            </div>
          </div>

          {/* Needs Attention Warning Box (Yellow) */}
          {needsAttention.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 shadow-soft space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-amber-950 uppercase tracking-wider">
                  ⚠️ Needs Attention ({needsAttention.length})
                </h3>
              </div>
              <ul className="space-y-1 text-xs text-amber-900 list-disc list-inside">
                {needsAttention.map((warning, idx) => (
                  <li key={idx} className="font-medium">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Two-Column Layout: Original Message vs Extracted Editable Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Original Message */}
            <div className="bg-cream-100/70 rounded-2xl border border-brand-200 p-5 space-y-3">
              <span className="text-xs font-bold text-brand-900 uppercase tracking-wider block">
                Original Customer Message
              </span>
              <div className="p-4 rounded-xl bg-white border border-brand-200 text-slate-800 text-sm italic leading-relaxed whitespace-pre-wrap">
                "{originalMessage}"
              </div>
              <p className="text-[11px] text-slate-500">
                Preserved verbatim for reference and dispute prevention.
              </p>
            </div>

            {/* Right Column (2 cols): Editable Order Review */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Contact Details */}
              <div className="bg-white rounded-2xl border border-brand-100 shadow-card p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {t('customerDetails')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-brand-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone with country code"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-brand-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer Email {hasMissingEmail && <span className="text-amber-600 font-bold">* (PayPal Req)</span>}
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. buyer@example.com"
                      className={`w-full px-3 py-2 text-sm rounded-xl border focus:ring-2 focus:outline-none ${
                        hasMissingEmail
                          ? 'border-amber-400 bg-amber-50/60 focus:ring-amber-500'
                          : 'border-brand-200 focus:ring-brand-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Products & Pricing */}
              <div className="bg-white rounded-2xl border border-brand-100 shadow-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {t('productsAndPricing')}
                  </h3>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const isUnpriced = item.unit_price === '' || item.unit_price === null || isNaN(Number(item.unit_price));
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isUnpriced ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-slate-50/40'
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          {/* Item Name */}
                          <div className="sm:col-span-5">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Product Name</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white"
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              Unit Price ($) {isUnpriced && <span className="text-amber-600 font-bold">*</span>}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_price === null ? '' : item.unit_price}
                              onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                              placeholder="Enter price"
                              className={`w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border bg-white ${
                                isUnpriced ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'
                              }`}
                            />
                          </div>

                          {/* Total & Delete */}
                          <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                            <span className="text-xs font-bold text-slate-900">
                              ${((Number(item.unit_price) || 0) * (item.quantity || 1)).toFixed(2)}
                            </span>
                            {items.length > 1 && (
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Customization Details */}
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                          <input
                            type="text"
                            value={item.customization || ''}
                            onChange={(e) => handleItemChange(idx, 'customization', e.target.value)}
                            placeholder="Customization: (e.g. 'Happy Birthday Aanya', Size M, Blue color)"
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white/80 text-slate-700 italic"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal summary */}
                <div className="flex items-center justify-between pt-3 border-t border-brand-100">
                  <span className="text-xs text-slate-500 font-medium">Estimated Order Subtotal</span>
                  <span className="text-lg font-bold text-brand-950">
                    ${subtotal.toFixed(2)} {currency}
                  </span>
                </div>
              </div>

              {/* Delivery & Address */}
              <div className="bg-white rounded-2xl border border-brand-100 shadow-card p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {t('deliveryDetails')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Date</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-brand-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Time</label>
                    <input
                      type="text"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      placeholder="e.g. 6:00 PM evening"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-brand-200"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Address</label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Street address, city, landmark"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-brand-200"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                <button
                  onClick={() => setStep('input')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  &larr; Back to Input
                </button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleConfirmOrder(true)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-brand-300 text-brand-800 text-xs font-semibold hover:bg-brand-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{t('saveDraft')}</span>
                  </button>
                  <button
                    onClick={() => handleConfirmOrder(false)}
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white text-xs sm:text-sm font-semibold shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Order & Proceed</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: ORDER CONFIRMED & PAYPAL INVOICE ACTION */}
      {step === 'confirmed' && confirmedOrder && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-soft p-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Order Confirmed Successfully!
            </h2>
            <p className="text-sm text-slate-500">
              Order <span className="font-mono font-bold text-brand-900">{confirmedOrder.order_number}</span> is saved and ready for PayPal Sandbox Invoicing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-cream-50 border border-brand-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-900">{confirmedOrder.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Confirmed Amount:</span>
              <span className="font-bold text-emerald-700 text-sm">${Number(confirmedOrder.total_amount).toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <StatusBadge status={confirmedOrder.status} />
            </div>
          </div>

          {/* Real Error Message Display */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Real PayPal Sandbox Invoicing Action */}
          {!invoiceResult ? (
            <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  Step 2: Generate Real PayPal Sandbox Invoice
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold uppercase">API Live</span>
              </div>
              <p className="text-xs text-purple-800 leading-relaxed">
                Creates a real draft invoice on PayPal Sandbox using REST API (<code className="font-mono bg-purple-100 px-1 rounded">POST /v2/invoicing/invoices</code>).
              </p>
              <button
                onClick={handleCreatePayPalInvoice}
                disabled={isCreatingInvoice}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm shadow-soft hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isCreatingInvoice ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Communicating with PayPal Sandbox API...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Create Real PayPal Draft Invoice</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  PayPal Invoice Created
                </span>
                <StatusBadge status="INVOICE_CREATED" />
              </div>
              <div className="text-xs text-emerald-800 font-mono space-y-1">
                <p>PayPal Invoice ID: <span className="font-bold">{invoiceResult.paypal_invoice_id}</span></p>
                <p>Invoice Number: <span className="font-bold">{invoiceResult.invoice_number}</span></p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleSendInvoice}
                  disabled={isCreatingInvoice}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Send Invoice via PayPal</span>
                </button>
                <button
                  onClick={() => router.push('/invoices')}
                  className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100/60"
                >
                  View Invoices List
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
