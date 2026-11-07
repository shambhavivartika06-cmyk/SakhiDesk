import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  colorScheme?: 'purple' | 'emerald' | 'amber' | 'rose' | 'teal';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'purple',
}: StatCardProps) {
  const schemes = {
    purple: {
      bg: 'bg-brand-50/60',
      border: 'border-brand-200/80',
      iconBg: 'bg-brand-500 text-white',
      valueColor: 'text-brand-950',
    },
    emerald: {
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-200/80',
      iconBg: 'bg-emerald-600 text-white',
      valueColor: 'text-emerald-950',
    },
    amber: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200/80',
      iconBg: 'bg-amber-500 text-white',
      valueColor: 'text-amber-950',
    },
    rose: {
      bg: 'bg-rose-50/50',
      border: 'border-rose-200/80',
      iconBg: 'bg-rose-500 text-white',
      valueColor: 'text-rose-950',
    },
    teal: {
      bg: 'bg-teal-50/50',
      border: 'border-teal-200/80',
      iconBg: 'bg-teal-600 text-white',
      valueColor: 'text-teal-950',
    },
  };

  const scheme = schemes[colorScheme];

  return (
    <div className={`p-5 rounded-2xl bg-white border ${scheme.border} shadow-card hover:shadow-soft transition-all duration-200 relative overflow-hidden group`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold mt-1.5 tracking-tight ${scheme.valueColor}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl ${scheme.iconBg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
