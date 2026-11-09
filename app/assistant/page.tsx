'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  BotMessageSquare,
  Sparkles,
  Send,
  User,
  HelpCircle,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  'How much confirmed revenue have I earned this month?',
  'Which customers currently have pending invoices?',
  'What is my top selling product so far?',
  'How many completed vs pending orders do I have?',
  'Give me a cheerful 3-point summary of my business status.'
];

export default function AssistantPage() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: "Hello! I'm Sakhi, your AI business assistant. 🌸 Ask me anything about your orders, confirmed revenue, pending PayPal invoices, or bestsellers. What would you like to know today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryToSend?: string) => {
    const q = queryToSend !== undefined ? queryToSend : inputQuery;
    if (!q.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.trim() })
      });
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg_asst_${Date.now()}`,
        sender: 'assistant',
        text: data.success ? data.answer : (data.error || 'I had trouble getting that info. Please try again!'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'assistant',
          text: 'Oops, something went wrong while analyzing your business records. Please try again!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sakhi-pink flex items-center justify-center text-white shadow-soft">
            <BotMessageSquare className="w-4 h-4" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-950 tracking-tight">
            {t('assistant')}
          </h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Friendly business intelligence powered by your real stored orders and PayPal Sandbox invoices
        </p>
      </div>

      {/* Suggested Quick Questions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
          Suggestions:
        </span>
        {QUICK_QUESTIONS.map((qq, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qq)}
            className="px-3 py-1.5 rounded-full bg-white border border-brand-200 text-brand-900 hover:bg-brand-50 whitespace-nowrap transition-colors shadow-sm font-medium shrink-0"
          >
            {qq}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-white rounded-3xl border border-brand-100 shadow-card p-6 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                m.sender === 'user'
                  ? 'bg-slate-800 text-white'
                  : 'bg-gradient-to-tr from-brand-600 via-brand-500 to-sakhi-pink text-white shadow-soft'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>

            <div className={`max-w-lg space-y-1 ${m.sender === 'user' ? 'text-right' : ''}`}>
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-none shadow-soft text-left'
                    : 'bg-cream-100/80 border border-brand-200/80 text-brand-950 rounded-tl-none shadow-sm'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-slate-400 block px-1">
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-600 to-sakhi-pink text-white flex items-center justify-center shrink-0 animate-spin">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-cream-100/80 border border-brand-200 text-xs text-slate-500 rounded-tl-none">
              Sakhi is checking your orders and PayPal records...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="bg-white rounded-2xl border border-brand-100 p-2 shadow-card flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask Sakhi about your sales, pending invoices, orders..."
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm text-slate-900 bg-transparent focus:outline-none"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputQuery.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sakhi-pink text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
