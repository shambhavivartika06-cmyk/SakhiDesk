import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();

    // 1. Core KPIs
    // Total Revenue from confirmed PAID invoices strictly
    const paidRev = (db.prepare("SELECT COALESCE(SUM(amount), 0) as rev FROM invoices WHERE paypal_status = 'PAID'").get() as any).rev;
    // Pending Payments from SENT/UNPAID invoices
    const pendingRev = (db.prepare("SELECT COALESCE(SUM(amount), 0) as rev FROM invoices WHERE paypal_status IN ('SENT', 'UNPAID')").get() as any).rev;
    const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
    const completedOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE status IN ('PAID', 'COMPLETED')").get() as any).c;
    const outstandingInvoices = (db.prepare("SELECT COUNT(*) as c FROM invoices WHERE paypal_status IN ('SENT', 'UNPAID')").get() as any).c;

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

    return NextResponse.json({
      success: true,
      kpis: {
        totalRevenue: Number(paidRev),
        pendingRevenue: Number(pendingRev),
        totalOrders: Number(totalOrders),
        completedOrders: Number(completedOrders),
        outstandingInvoices: Number(outstandingInvoices)
      },
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
