import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: current seller / business profile (single source of truth for the app)
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const seller = db.prepare('SELECT * FROM sellers LIMIT 1').get();
    return NextResponse.json({ success: true, seller: seller || null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: persist Seller & Business Profile changes made in Settings
export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    const existing = db.prepare('SELECT * FROM sellers LIMIT 1').get() as any;
    if (!existing) {
      return NextResponse.json({ success: false, error: 'No seller profile found to update.' }, { status: 404 });
    }

    const name = String(body.name ?? existing.name ?? '').trim();
    const businessName = String(body.business_name ?? existing.business_name ?? '').trim();

    if (!name || !businessName) {
      return NextResponse.json(
        { success: false, error: 'Entrepreneur name and business name are required.' },
        { status: 400 }
      );
    }

    db.prepare(`
      UPDATE sellers
      SET name = ?, business_name = ?, category = ?, phone = ?, email = ?, address = ?, upi_id = ?, currency = ?, bio = ?
      WHERE id = ?
    `).run(
      name,
      businessName,
      String(body.category ?? existing.category ?? ''),
      String(body.phone ?? existing.phone ?? ''),
      String(body.email ?? existing.email ?? ''),
      String(body.address ?? existing.address ?? ''),
      String(body.upi_id ?? existing.upi_id ?? ''),
      String(body.currency ?? existing.currency ?? 'USD'),
      String(body.bio ?? existing.bio ?? ''),
      existing.id
    );

    const seller = db.prepare('SELECT * FROM sellers WHERE id = ?').get(existing.id);
    return NextResponse.json({ success: true, seller });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
