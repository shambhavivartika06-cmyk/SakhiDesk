import type Database from 'better-sqlite3';

/**
 * Single source of truth for business metrics.
 *
 * Both /api/dashboard and /api/analytics import from here so the two pages
 * can never drift apart again.
 *
 * Definitions used consistently everywhere:
 *  - Total orders: every unique stored order (including cancelled ones).
 *  - Paid online sales: verified PayPal invoices only (paypal_status = 'PAID').
 *    A pending/draft invoice is NEVER counted as paid revenue.
 *  - Pending payments: outstanding invoices (paypal_status 'SENT' or 'UNPAID').
 *  - Pipeline: mutually exclusive status buckets that always sum to the total order count.
 *  - Offline sales: manually recorded cash/other sales, stored separately from online orders.
 */

export interface PipelineBucket {
  key: string;
  name: string;
  count: number;
  color: string;
}

export interface MonthPoint {
  month: string; // 'YYYY-MM'
  label: string; // 'Nov'
  paid: number; // verified PayPal payments recorded that month
  pending: number; // invoices sent & awaiting payment that month
  offline: number; // offline sales recorded that month
  total: number; // paid + offline (recorded sales)
}

export interface OnlineTotals {
  paidOnline: number;
  paidOnlineCount: number;
  paidOnlineDemo: number;
  pendingPayments: number;
  pendingCount: number;
  pendingDemo: number;
  draftAmount: number;
  draftCount: number;
  outstandingInvoices: number;
  totalOrders: number;
  completedOrders: number;
}

const PIPELINE_BUCKETS: { key: string; name: string; statuses: string[]; color: string }[] = [
  { key: 'paid', name: 'Paid / Completed', statuses: ['PAID', 'COMPLETED'], color: '#10B981' },
  { key: 'pending', name: 'Payment Pending', statuses: ['PAYMENT_PENDING'], color: '#F59E0B' },
  { key: 'confirmed', name: 'Confirmed / Invoiced', statuses: ['CONFIRMED', 'INVOICE_CREATED'], color: '#8B5CF6' },
  { key: 'review', name: 'Needs Review', statuses: ['NEEDS_REVIEW'], color: '#EF4444' },
  { key: 'new', name: 'New Requests', statuses: ['NEW'], color: '#6366F1' },
  { key: 'cancelled', name: 'Cancelled', statuses: ['CANCELLED'], color: '#94A3B8' },
];

/**
 * Groups every order into exactly one bucket. The buckets therefore always add up
 * to the total order count — any unknown status is surfaced as "Other" instead of
 * silently disappearing (the bug that previously made the pipeline total 26 vs 28).
 */
export function getOrderPipeline(db: Database.Database): { buckets: PipelineBucket[]; total: number } {
  const rows = db
    .prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status')
    .all() as { status: string; count: number }[];

  const counts: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const key = (r.status || '').toUpperCase();
    counts[key] = (counts[key] || 0) + r.count;
    total += r.count;
  }

  const used = new Set<string>();
  const buckets: PipelineBucket[] = PIPELINE_BUCKETS.map((b) => {
    let count = 0;
    for (const s of b.statuses) {
      count += counts[s] || 0;
      used.add(s);
    }
    return { key: b.key, name: b.name, count, color: b.color };
  });

  let other = 0;
  for (const [status, count] of Object.entries(counts)) {
    if (!used.has(status)) other += count;
  }
  if (other > 0) {
    buckets.push({ key: 'other', name: 'Other', count: other, color: '#CBD5E1' });
  }

  return { buckets, total };
}

export function getOnlineTotals(db: Database.Database): OnlineTotals {
  const paid = db
    .prepare("SELECT COALESCE(SUM(amount),0) v, COUNT(*) c FROM invoices WHERE paypal_status = 'PAID'")
    .get() as { v: number; c: number };
  const paidDemo = db
    .prepare("SELECT COALESCE(SUM(amount),0) v FROM invoices WHERE paypal_status = 'PAID' AND is_demo = 1")
    .get() as { v: number };
  const pending = db
    .prepare("SELECT COALESCE(SUM(amount),0) v, COUNT(*) c FROM invoices WHERE paypal_status IN ('SENT','UNPAID')")
    .get() as { v: number; c: number };
  const pendingDemo = db
    .prepare("SELECT COALESCE(SUM(amount),0) v FROM invoices WHERE paypal_status IN ('SENT','UNPAID') AND is_demo = 1")
    .get() as { v: number };
  const draft = db
    .prepare("SELECT COALESCE(SUM(amount),0) v, COUNT(*) c FROM invoices WHERE paypal_status = 'DRAFT'")
    .get() as { v: number; c: number };
  const totalOrders = (db.prepare('SELECT COUNT(*) c FROM orders').get() as { c: number }).c;
  const completedOrders = (
    db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('PAID','COMPLETED')").get() as { c: number }
  ).c;

  return {
    paidOnline: Number(paid.v),
    paidOnlineCount: paid.c,
    paidOnlineDemo: Number(paidDemo.v),
    pendingPayments: Number(pending.v),
    pendingCount: pending.c,
    pendingDemo: Number(pendingDemo.v),
    draftAmount: Number(draft.v),
    draftCount: draft.c,
    outstandingInvoices: pending.c,
    totalOrders,
    completedOrders,
  };
}

export function getOfflineTotals(db: Database.Database): { offlineTotal: number; offlineCount: number } {
  const row = db
    .prepare('SELECT COALESCE(SUM(amount),0) v, COUNT(*) c FROM offline_sales WHERE is_test = 0')
    .get() as { v: number; c: number };
  return { offlineTotal: Number(row.v), offlineCount: row.c };
}

export function listOfflineByMonth(db: Database.Database, month: string): any[] {
  return db
    .prepare(
      "SELECT * FROM offline_sales WHERE is_test = 0 AND substr(sale_date,1,7) = ? ORDER BY sale_date DESC, created_at DESC"
    )
    .all(month);
}

/** Returns the last `n` months (oldest first) as { month: 'YYYY-MM', label: 'Nov' }. */
export function lastMonths(n: number): { month: string; label: string }[] {
  const out: { month: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ month, label: d.toLocaleString('en-US', { month: 'short' }) });
  }
  return out;
}

export function getMonthlyPoints(db: Database.Database, n = 6): MonthPoint[] {
  const paidRows = db
    .prepare(
      "SELECT substr(COALESCE(paid_at, created_at),1,7) m, COALESCE(SUM(amount),0) v FROM invoices WHERE paypal_status = 'PAID' GROUP BY m"
    )
    .all() as { m: string; v: number }[];
  const pendingRows = db
    .prepare(
      "SELECT substr(created_at,1,7) m, COALESCE(SUM(amount),0) v FROM invoices WHERE paypal_status IN ('SENT','UNPAID') GROUP BY m"
    )
    .all() as { m: string; v: number }[];
  const offlineRows = db
    .prepare('SELECT substr(sale_date,1,7) m, COALESCE(SUM(amount),0) v FROM offline_sales WHERE is_test = 0 GROUP BY m')
    .all() as { m: string; v: number }[];

  const paidMap = new Map(paidRows.map((r) => [r.m, Number(r.v)]));
  const pendingMap = new Map(pendingRows.map((r) => [r.m, Number(r.v)]));
  const offlineMap = new Map(offlineRows.map((r) => [r.m, Number(r.v)]));

  return lastMonths(n).map(({ month, label }) => {
    const paid = paidMap.get(month) || 0;
    const offline = offlineMap.get(month) || 0;
    return {
      month,
      label,
      paid,
      pending: pendingMap.get(month) || 0,
      offline,
      total: paid + offline,
    };
  });
}

export interface MonthlySummary {
  month: string;
  onlineSales: number;
  offlineSales: number;
  offlineCount: number;
  totalRecorded: number;
}

export function getMonthlySummary(db: Database.Database, month: string): MonthlySummary {
  const online = db
    .prepare(
      "SELECT COALESCE(SUM(amount),0) v FROM invoices WHERE paypal_status = 'PAID' AND substr(COALESCE(paid_at, created_at),1,7) = ?"
    )
    .get(month) as { v: number };
  const offline = db
    .prepare('SELECT COALESCE(SUM(amount),0) v, COUNT(*) c FROM offline_sales WHERE is_test = 0 AND substr(sale_date,1,7) = ?')
    .get(month) as { v: number; c: number };

  const onlineSales = Number(online.v);
  const offlineSales = Number(offline.v);
  return {
    month,
    onlineSales,
    offlineSales,
    offlineCount: offline.c,
    totalRecorded: onlineSales + offlineSales,
  };
}

/** Summarises an order's line items into a short human-readable product string. */
function summariseItems(itemsJson: string | null): { product: string; quantity: number } {
  try {
    const items = JSON.parse(itemsJson || '[]');
    if (!Array.isArray(items) || items.length === 0) return { product: '', quantity: 0 };
    const product = items
      .map((it: any) => `${it.name}${Number(it.quantity) > 1 ? ` x${it.quantity}` : ''}`)
      .join(', ');
    const quantity = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0);
    return { product, quantity };
  } catch {
    return { product: '', quantity: 0 };
  }
}

export interface MonthRecord {
  id: string;
  date: string;
  type: 'Online' | 'Offline';
  reference: string;
  customer: string;
  product: string;
  quantity: number;
  amount: number;
  method: string;
  status: string;
}

/**
 * Builds the real record list for a single month:
 * verified PayPal payments + manually recorded offline sales.
 * Nothing is fabricated and nothing is double-counted (one row per source record).
 */
export function getMonthRecords(db: Database.Database, month: string): MonthRecord[] {
  const online = db
    .prepare(
      `SELECT i.id, i.invoice_number, i.paypal_invoice_id, i.customer_name, i.amount, i.paypal_status,
              i.paid_at, i.created_at, i.is_demo, o.items_json
       FROM invoices i
       LEFT JOIN orders o ON i.order_id = o.id
       WHERE i.paypal_status = 'PAID' AND substr(COALESCE(i.paid_at, i.created_at),1,7) = ?`
    )
    .all(month) as any[];

  const offline = db
    .prepare("SELECT * FROM offline_sales WHERE is_test = 0 AND substr(sale_date,1,7) = ?")
    .all(month) as any[];

  const records: MonthRecord[] = [];

  for (const inv of online) {
    const { product, quantity } = summariseItems(inv.items_json);
    records.push({
      id: inv.id,
      date: String(inv.paid_at || inv.created_at || '').slice(0, 10),
      type: 'Online',
      reference: inv.invoice_number || inv.paypal_invoice_id || '',
      customer: inv.customer_name || '',
      product,
      quantity,
      amount: Number(inv.amount) || 0,
      method: 'PayPal (Sandbox)',
      status: inv.is_demo ? 'PAID (demo)' : 'PAID',
    });
  }

  for (const s of offline) {
    records.push({
      id: s.id,
      date: String(s.sale_date || '').slice(0, 10),
      type: 'Offline',
      reference: '',
      customer: s.customer_name || '',
      product: s.description || '',
      quantity: Number(s.quantity) || 1,
      amount: Number(s.amount) || 0,
      method: s.payment_method === 'OTHER' ? 'Other offline' : 'Cash',
      status: 'Recorded',
    });
  }

  records.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return records;
}

/** Top selling products derived from orders (cancelled orders excluded). */
export function getTopProducts(db: Database.Database, limit = 5): { name: string; quantity: number; revenue: number }[] {
  const orders = db.prepare("SELECT items_json FROM orders WHERE status != 'CANCELLED'").all() as { items_json: string }[];
  const stats: Record<string, { name: string; quantity: number; revenue: number }> = {};

  for (const ord of orders) {
    try {
      const items = JSON.parse(ord.items_json || '[]');
      for (const item of items) {
        if (!item?.name) continue;
        if (!stats[item.name]) stats[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        const q = Number(item.quantity) || 1;
        const p = Number(item.unit_price) || 0;
        stats[item.name].quantity += q;
        stats[item.name].revenue += q * p;
      }
    } catch {
      /* ignore malformed item rows */
    }
  }

  return Object.values(stats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function getBestCustomers(db: Database.Database, limit = 5): any[] {
  return db
    .prepare(
      'SELECT name, phone, email, total_orders, total_spent, outstanding_balance FROM customers ORDER BY total_spent DESC LIMIT ?'
    )
    .all(limit);
}
