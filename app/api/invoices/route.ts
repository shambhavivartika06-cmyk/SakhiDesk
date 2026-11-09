import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const isDemo = searchParams.get('isDemo');

    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'ALL') {
      query += ' AND paypal_status = ?';
      params.push(status);
    }

    if (isDemo !== null && isDemo !== undefined && isDemo !== '') {
      query += ' AND is_demo = ?';
      params.push(Number(isDemo));
    }

    if (search) {
      query += ' AND (customer_name LIKE ? OR invoice_number LIKE ? OR paypal_invoice_id LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY created_at DESC';

    const invoices = db.prepare(query).all(...params);

    const mappedInvoices = invoices.map((inv: any) => ({
      ...inv,
      payLink: inv.pay_link || inv.payment_url || '',
      payment_url: inv.payment_url || inv.pay_link || ''
    }));

    return NextResponse.json({ success: true, invoices: mappedInvoices });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
