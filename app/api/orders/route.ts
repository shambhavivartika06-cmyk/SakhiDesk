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

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (isDemo !== null && isDemo !== undefined && isDemo !== '') {
      query += ' AND is_demo = ?';
      params.push(Number(isDemo));
    }

    if (search) {
      query += ' AND (customer_name LIKE ? OR order_number LIKE ? OR customer_phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY created_at DESC';

    const orders = db.prepare(query).all(...params);

    const parsedOrders = orders.map((o: any) => ({
      ...o,
      items: JSON.parse(o.items_json || '[]'),
      needs_attention: JSON.parse(o.needs_attention_json || '[]')
    }));

    return NextResponse.json({ success: true, orders: parsedOrders });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    const customerName = (body.customer_name || 'Customer').trim();
    const customerPhone = (body.customer_phone || '').trim();
    const customerEmail = (body.customer_email || '').trim();
    const deliveryDate = (body.delivery_date || '').trim();
    const deliveryTime = (body.delivery_time || '').trim();
    const deliveryAddress = (body.delivery_address || '').trim();
    const originalMessage = (body.original_message || '').trim();
    const notes = (body.notes || '').trim();
    const currency = body.currency || 'USD';
    const status = body.status || 'CONFIRMED';
    const inputType = body.input_type || 'MANUAL';
    const isDemo = body.is_demo ? 1 : 0;
    const now = new Date().toISOString();

    const items = body.items || [];
    const subtotal = items.reduce((acc: number, it: any) => acc + (Number(it.unit_price || 0) * Number(it.quantity || 1)), 0);
    const tax = Number(body.tax || 0);
    const discount = Number(body.discount || 0);
    const totalAmount = Math.max(0, subtotal + tax - discount);

    // 1. Prevent duplicate order creation on rapid double-clicks (within last 15 seconds)
    const existingOrder = db.prepare(`
      SELECT * FROM orders 
      WHERE customer_name = ? 
        AND total_amount = ? 
        AND original_message = ? 
        AND created_at >= datetime('now', '-15 seconds')
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(customerName, totalAmount, originalMessage) as any;

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        isDuplicatePrevented: true,
        order: {
          id: existingOrder.id,
          order_number: existingOrder.order_number,
          customer_name: existingOrder.customer_name,
          total_amount: existingOrder.total_amount,
          status: existingOrder.status
        }
      });
    }

    const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const count = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }).count;
    const orderNumber = `SKH-ORD-${(count + 101).toString().padStart(4, '0')}`;

    // 2. Safe Customer Lookup & Creation (Clean Parameterized Queries without unquoted string literals)
    let customerId = body.customer_id;
    if (!customerId && customerName) {
      let existingCustomer: any = null;

      if (customerEmail !== '') {
        existingCustomer = db.prepare('SELECT id FROM customers WHERE email = ? LIMIT 1').get(customerEmail);
      }
      if (!existingCustomer && customerPhone !== '') {
        existingCustomer = db.prepare('SELECT id FROM customers WHERE phone = ? LIMIT 1').get(customerPhone);
      }
      if (!existingCustomer && customerName !== '' && customerName.toLowerCase() !== 'customer') {
        existingCustomer = db.prepare('SELECT id FROM customers WHERE name = ? LIMIT 1').get(customerName);
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
        db.prepare('UPDATE customers SET total_orders = total_orders + 1, updated_at = ? WHERE id = ?').run(now, customerId);
      } else {
        customerId = `cust_${Date.now()}`;
        db.prepare(`
          INSERT INTO customers (id, name, phone, email, address, notes, total_orders, total_spent, outstanding_balance, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
        `).run(
          customerId,
          customerName,
          customerPhone,
          customerEmail,
          deliveryAddress,
          'Created from SakhiDesk order',
          now,
          now
        );
      }
    }

    // 3. Insert Confirmed Order into SQLite
    db.prepare(`
      INSERT INTO orders (
        id, order_number, customer_id, customer_name, customer_phone, customer_email,
        delivery_date, delivery_time, delivery_address, items_json,
        subtotal, tax, discount, total_amount, currency, status,
        notes, original_message, needs_attention_json, input_type,
        paypal_invoice_id, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      orderNumber,
      customerId || null,
      customerName,
      customerPhone,
      customerEmail,
      deliveryDate,
      deliveryTime,
      deliveryAddress,
      JSON.stringify(items),
      subtotal,
      tax,
      discount,
      totalAmount,
      currency,
      status,
      notes,
      originalMessage,
      JSON.stringify(body.needs_attention || []),
      inputType,
      null,
      isDemo,
      now,
      now
    );

    // 4. Log activity
    db.prepare(`
      INSERT INTO activity_logs (id, action_type, title, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `log_${Date.now()}`,
      'ORDER_CREATED',
      `Order ${orderNumber} created`,
      `${customerName} placed an order for $${totalAmount.toFixed(2)} (${items.length} items)`,
      id,
      now
    );

    return NextResponse.json({
      success: true,
      order: {
        id,
        order_number: orderNumber,
        customer_name: customerName,
        total_amount: totalAmount,
        status
      }
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
