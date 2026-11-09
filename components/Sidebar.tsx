'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  ShoppingBag,
  FileText,
  Users,
  Store,
  BarChart3,
  BellRing,
  BotMessageSquare,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const navigation = [
    { name: t('dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('createOrderAI'), href: '/create-order', icon: Sparkles, highlight: true },
    { name: t('orders'), href: '/orders', icon: ShoppingBag },
    { name: t('invoices'), href: '/invoices', icon: FileText },
    { name: t('customers'), href: '/customers', icon: Users },
    { name: t('miniShop'), href: '/shop', icon: Store },
    { name: t('analytics'), href: '/analytics', icon: BarChart3 },
    { name: t('reminders'), href: '/reminders', icon: BellRing },
    { name: t('assistant'), href: '/assistant', icon: BotMessageSquare },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-cream-50 border-r border-brand-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-brand-100 bg-white/70 backdrop-blur">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sakhi-pink flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xl text-brand-950 tracking-tight">SakhiDesk</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 font-semibold uppercase">AI</span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">Your business best friend, in any language.</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Workspace
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-soft font-semibold'
                    : item.highlight
                    ? 'bg-brand-50 text-brand-700 hover:bg-brand-100/70 border border-brand-200'
                    : 'text-slate-600 hover:text-brand-950 hover:bg-white/80'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : item.highlight ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-600'
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {item.highlight && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
                )}
              </Link>
            );
          })}
        </div>

        {/* PayPal Sandbox Status Badge Footer */}
        <div className="p-4 border-t border-brand-100 bg-white/60">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-900">PayPal Invoicing API</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 ml-auto" />
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">
              Sandbox Live Connected &bull; Real REST Invoicing
            </p>
          </div>
          <div className="text-center pt-2.5 text-[11px] text-slate-400 font-medium">
            Made in India 🇮🇳
          </div>
        </div>
      </aside>
    </>
  );
}
