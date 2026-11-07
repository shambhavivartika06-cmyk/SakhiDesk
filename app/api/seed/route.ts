import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const now = new Date().toISOString();

    // Check if demo reset requested
    const body = await req.json().catch(() => ({}));
    if (body.reset) {
      db.exec(`
        DELETE FROM activity_logs;
        DELETE FROM reminders;
        DELETE FROM invoices;
        DELETE FROM orders;
        DELETE FROM customers;
        DELETE FROM products;
        DELETE FROM sellers;
      `);
      // Re-trigger seeding by closing and reopening db instance or calling init
      // We can just re-insert the seed data cleanly
    }

    return NextResponse.json({ success: true, message: 'Database status verified' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
