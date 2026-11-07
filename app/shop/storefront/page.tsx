'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Send,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';

interface ShopProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  is_available: number;
  image_url: string;
}

interface CartItem extends ShopProduct {
  quantity: number;
}

export default function PublicStorefrontPage() {
  const [shopData, setShopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [showCartModal, setShowCartModal] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any>(null);

  // Customer form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/shop')
      .then(r => r.json())
      .then(d => {
        if (d.success) setShopData(d.shop);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (product: ShopProduct) => {
    setCart(prev => {
      const existing = prev[product.id];
      if (existing) {
        return { ...prev, [product.id]: { ...existing, quantity: existing.quantity + 1 } };
      }
      return { ...prev, [product.id]: { ...product, quantity: 1 } };
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const existing = prev[productId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: { ...existing, quantity: newQty } };
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  const totalItemCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !cartItems.length) return;
    setIsSubmitting(true);

    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_date: deliveryDate,
        delivery_address: deliveryAddress,
        notes: customerNotes,
        items: cartItems.map(it => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price
        }))
      };

      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSubmittedOrder(data);
        setCart({});
      } else {
        alert(data.error || 'Failed to submit order request');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const seller = shopData?.seller || {
    name: 'Pooja Sharma',
    business_name: "Pooja's Artisan Delights & Boutique",
    category: 'Home Baker & Handcrafted Boutique',
    bio: 'Artisanal cakes, handcrafted designer kurtis, and festive accessories made fresh with love from our home studio in Mumbai.',
    phone: '+91 98765 43210',
    email: 'sb-merchant@business.example.com',
    address: 'Mumbai, India'
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-800 pb-20">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-brand-100 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-brand-950 tracking-tight">
            {seller.business_name}
          </span>
        </div>

        {/* Cart Button */}
        <button
          onClick={() => setShowCartModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-xs sm:text-sm shadow-soft hover:scale-105 transition-all relative"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Order Request ({totalItemCount})</span>
          {totalItemCount > 0 && (
            <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
              ${cartTotal.toFixed(2)}
            </span>
          )}
        </button>
      </header>

      {/* Hero Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <div className="rounded-3xl bg-gradient-to-br from-cream-100 via-white to-brand-50 border border-brand-200/80 p-6 sm:p-10 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-center md:text-left">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 uppercase tracking-wider inline-block">
              {seller.category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-950 tracking-tight">
              {seller.business_name}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {seller.bio}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                {seller.address}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-brand-600" />
                {seller.phone}
              </span>
            </div>
          </div>

          <div className="shrink-0 p-4 rounded-2xl bg-white border border-brand-100 shadow-soft text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="font-bold text-xs text-slate-900">Verified Seller</p>
            <p className="text-[10px] text-slate-400">Powered by SakhiDesk</p>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-brand-950 tracking-tight">
            Available Creations & Delights
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {shopData?.products?.length || 0} items
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shopData?.products && shopData.products.length > 0 ? (
            shopData.products.map((prod: ShopProduct) => {
              const inCartQty = cart[prod.id]?.quantity || 0;
              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-brand-100 shadow-card overflow-hidden flex flex-col justify-between hover:shadow-soft transition-all duration-200 group"
                >
                  <div className="h-48 bg-slate-100 overflow-hidden relative">
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur text-brand-900 shadow-sm uppercase tracking-wider">
                      {prod.category}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-base text-brand-950 group-hover:text-brand-600 transition-colors">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {prod.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xl font-extrabold text-slate-900">${prod.price.toFixed(2)}</span>
                        <span className="text-xs text-slate-400"> / {prod.unit}</span>
                      </div>

                      {inCartQty > 0 ? (
                        <div className="flex items-center bg-brand-50 border border-brand-200 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(prod.id, -1)}
                            className="p-1 rounded-lg hover:bg-brand-100 text-brand-800"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-brand-950">{inCartQty}</span>
                          <button
                            onClick={() => updateQuantity(prod.id, 1)}
                            className="p-1 rounded-lg hover:bg-brand-100 text-brand-800"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(prod)}
                          className="px-3.5 py-2 rounded-xl bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 shadow-soft transition-all flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Request</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 py-16 text-center text-slate-400">
              Loading storefront products...
            </div>
          )}
        </div>
      </main>

      {/* Cart & Order Request Drawer / Modal */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-brand-200 shadow-elevated relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setShowCartModal(false); setSubmittedOrder(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {submittedOrder ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Order Request Received!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {submittedOrder.message}
                  </p>
                  <p className="font-mono text-xs font-bold text-brand-900 mt-2">
                    Request Reference: {submittedOrder.orderNumber}
                  </p>
                </div>
                <button
                  onClick={() => { setShowCartModal(false); setSubmittedOrder(null); }}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-brand-600" />
                  <h3 className="text-lg font-bold text-brand-950">
                    Your Order Request ({totalItemCount} items)
                  </h3>
                </div>

                {cartItems.length > 0 ? (
                  <div className="space-y-4">
                    {/* Items List */}
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden p-2 text-xs">
                      {cartItems.map((item) => (
                        <div key={item.id} className="py-2.5 px-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-[11px] text-slate-400">${item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded">
                                <Minus className="w-3 h-3 text-slate-600" />
                              </button>
                              <span className="px-2 font-bold text-slate-800">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded">
                                <Plus className="w-3 h-3 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 px-2 flex justify-between font-bold text-sm text-brand-950">
                        <span>Total:</span>
                        <span className="text-emerald-700">${cartTotal.toFixed(2)} USD</span>
                      </div>
                    </div>

                    {/* Customer Request Form */}
                    <form onSubmit={handleSubmitOrder} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Your Full Name *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Ananya Verma"
                          className="w-full px-3 py-2 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                          <input
                            type="text"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="+91..."
                            className="w-full px-3 py-2 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="For PayPal invoice"
                            className="w-full px-3 py-2 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Desired Delivery Date</label>
                          <input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-brand-200 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                          <input
                            type="text"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Flat, street, city"
                            className="w-full px-3 py-2 rounded-xl border border-brand-200 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Customization / Notes</label>
                        <textarea
                          rows={2}
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder="Special requests, lettering on cake, sizes..."
                          className="w-full px-3 py-2 rounded-xl border border-brand-200 focus:outline-none"
                        />
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Submitting this request sends your details to the seller. She will review, confirm availability, and send your official PayPal invoice.
                      </p>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-sm shadow-soft hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'Submitting Request...' : 'Submit Order Request'}</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Your order request is empty. Add products from the catalog above!
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
