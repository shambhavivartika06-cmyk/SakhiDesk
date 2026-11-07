'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  is_available: number;
  image_url: string;
}

export default function MiniShopManagementPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Bakery');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formUnit, setFormUnit] = useState('item');
  const [formImage, setFormImage] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCopyLink = () => {
    const shopUrl = `${window.location.origin}/shop/storefront`;
    navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      const newStatus = product.is_available ? 0 : 1;
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, is_available: newStatus })
      });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: newStatus } : p));
    } catch (err) {
      alert('Error updating availability');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Error deleting product');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formName,
        category: formCategory,
        description: formDescription,
        price: parseFloat(formPrice) || 0,
        unit: formUnit,
        image_url: formImage || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300'
      };

      if (editingProduct) {
        await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: editingProduct.id })
        });
      } else {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (err) {
      alert('Error saving product');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('Bakery');
    setFormDescription('');
    setFormPrice('');
    setFormUnit('item');
    setFormImage('');
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormDescription(p.description);
    setFormPrice(String(p.price));
    setFormUnit(p.unit);
    setFormImage(p.image_url);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
              <Store className="w-4 h-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
              {t('miniShop')} Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Your personal digital product catalog & shareable storefront
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2.5 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand-800 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-brand-600" />}
            <span>{copied ? 'Link Copied!' : 'Copy Shop Link'}</span>
          </button>

          <Link
            href="/shop/storefront"
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white font-semibold text-xs sm:text-sm shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Public Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Shareable Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-cream-100 via-brand-50 to-sakhi-pinkLight/30 border border-brand-200 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider block">
            Digital Storefront URL
          </span>
          <p className="text-sm font-semibold text-brand-950 font-mono">
            {typeof window !== 'undefined' ? `${window.location.origin}/shop/storefront` : 'https://sakhidesk.app/shop/storefront'}
          </p>
          <p className="text-xs text-slate-500">
            Share this link on your WhatsApp bio or Instagram! Customers can browse items and submit order requests directly into your SakhiDesk review inbox.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 shadow-soft flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((prod) => (
          <div
            key={prod.id}
            className={`bg-white rounded-2xl border shadow-card overflow-hidden flex flex-col transition-all group ${
              prod.is_available ? 'border-brand-100' : 'border-slate-200 opacity-75'
            }`}
          >
            {/* Image */}
            <div className="h-44 bg-slate-100 relative overflow-hidden">
              <img
                src={prod.image_url}
                alt={prod.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur text-brand-900 shadow-sm uppercase tracking-wider">
                  {prod.category}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => handleToggleAvailability(prod)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm transition-colors ${
                    prod.is_available
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-slate-600 text-white hover:bg-slate-700'
                  }`}
                >
                  {prod.is_available ? 'In Stock' : 'Out of Stock'}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-brand-950 group-hover:text-brand-600 transition-colors">
                  {prod.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                  {prod.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-slate-900">${prod.price.toFixed(2)}</span>
                  <span className="text-xs text-slate-400"> / {prod.unit}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(prod)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-brand-900 hover:bg-brand-50 transition-colors"
                    title="Edit Product"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-brand-200 shadow-elevated relative animate-fade-in">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-brand-950">
              {editingProduct ? 'Edit Catalog Product' : 'Add Product to Catalog'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Belgian Chocolate Cake"
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 bg-white"
                  >
                    <option value="Bakery">Bakery & Cakes</option>
                    <option value="Apparel">Apparel & Boutique</option>
                    <option value="Jewellery">Handmade Jewellery</option>
                    <option value="Food">Homemade Food & Pickles</option>
                    <option value="Handicrafts">Handicrafts & Decor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="25.00"
                    className="w-full px-3 py-2 rounded-xl border border-brand-200"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit / Measurement</label>
                <input
                  type="text"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  placeholder="e.g. kg, piece, box, set"
                  className="w-full px-3 py-2 rounded-xl border border-brand-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ingredients, size specifications, custom options..."
                  className="w-full px-3 py-2 rounded-xl border border-brand-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-brand-200"
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
                  Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
