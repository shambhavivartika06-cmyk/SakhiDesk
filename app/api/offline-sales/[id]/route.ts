import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM offline_sales WHERE id = ?').get(params.id) as any;

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Offline sale not found.' }, { status: 404 });
    }

    db.prepare('DELETE FROM offline_sales WHERE id = ?').run(params.id);

    return NextResponse.json({ success: true, message: 'Offline sale deleted.' });
  } catch (error: any) {
    console.error('Error deleting offline sale:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
