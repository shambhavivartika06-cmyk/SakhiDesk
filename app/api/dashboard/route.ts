import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOnlineTotals, getMonthlyPoints } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();

    // 1. Core KPIs — shared with the Analytics page so the two can never disagree.
    const totals = getOnlineTotals(db);

    // 2. Recent orders
    const recentOrdersRaw = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 6').all() as any[];
    const recentOrders = recentOrdersRaw.map(o => ({
      ...o,
      items: JSON.parse(o.items_json || '[]'),
      needs_attention: JSON.parse(o.needs_attention_json || '[]')
    }));

    // 3. Recent activity logs
    const recentActivity = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 7').all();

    // 4. Upcoming payment reminders (Unpaid invoices)
    const upcomingReminders = db.prepare(`
      SELECT i.*, o.order_number, o.customer_phone
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.id
      WHERE i.paypal_status IN ('SENT', 'UNPAID')
      ORDER BY i.created_at DESC
      LIMIT 5
    `).all();

    // 5. Seller Profile
    const seller = db.prepare('SELECT * FROM sellers LIMIT 1').get();

    // 6. Real monthly series (last 6 months) for the chart
    const monthlySales = getMonthlyPoints(db, 6).map(p => ({
      month: p.label,
      paid: p.paid,
      pending: p.pending,
      offline: p.offline
    }));

    return NextResponse.json({
      success: true,
      kpis: {
        totalRevenue: totals.paidOnline,
        pendingRevenue: totals.pendingPayments,
        totalOrders: totals.totalOrders,
        completedOrders: totals.completedOrders,
        outstandingInvoices: totals.outstandingInvoices
      },
      monthlySales,
      recentOrders,
      recentActivity,
      upcomingReminders,
      seller
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
