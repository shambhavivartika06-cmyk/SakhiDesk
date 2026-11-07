import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendPayPalReminder } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, note } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'Invoice ID is required' }, { status: 400 });
    }

    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? OR paypal_invoice_id = ?').get(invoiceId, invoiceId) as any;

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // If it's a real PayPal invoice, send via API
    if (invoice.paypal_invoice_id && !invoice.is_demo) {
      await sendPayPalReminder(invoice.paypal_invoice_id, note);
    }

    // Save in reminders table
    const reminderId = `rem_${Date.now()}`;
    db.prepare(`
      INSERT INTO reminders (id, invoice_id, order_id, customer_name, customer_phone, channel, status, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?, ?)
    `).run(
      reminderId,
      invoice.id,
      invoice.order_id,
      invoice.customer_name,
      '',
      'PAYPAL',
      note || 'Friendly payment reminder',
      now
    );

    // Save in activity logs
    db.prepare(`
      INSERT INTO activity_logs (id, action_type, title, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `log_${Date.now()}`,
      'REMINDER_SENT',
      `Payment Reminder Sent`,
      `Reminder sent to ${invoice.customer_name} for Invoice #${invoice.invoice_number}`,
      invoice.id,
      now
    );

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${invoice.customer_name} successfully!`,
      reminderId
    });
  } catch (error: any) {
    console.error('Error sending reminder:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
