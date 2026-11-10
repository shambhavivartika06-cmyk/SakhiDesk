import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { listOfflineByMonth } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_METHODS = ['CASH', 'OTHER'];

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');

    const rows = month
      ? listOfflineByMonth(db, month)
      : db
          .prepare('SELECT * FROM offline_sales WHERE is_test = 0 ORDER BY sale_date DESC, created_at DESC')
          .all();

    const total = (rows as any[]).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    return NextResponse.json({
      success: true,
      offlineSales: rows,
      totals: { amount: total, count: (rows as any[]).length }
    });
  } catch (error: any) {
    console.error('Error fetching offline sales:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    const saleDate = String(body.sale_date || '').trim();
    const description = String(body.description || '').trim();
    const quantityRaw = body.quantity;
    const amountRaw = body.amount;
    const paymentMethod = String(body.payment_method || 'CASH').toUpperCase();
    const customerName = String(body.customer_name || '').trim();

    // --- Validation ---
    if (!description) {
      return NextResponse.json({ success: false, error: 'Please enter a product or description.' }, { status: 400 });
    }
    if (!DATE_RE.test(saleDate)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid sale date (YYYY-MM-DD).' }, { status: 400 });
    }
    if (Number.isNaN(new Date(saleDate).getTime())) {
      return NextResponse.json({ success: false, error: 'Please enter a valid sale date.' }, { status: 400 });
    }

    const quantity = Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Quantity must be a positive number.' }, { status: 400 });
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive number.' }, { status: 400 });
    }

    if (!ALLOWED_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Payment method must be Cash or Other offline.' }, { status: 400 });
    }

    // --- Duplicate guard: identical entry saved seconds ago (e.g. double click) ---
    const since = new Date(Date.now() - 20000).toISOString();
    const duplicate = db
      .prepare(
        `SELECT id FROM offline_sales
         WHERE description = ? AND amount = ? AND quantity = ? AND sale_date = ?
           AND COALESCE(customer_name, '') = ? AND created_at >= ?
         LIMIT 1`
      )
      .get(description, amount, quantity, saleDate, customerName, since) as any;

    if (duplicate) {
      return NextResponse.json({
        success: true,
        duplicatePrevented: true,
        message: 'This sale was just added.',
        offlineSale: db.prepare('SELECT * FROM offline_sales WHERE id = ?').get(duplicate.id)
      });
    }

    // --- Seller ownership (single-row sellers table) ---
    const seller = db.prepare('SELECT id FROM sellers LIMIT 1').get() as { id: string } | undefined;

    const id = `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO offline_sales (id, seller_id, sale_date, description, quantity, amount, payment_method, customer_name, is_test, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(id, seller?.id || null, saleDate, description, quantity, amount, paymentMethod, customerName || null, now);

    const offlineSale = db.prepare('SELECT * FROM offline_sales WHERE id = ?').get(id);

    return NextResponse.json({ success: true, offlineSale });
  } catch (error: any) {
    console.error('Error saving offline sale:', error);
    return NextResponse.json({ success: false, error: error.message || 'Could not save the offline sale.' }, { status: 500 });
  }
}
