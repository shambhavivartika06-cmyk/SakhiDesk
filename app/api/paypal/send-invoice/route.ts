import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendPayPalInvoice } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'Invoice ID is required' }, { status: 400 });
    }

    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? OR paypal_invoice_id = ?').get(invoiceId, invoiceId) as any;

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found in database.' }, { status: 404 });
    }

    if (!invoice.paypal_invoice_id) {
      return NextResponse.json({ success: false, error: 'This invoice does not have a PayPal invoice ID.' }, { status: 400 });
    }

    // Call PayPal Send API
    const sendResult = await sendPayPalInvoice(invoice.paypal_invoice_id);

    const now = new Date().toISOString();

    // Update Invoice in DB
    db.prepare(`
      UPDATE invoices SET
        paypal_status = 'SENT',
        payment_url = ?,
        sent_at = ?,
        last_synced_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      sendResult.paymentUrl || invoice.payment_url || `https://www.sandbox.paypal.com/invoice/p/#${invoice.paypal_invoice_id}`,
      now,
      now,
      now,
      invoice.id
    );

    // Update Order in DB
    if (invoice.order_id) {
      db.prepare(`
        UPDATE orders SET
          status = 'PAYMENT_PENDING',
          updated_at = ?
        WHERE id = ?
      `).run(now, invoice.order_id);
    }

    // Update Customer outstanding balance
    const order = db.prepare('SELECT customer_id FROM orders WHERE id = ?').get(invoice.order_id) as any;
    if (order && order.customer_id) {
      db.prepare(`
        UPDATE customers SET
          outstanding_balance = outstanding_balance + ?,
          updated_at = ?
        WHERE id = ?
      `).run(invoice.amount, now, order.customer_id);
    }

    // Activity Log
    db.prepare(`
      INSERT INTO activity_logs (id, action_type, title, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `log_${Date.now()}`,
      'INVOICE_SENT',
      `PayPal Invoice #${invoice.invoice_number} Sent`,
      `Sent to ${invoice.customer_email} ($${invoice.amount.toFixed(2)}). Payment link generated.`,
      invoice.id,
      now
    );

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully through PayPal Sandbox!',
      status: 'SENT',
      paymentUrl: sendResult.paymentUrl,
      invoice: {
        ...invoice,
        paypal_status: 'SENT',
        payment_url: sendResult.paymentUrl
      }
    });
  } catch (error: any) {
    console.error('Error sending PayPal invoice:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send PayPal invoice.'
    }, { status: 500 });
  }
}
