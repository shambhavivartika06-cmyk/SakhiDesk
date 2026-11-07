import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getPayPalInvoiceDetails } from '@/lib/paypal';

export async function GET(
  req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? OR paypal_invoice_id = ?').get(params.invoiceId, params.invoiceId) as any;

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    // If it's a demo invoice without real PayPal ID, return its stored status
    if (invoice.is_demo && (!invoice.paypal_invoice_id || invoice.paypal_invoice_id.startsWith('INV2-DEMO'))) {
      return NextResponse.json({
        success: true,
        isDemo: true,
        status: invoice.paypal_status,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
        paymentUrl: invoice.payment_url,
        message: 'Demo record status verified'
      });
    }

    // Call PayPal Sandbox API to check real live status
    const details = await getPayPalInvoiceDetails(invoice.paypal_invoice_id);
    const now = new Date().toISOString();

    const previousStatus = invoice.paypal_status;
    const currentStatus = details.status;

    // Update in database
    db.prepare(`
      UPDATE invoices SET
        paypal_status = ?,
        payment_url = COALESCE(?, payment_url),
        last_synced_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      currentStatus,
      details.paymentUrl || null,
      now,
      now,
      invoice.id
    );

    // If status became PAID
    if ((currentStatus === 'PAID' || currentStatus === 'MARKED_AS_PAID') && previousStatus !== 'PAID') {
      db.prepare(`
        UPDATE invoices SET
          paid_at = ?,
          paypal_status = 'PAID'
        WHERE id = ?
      `).run(now, invoice.id);

      if (invoice.order_id) {
        db.prepare(`
          UPDATE orders SET
            status = 'PAID',
            updated_at = ?
          WHERE id = ?
        `).run(now, invoice.order_id);

        const order = db.prepare('SELECT customer_id FROM orders WHERE id = ?').get(invoice.order_id) as any;
        if (order && order.customer_id) {
          db.prepare(`
            UPDATE customers SET
              total_spent = total_spent + ?,
              outstanding_balance = MAX(0, outstanding_balance - ?),
              updated_at = ?
            WHERE id = ?
          `).run(invoice.amount, invoice.amount, now, order.customer_id);
        }
      }

      db.prepare(`
        INSERT INTO activity_logs (id, action_type, title, description, reference_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `log_${Date.now()}`,
        'PAYMENT_RECEIVED',
        `PayPal Payment Confirmed!`,
        `Payment of $${invoice.amount.toFixed(2)} received for Invoice #${invoice.invoice_number} from ${invoice.customer_name}`,
        invoice.id,
        now
      );
    }

    return NextResponse.json({
      success: true,
      liveSynced: true,
      status: currentStatus,
      invoiceNumber: details.invoiceNumber,
      amount: details.amount,
      currency: details.currency,
      paidAmount: details.paidAmount,
      dueAmount: details.dueAmount,
      paymentUrl: details.paymentUrl,
      lastSyncedAt: now
    });
  } catch (error: any) {
    console.error('Error fetching PayPal invoice status:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check status with PayPal.'
    }, { status: 500 });
  }
}
