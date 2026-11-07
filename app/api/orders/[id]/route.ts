import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(params.id) as any;

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const items = JSON.parse(order.items_json || '[]');
    const needsAttention = JSON.parse(order.needs_attention_json || '[]');

    // Get linked invoice if any
    const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(params.id) as any;

    // Get customer info
    const customer = order.customer_id
      ? db.prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id)
      : null;

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items,
        needs_attention: needsAttention
      },
      invoice: invoice || null,
      customer: customer || null
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(params.id) as any;
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const items = body.items !== undefined ? body.items : JSON.parse(existing.items_json || '[]');
    const subtotal = items.reduce((acc: number, it: any) => acc + (Number(it.unit_price || 0) * Number(it.quantity || 1)), 0);
    const tax = body.tax !== undefined ? Number(body.tax) : existing.tax;
    const discount = body.discount !== undefined ? Number(body.discount) : existing.discount;
    const totalAmount = Math.max(0, subtotal + tax - discount);

    db.prepare(`
      UPDATE orders SET
        customer_name = COALESCE(?, customer_name),
        customer_phone = COALESCE(?, customer_phone),
        customer_email = COALESCE(?, customer_email),
        delivery_date = COALESCE(?, delivery_date),
        delivery_time = COALESCE(?, delivery_time),
        delivery_address = COALESCE(?, delivery_address),
        items_json = ?,
        subtotal = ?,
        tax = ?,
        discount = ?,
        total_amount = ?,
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        needs_attention_json = COALESCE(?, needs_attention_json),
        updated_at = ?
      WHERE id = ?
    `).run(
      body.customer_name,
      body.customer_phone,
      body.customer_email,
      body.delivery_date,
      body.delivery_time,
      body.delivery_address,
      JSON.stringify(items),
      subtotal,
      tax,
      discount,
      totalAmount,
      body.status,
      body.notes,
      body.needs_attention ? JSON.stringify(body.needs_attention) : null,
      now,
      params.id
    );

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    db.prepare("UPDATE orders SET status = 'CANCELLED', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      params.id
    );
    return NextResponse.json({ success: true, message: 'Order marked as cancelled' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
