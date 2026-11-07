import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createPayPalInvoice } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Duplicate Prevention Check
    const existingInvoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId) as any;
    if (existingInvoice && existingInvoice.paypal_invoice_id) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        message: 'A PayPal invoice already exists for this order.',
        invoice: existingInvoice
      });
    }

    // Validation
    if (!order.customer_email || !order.customer_email.includes('@')) {
      return NextResponse.json({
        success: false,
        error: 'Customer email is missing or invalid. Please update the customer email in the order before creating a PayPal invoice.'
      }, { status: 400 });
    }

    const items = JSON.parse(order.items_json || '[]');
    if (!items.length) {
      return NextResponse.json({ success: false, error: 'Order has no items.' }, { status: 400 });
    }

    // Validate that every item has a valid price
    for (const item of items) {
      if (item.unit_price === null || item.unit_price === undefined || isNaN(Number(item.unit_price)) || Number(item.unit_price) <= 0) {
        return NextResponse.json({
          success: false,
          error: `Item "${item.name}" has no valid unit price. Please edit the order to specify a price.`
        }, { status: 400 });
      }
    }

    // Get seller details
    const seller = db.prepare('SELECT * FROM sellers LIMIT 1').get() as any;

    // Call PayPal Sandbox Invoicing API
    const paypalResult = await createPayPalInvoice({
      orderNumber: order.order_number,
      invoicer: {
        name: seller ? seller.name : 'Sakhi Boutique',
        businessName: seller ? seller.business_name : 'SakhiDesk Handmade Studio',
        email: seller ? seller.email : 'sb-merchant@business.example.com',
        phone: seller ? seller.phone : undefined
      },
      recipient: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        address: order.delivery_address
      },
      items: items.map((it: any) => ({
        name: it.name,
        description: it.customization ? `Customization: ${it.customization}` : (it.notes || undefined),
        quantity: it.quantity || 1,
        unitPrice: it.unit_price,
        currency: order.currency || 'USD'
      })),
      currency: order.currency || 'USD',
      note: `SakhiDesk Order ${order.order_number}. Thank you for supporting our handmade business!`
    });

    const now = new Date().toISOString();
    const invoiceDbId = `inv_${Date.now()}`;

    // Store in Database
    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, order_id, customer_name, customer_email,
        paypal_invoice_id, paypal_status, payment_url, amount, currency,
        notes, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      invoiceDbId,
      paypalResult.invoiceNumber,
      order.id,
      order.customer_name,
      order.customer_email,
      paypalResult.invoiceId,
      paypalResult.status,
      null, // payment URL generated upon send
      order.total_amount,
      order.currency || 'USD',
      `PayPal Sandbox Draft Invoice #${paypalResult.invoiceNumber}`,
      now,
      now
    );

    // Update Order Status
    db.prepare(`
      UPDATE orders SET
        paypal_invoice_id = ?,
        status = 'INVOICE_CREATED',
        updated_at = ?
      WHERE id = ?
    `).run(paypalResult.invoiceId, now, order.id);

    // Activity Log
    db.prepare(`
      INSERT INTO activity_logs (id, action_type, title, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `log_${Date.now()}`,
      'INVOICE_CREATED',
      `PayPal Draft Invoice Created`,
      `Created PayPal Invoice ${paypalResult.invoiceNumber} (${paypalResult.invoiceId}) for ${order.customer_name} ($${order.total_amount.toFixed(2)})`,
      invoiceDbId,
      now
    );

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoiceDbId,
        invoice_number: paypalResult.invoiceNumber,
        paypal_invoice_id: paypalResult.invoiceId,
        paypal_status: paypalResult.status,
        amount: order.total_amount,
        currency: order.currency || 'USD'
      }
    });
  } catch (error: any) {
    console.error('Error creating PayPal invoice:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create PayPal invoice. Please verify your PayPal Sandbox credentials.'
    }, { status: 500 });
  }
}
