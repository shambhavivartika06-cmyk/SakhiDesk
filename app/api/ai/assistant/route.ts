import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { askBusinessAssistant } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || !question.trim()) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    const db = getDb();

    // Calculate actual real-time business stats from SQLite
    const paidRev = (db.prepare("SELECT COALESCE(SUM(amount), 0) as rev FROM invoices WHERE paypal_status = 'PAID'").get() as any).rev;
    const pendingRev = (db.prepare("SELECT COALESCE(SUM(amount), 0) as rev FROM invoices WHERE paypal_status IN ('SENT', 'UNPAID')").get() as any).rev;
    const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
    const completedOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE status IN ('PAID', 'COMPLETED')").get() as any).c;
    const pendingInvoices = (db.prepare("SELECT COUNT(*) as c FROM invoices WHERE paypal_status IN ('SENT', 'UNPAID')").get() as any).c;

    // Pending customers
    const pendingList = db.prepare("SELECT customer_name as name, amount, invoice_number as invoiceNumber FROM invoices WHERE paypal_status IN ('SENT', 'UNPAID') LIMIT 5").all() as any[];

    // Top products by analyzing order items
    const allOrders = db.prepare('SELECT items_json FROM orders').all() as any[];
    const productCounts: Record<string, number> = {};
    for (const ord of allOrders) {
      try {
        const items = JSON.parse(ord.items_json || '[]');
        for (const it of items) {
          if (it.name) {
            productCounts[it.name] = (productCounts[it.name] || 0) + (Number(it.quantity) || 1);
          }
        }
      } catch (_) {}
    }

    const topProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent orders
    const recentOrders = db.prepare('SELECT order_number as orderNumber, customer_name as customerName, total_amount as total, status FROM orders ORDER BY created_at DESC LIMIT 5').all() as any[];

    const answer = await askBusinessAssistant(question.trim(), {
      totalRevenue: Number(paidRev),
      pendingRevenue: Number(pendingRev),
      totalOrders: Number(totalOrders),
      completedOrders: Number(completedOrders),
      pendingInvoices: Number(pendingInvoices),
      topProducts,
      pendingCustomers: pendingList,
      recentOrders
    });

    return NextResponse.json({
      success: true,
      answer,
      metrics: {
        totalRevenue: Number(paidRev),
        pendingRevenue: Number(pendingRev),
        totalOrders: Number(totalOrders),
        completedOrders: Number(completedOrders),
        pendingInvoices: Number(pendingInvoices)
      }
    });
  } catch (error: any) {
    console.error('AI assistant error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
