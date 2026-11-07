import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const seller = db.prepare('SELECT * FROM sellers LIMIT 1').get() as any;
    const products = db.prepare('SELECT * FROM products WHERE is_available = 1 ORDER BY created_at DESC').all();

    return NextResponse.json({
      success: true,
      shop: {
        seller: seller ? {
          name: seller.name,
          business_name: seller.business_name,
          category: seller.category,
          phone: seller.phone,
          email: seller.email,
          address: seller.address,
          upi_id: seller.upi_id,
          currency: seller.currency,
          bio: seller.bio,
          avatar_url: seller.avatar_url
        } : null,
        products
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    const { customer_name, customer_phone, customer_email, delivery_address, items, notes } = body;

    if (!customer_name || !items || !items.length) {
      return NextResponse.json({ success: false, error: 'Customer name and at least one item are required.' }, { status: 400 });
    }

    const orderId = `ord_shop_${Date.now()}`;
    const count = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }).count;
    const orderNumber = `SKH-SHOP-${(count + 101).toString().padStart(4, '0')}`;
    const now = new Date().toISOString();

    const subtotal = items.reduce((acc: number, it: any) => acc + (Number(it.unit_price || it.price || 0) * Number(it.quantity || 1)), 0);

    const needsAttention: string[] = [];
    if (!customer_email) {
      needsAttention.push('Customer email missing (Required to send PayPal invoice)');
    }
    if (!customer_phone) {
      needsAttention.push('Customer phone number not provided');
    }
    if (!delivery_address) {
      needsAttention.push('Delivery address not specified');
    }

    // Insert order with status 'NEW' for seller review
    db.prepare(`
      INSERT INTO orders (
        id, order_number, customer_id, customer_name, customer_phone, customer_email,
        delivery_date, delivery_time, delivery_address, items_json,
        subtotal, tax, discount, total_amount, currency, status,
        notes, original_message, needs_attention_json, input_type,
        paypal_invoice_id, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'USD', 'NEW', ?, ?, ?, 'SHOP', null, 0, ?, ?)
    `).run(
      orderId,
      orderNumber,
      null,
      customer_name,
      customer_phone || '',
      customer_email || '',
      body.delivery_date || '',
      body.delivery_time || '',
      delivery_address || '',
      JSON.stringify(items.map((it: any) => ({
        name: it.name,
        quantity: it.quantity || 1,
        unit_price: it.price || it.unit_price,
        customization: it.customization || '',
        notes: it.notes || ''
      }))),
      subtotal,
      subtotal,
      notes || 'Customer submitted request via Mini-Shop catalog.',
      `Direct Mini-Shop Order Request from ${customer_name}`,
      JSON.stringify(needsAttention),
      now,
      now
    );

    // Log activity
    db.prepare(`
      INSERT INTO activity_logs (id, action_type, title, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `log_${Date.now()}`,
      'ORDER_CREATED',
      `New Mini-Shop Order Request #${orderNumber}`,
      `${customer_name} placed an order request for $${subtotal.toFixed(2)} via your online Mini Shop.`,
      orderId,
      now
    );

    return NextResponse.json({
      success: true,
      orderNumber,
      message: 'Your order request has been submitted to the seller! She will review and confirm your order shortly.'
    });
  } catch (error: any) {
    console.error('Error submitting shop order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
