import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const availableOnly = searchParams.get('availableOnly');

    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'ALL') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (availableOnly === 'true') {
      query += ' AND is_available = 1';
    }

    query += ' ORDER BY created_at DESC';

    const products = db.prepare(query).all(...params);

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    const id = `prod_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO products (id, name, category, description, price, unit, is_available, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.name,
      body.category || 'Handmade',
      body.description || '',
      Number(body.price) || 0,
      body.unit || 'piece',
      body.is_available !== undefined ? (body.is_available ? 1 : 0) : 1,
      body.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300',
      now
    );

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        unit = COALESCE(?, unit),
        is_available = COALESCE(?, is_available),
        image_url = COALESCE(?, image_url)
      WHERE id = ?
    `).run(
      body.name,
      body.category,
      body.description,
      body.price !== undefined ? Number(body.price) : null,
      body.unit,
      body.is_available !== undefined ? (body.is_available ? 1 : 0) : null,
      body.image_url,
      body.id
    );

    return NextResponse.json({ success: true, message: 'Product updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 });

    const db = getDb();
    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
