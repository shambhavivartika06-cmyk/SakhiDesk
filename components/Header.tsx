'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Sparkles, Globe, Bell, Store } from 'lucide-react';
import { useI18n, Language } from '@/lib/i18n';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <header className="sticky top-0 z-30 h-20 bg-cream-50/80 backdrop-blur-md border-b border-brand-100 px-4 sm:px-6 flex items-center justify-between">
      {/* Left side: hamburger + title info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-brand-900 hover:bg-white border border-brand-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-brand-950">Pooja's Artisan Delights & Boutique</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">Sandbox Verified</span>
          </div>
          <p className="text-xs text-slate-500">Home Baker & Handcrafted Boutique &bull; Global orders</p>
        </div>
      </div>

      {/* Right side: Language Selector + Quick Actions + Mini Shop link */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language selector */}
        <div className="flex items-center bg-white/90 border border-brand-200 rounded-xl p-1 shadow-sm">
          <Globe className="w-3.5 h-3.5 text-brand-600 ml-1.5 mr-1 hidden sm:block" />
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 text-xs rounded-lg transition-colors font-medium ${
              language === 'en' ? 'bg-brand-600 text-white font-semibold' : 'text-slate-600 hover:text-brand-900'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-2 py-1 text-xs rounded-lg transition-colors font-medium ${
              language === 'hi' ? 'bg-brand-600 text-white font-semibold' : 'text-slate-600 hover:text-brand-900'
            }`}
          >
            हिन्दी
          </button>
          <button
            onClick={() => setLanguage('hinglish')}
            className={`px-2 py-1 text-xs rounded-lg transition-colors font-medium ${
              language === 'hinglish' ? 'bg-brand-600 text-white font-semibold' : 'text-slate-600 hover:text-brand-900'
            }`}
          >
            Hinglish
          </button>
        </div>

        {/* View Mini Shop */}
        <Link
          href="/shop"
          className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-brand-700 bg-white hover:bg-brand-50 border border-brand-200 rounded-xl transition-colors shadow-sm"
        >
          <Store className="w-3.5 h-3.5 text-brand-600" />
          <span>Mini Shop</span>
        </Link>

        {/* Quick Action: + Create Order with AI */}
        <Link
          href="/create-order"
          className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-sakhi-pink rounded-xl hover:shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden xs:inline">{t('createOrderAI')}</span>
          <span className="xs:hidden">+ AI Order</span>
        </Link>

        {/* Notification Bell */}
        <Link
          href="/reminders"
          className="p-2 rounded-xl text-slate-600 hover:text-brand-900 hover:bg-white border border-brand-100 relative transition-colors shadow-sm"
          title="Notifications & Reminders"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
        </Link>
      </div>
    </header>
  );
}
