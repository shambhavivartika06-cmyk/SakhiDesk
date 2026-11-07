'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { I18nProvider } from '@/lib/i18n';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // If viewing the public storefront (e.g. /shop/storefront), render without seller sidebar
  const isPublicStorefront = pathname?.startsWith('/shop/storefront');

  if (isPublicStorefront) {
    return (
      <I18nProvider>
        <div className="min-h-screen bg-cream-50 text-brand-950">
          {children}
        </div>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <div className="min-h-screen flex bg-[#fdfbf7]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </I18nProvider>
  );
}
