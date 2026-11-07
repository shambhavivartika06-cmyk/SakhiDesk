import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let query = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY total_spent DESC, created_at DESC';

    const customers = db.prepare(query).all(...params);

    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    const id = body.id || `cust_${Date.now()}`;
    const now = new Date().toISOString();

    if (body.id) {
      db.prepare(`
        UPDATE customers SET
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          notes = COALESCE(?, notes),
          updated_at = ?
        WHERE id = ?
      `).run(body.name, body.phone, body.email, body.address, body.notes, now, body.id);
    } else {
      db.prepare(`
        INSERT INTO customers (id, name, phone, email, address, notes, total_orders, total_spent, outstanding_balance, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
      `).run(id, body.name, body.phone || '', body.email || '', body.address || '', body.notes || '', now, now);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
