import React from 'react';

interface StatusBadgeProps {
  status: string;
  isDemo?: boolean;
}

export function StatusBadge({ status, isDemo }: StatusBadgeProps) {
  const normStatus = (status || '').toUpperCase();

  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';
  let label = status;

  switch (normStatus) {
    case 'PAID':
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dot = 'bg-emerald-500';
      label = 'Paid';
      break;
    case 'SENT':
    case 'PAYMENT_PENDING':
      bg = 'bg-amber-50 text-amber-700 border-amber-200';
      dot = 'bg-amber-500';
      label = normStatus === 'SENT' ? 'Sent (Pending)' : 'Payment Pending';
      break;
    case 'CONFIRMED':
      bg = 'bg-blue-50 text-blue-700 border-blue-200';
      dot = 'bg-blue-500';
      label = 'Confirmed';
      break;
    case 'INVOICE_CREATED':
      bg = 'bg-purple-50 text-purple-700 border-purple-200';
      dot = 'bg-purple-500';
      label = 'Invoice Created';
      break;
    case 'NEEDS_REVIEW':
      bg = 'bg-rose-50 text-rose-700 border-rose-200';
      dot = 'bg-rose-500 animate-pulse';
      label = 'Needs Review';
      break;
    case 'NEW':
      bg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      dot = 'bg-indigo-500';
      label = 'New Request';
      break;
    case 'COMPLETED':
      bg = 'bg-teal-50 text-teal-700 border-teal-200';
      dot = 'bg-teal-500';
      label = 'Completed';
      break;
    case 'DRAFT':
      bg = 'bg-gray-100 text-gray-700 border-gray-200';
      dot = 'bg-gray-400';
      label = 'Draft';
      break;
    case 'CANCELLED':
      bg = 'bg-red-50 text-red-600 border-red-200';
      dot = 'bg-red-400';
      label = 'Cancelled';
      break;
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
        {label}
      </span>
      {isDemo !== undefined && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
          isDemo
            ? 'bg-amber-100 text-amber-800 border border-amber-200'
            : 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold'
        }`}>
          {isDemo ? 'Demo' : 'PayPal Sandbox'}
        </span>
      )}
    </div>
  );
}
