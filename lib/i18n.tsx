'use client';

import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'hi' | 'hinglish';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    appName: 'SakhiDesk',
    tagline: 'AI Business Assistant for Women Entrepreneurs',
    dashboard: 'Dashboard',
    createOrderAI: 'Create Order with AI',
    orders: 'Orders',
    invoices: 'PayPal Invoices',
    customers: 'Customers',
    miniShop: 'Mini Shop',
    analytics: 'Analytics',
    reminders: 'Reminders & Marketing',
    assistant: 'AI Assistant',
    settings: 'Settings',
    totalRevenue: 'Total Paid Revenue',
    pendingPayments: 'Pending Invoices',
    totalOrders: 'Total Orders',
    completedOrders: 'Completed Orders',
    outstandingInvoices: 'Outstanding Invoices',
    recentOrders: 'Recent Orders',
    recentActivity: 'Recent Customer Activity',
    paymentReminders: 'Upcoming Payment Reminders',
    extractOrderTitle: 'AI Order Extraction',
    extractOrderSubtitle: 'Paste WhatsApp messages, handwritten notes, or images. AI extracts details accurately without guessing.',
    pasteMessage: 'Paste WhatsApp Message',
    uploadPhoto: 'Upload Photo / Handwritten Note',
    sampleMessages: 'Try Sample Order Messages',
    extracting: 'Analyzing message with AI...',
    reviewOrder: 'Seller Approval & Confirmation',
    reviewOrderSubtitle: 'Review extracted details. Highlighted items need your attention before invoice creation.',
    needsAttention: 'Needs Attention',
    customerDetails: 'Customer Details',
    productsAndPricing: 'Products & Pricing',
    deliveryDetails: 'Delivery Details',
    confirmAndCreateInvoice: 'Confirm Order & Create PayPal Invoice',
    saveDraft: 'Save as Draft Order',
    paypalConnected: 'PayPal Sandbox Active',
    demoBadge: 'Demo Data',
    realBadge: 'Live Sandbox',
    refreshStatus: 'Refresh Live Status',
    sendInvoice: 'Send Invoice via PayPal',
    openPaymentLink: 'Open Payment Link',
    copyPaymentLink: 'Copy Payment Link',
    sendReminder: 'Send PayPal Reminder',
    invoiceNumber: 'Invoice #',
    amount: 'Amount',
    status: 'Status',
    date: 'Date',
    actions: 'Actions',
  },
  hi: {
    appName: 'सखीडेस्क',
    tagline: 'महिला उद्यमियों के लिए एआई बिजनेस असिस्टेंट',
    dashboard: 'डैशबोर्ड',
    createOrderAI: 'एआई से नया ऑर्डर बनाएं',
    orders: 'ऑर्डर्स',
    invoices: 'पेपाल इनवॉइस',
    customers: 'ग्राहक सूची',
    miniShop: 'मिनी दुकान',
    analytics: 'व्यापार विश्लेषण',
    reminders: 'पेमेंट तगादा व प्रचार',
    assistant: 'सखी एआई साथी',
    settings: 'सेटिंग्स',
    totalRevenue: 'कुल प्राप्त आमदनी',
    pendingPayments: 'बाकी भुगतान',
    totalOrders: 'कुल ऑर्डर्स',
    completedOrders: 'पूरे हुए ऑर्डर्स',
    outstandingInvoices: 'बकाया इनवॉइस',
    recentOrders: 'हाल के ऑर्डर्स',
    recentActivity: 'ताज़ा ग्राहक हलचल',
    paymentReminders: 'भुगतान रिमाइंडर',
    extractOrderTitle: 'एआई ऑर्डर निष्कर्षण',
    extractOrderSubtitle: 'व्हाट्सएप संदेश, डायरी का पन्ना या फोटो डालें। एआई बिना किसी अनुमान के सही जानकारी निकालेगा।',
    pasteMessage: 'व्हाट्सएप संदेश पेस्ट करें',
    uploadPhoto: 'फोटो या हस्तलिखित पन्ना अपलोड करें',
    sampleMessages: 'नमूना संदेश आज़माएं',
    extracting: 'एआई जानकारी पढ़ रहा है...',
    reviewOrder: 'ऑर्डर समीक्षा व अनुमोदन',
    reviewOrderSubtitle: 'निकाली गई जानकारी की जांच करें। पीले रंग वाले विवरण पर विशेष ध्यान दें।',
    needsAttention: 'ध्यान देने योग्य',
    customerDetails: 'ग्राहक विवरण',
    productsAndPricing: 'उत्पाद और कीमतें',
    deliveryDetails: 'डिलीवरी विवरण',
    confirmAndCreateInvoice: 'ऑर्डर पक्का करें और पेपाल बिल बनाएं',
    saveDraft: 'ड्राफ्ट के रूप में सहेजें',
    paypalConnected: 'पेपाल सैंडबॉक्स सक्रिय',
    demoBadge: 'डेमो डेटा',
    realBadge: 'लाइव सैंडबॉक्स',
    refreshStatus: 'लाइव स्थिति जांचें',
    sendInvoice: 'पेपाल द्वारा इनवॉइस भेजें',
    openPaymentLink: 'पेमेंट लिंक खोलें',
    copyPaymentLink: 'पेमेंट लिंक कॉपी करें',
    sendReminder: 'रिमाइंडर भेजें',
    invoiceNumber: 'इनवॉइस संख्या',
    amount: 'राशि',
    status: 'स्थिति',
    date: 'दिनांक',
    actions: 'कार्रवाई',
  },
  hinglish: {
    appName: 'SakhiDesk',
    tagline: 'Home Business ke liye Smart AI Assistant',
    dashboard: 'Dashboard',
    createOrderAI: '+ AI se Order Banayein',
    orders: 'Orders List',
    invoices: 'PayPal Invoices',
    customers: 'Customers',
    miniShop: 'Mini Online Shop',
    analytics: 'Business Report',
    reminders: 'Reminders & Marketing',
    assistant: 'Sakhi AI Assistant',
    settings: 'Settings',
    totalRevenue: 'Total Paid Kamai',
    pendingPayments: 'Pending Payments',
    totalOrders: 'Kul Orders',
    completedOrders: 'Deliver ho chuke Orders',
    outstandingInvoices: 'Baqi Invoices',
    recentOrders: 'Taaza Orders',
    recentActivity: 'Customer Activity',
    paymentReminders: 'Aane wale Payment Reminders',
    extractOrderTitle: 'AI Order Extraction',
    extractOrderSubtitle: 'WhatsApp message ya diary ki photo paste karein. AI sabhi details bina guess kiye extract karega.',
    pasteMessage: 'WhatsApp Message Paste Karein',
    uploadPhoto: 'Photo ya Notebook Upload Karein',
    sampleMessages: 'Test Sample Messages',
    extracting: 'AI order samajh raha hai...',
    reviewOrder: 'Seller Review & Confirmation',
    reviewOrderSubtitle: 'Details check karein. Yellow warning wale fields ko theek karein fir PayPal invoice banayein.',
    needsAttention: 'Dhyan Dijiye (Needs Attention)',
    customerDetails: 'Customer Details',
    productsAndPricing: 'Products aur Price',
    deliveryDetails: 'Delivery Details',
    confirmAndCreateInvoice: 'Order Confirm Karein & PayPal Invoice Banayein',
    saveDraft: 'Draft Save Karein',
    paypalConnected: 'PayPal Sandbox Active',
    demoBadge: 'Demo Data',
    realBadge: 'Live Sandbox',
    refreshStatus: 'Live Status Check Karein',
    sendInvoice: 'PayPal Invoice Bhejein',
    openPaymentLink: 'Payment Link Kholein',
    copyPaymentLink: 'Payment Link Copy Karein',
    sendReminder: 'Payment Reminder Bhejein',
    invoiceNumber: 'Invoice #',
    amount: 'Raqam',
    status: 'Status',
    date: 'Date',
    actions: 'Actions',
  }
};

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // UI language is forced to English on every load (the language selector was
  // removed). Saved 'hi'/'hinglish' preferences are intentionally not restored
  // so they can never override English.
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sakhidesk_lang', lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
