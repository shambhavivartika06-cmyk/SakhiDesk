interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InvoicerDetails {
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
}

interface RecipientDetails {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number | string;
  unitPrice: number | string;
  currency?: string;
}

interface CreateInvoiceParams {
  orderNumber: string;
  invoicer: InvoicerDetails;
  recipient: RecipientDetails;
  items: InvoiceItem[];
  currency?: string;
  note?: string;
  dueDate?: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const baseUrl = (process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com').trim().replace(/\/$/, '');

  if (!clientId || !clientSecret) {
    throw new Error('PayPal Sandbox credentials (PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET) are not configured. Please check your .env.local file.');
  }

  return { clientId, clientSecret, baseUrl };
}

/**
 * Obtain an OAuth 2.0 access token from PayPal Sandbox
 */
export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const { clientId, clientSecret, baseUrl } = getCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store'
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('PayPal OAuth error:', res.status, errorBody);
    throw new Error(`PayPal authentication failed (${res.status}): ${errorBody}`);
  }

  const data: PayPalTokenResponse = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000);
  return data.access_token;
}

/**
 * Generate next sequential invoice number from PayPal
 */
export async function generatePayPalInvoiceNumber(): Promise<string> {
  const token = await getPayPalAccessToken();
  const { baseUrl } = getCredentials();

  try {
    const res = await fetch(`${baseUrl}/v2/invoicing/generate-next-invoice-number`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      if (data.invoice_number) {
        return data.invoice_number;
      }
    }
  } catch (err) {
    console.warn('Could not generate PayPal invoice number via API, falling back to timestamp:', err);
  }

  return `INV-${Date.now().toString().slice(-6)}`;
}

/**
 * Create a real Draft Invoice on PayPal Sandbox
 */
export async function createPayPalInvoice(params: CreateInvoiceParams): Promise<{
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  selfUrl: string;
}> {
  const token = await getPayPalAccessToken();
  const { baseUrl } = getCredentials();

  const generatedNumber = await generatePayPalInvoiceNumber();
  const invoiceNumber = `SKH-${generatedNumber}`;
  const currency = params.currency || 'USD';

  const [givenName, ...surnameParts] = (params.recipient.name || 'Customer').split(' ');
  const surname = surnameParts.join(' ') || '.';

  const [sellerFirst, ...sellerRest] = (params.invoicer.name || 'Sakhi Seller').split(' ');

  const invoicePayload = {
    detail: {
      invoice_number: invoiceNumber,
      reference: params.orderNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      currency_code: currency,
      note: params.note || 'Thank you for supporting our small handmade business! Created via SakhiDesk.',
      term: 'DueUponReceipt'
    },
    invoicer: {
      name: {
        given_name: sellerFirst || 'Pooja',
        surname: sellerRest.join(' ') || 'Sharma'
      },
      business_name: params.invoicer.businessName || "Pooja's Artisan Delights & Boutique",
    },
    primary_recipients: [
      {
        billing_info: {
          name: {
            given_name: givenName || 'Valued',
            surname: surname || 'Customer'
          },
          email_address: params.recipient.email
        }
      }
    ],
    items: params.items.map(item => ({
      name: item.name.slice(0, 300),
      description: item.description ? item.description.slice(0, 1000) : undefined,
      quantity: String(item.quantity || 1),
      unit_amount: {
        currency_code: currency,
        value: Number(item.unitPrice).toFixed(2)
      },
      unit_of_measure: 'QUANTITY'
    }))
  };

  const res = await fetch(`${baseUrl}/v2/invoicing/invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(invoicePayload),
    cache: 'no-store'
  });

  const responseText = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(responseText);
  } catch (_) {
    data = { raw: responseText };
  }

  if (!res.ok) {
    console.error('PayPal create invoice error:', res.status, responseText);
    const issueDetails = data.details?.map((d: any) => `${d.issue}: ${d.description}`).join('; ') || data.message || responseText;
    throw new Error(`Failed to create PayPal invoice (${res.status}): ${issueDetails}`);
  }

  // Invoice ID can come from self link or ID directly
  let invoiceId = data.id;
  if (!invoiceId && data.href) {
    const parts = data.href.split('/');
    invoiceId = parts[parts.length - 1];
  }

  if (!invoiceId) {
    throw new Error('PayPal invoice created but could not retrieve invoice ID from response.');
  }

  return {
    invoiceId,
    invoiceNumber,
    status: data.status || 'DRAFT',
    selfUrl: data.href || `${baseUrl}/v2/invoicing/invoices/${invoiceId}`
  };
}

/**
 * Send an existing PayPal invoice to the recipient
 */
export async function sendPayPalInvoice(invoiceId: string): Promise<{
  success: boolean;
  status: string;
  paymentUrl?: string;
  payerViewUrl?: string;
}> {
  const token = await getPayPalAccessToken();
  const { baseUrl } = getCredentials();

  const res = await fetch(`${baseUrl}/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      send_to_recipient: true,
      send_to_invoicer: false
    }),
    cache: 'no-store'
  });

  if (!res.ok && res.status !== 202 && res.status !== 200) {
    const errorBody = await res.text();
    console.error('PayPal send invoice error:', res.status, errorBody);
    throw new Error(`Failed to send PayPal invoice (${res.status}): ${errorBody}`);
  }

  let payerUrlFromSend: string | undefined;
  try {
    const sendData = await res.json();
    if (sendData?.href) payerUrlFromSend = sendData.href;
  } catch (_) {}

  // Fetch updated invoice details
  const details = await getPayPalInvoiceDetails(invoiceId);
  const finalPaymentUrl = payerUrlFromSend || details.paymentUrl || `https://www.sandbox.paypal.com/invoice/p/#${invoiceId}`;

  return {
    success: true,
    status: details.status || 'SENT',
    paymentUrl: finalPaymentUrl,
    payerViewUrl: finalPaymentUrl
  };
}

/**
 * Fetch real-time status and details of an invoice from PayPal Sandbox
 */
export async function getPayPalInvoiceDetails(invoiceId: string): Promise<{
  id: string;
  status: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueAmount: number;
  paidAmount: number;
  paymentUrl: string;
  recipientEmail: string;
  raw: any;
}> {
  const token = await getPayPalAccessToken();
  const { baseUrl } = getCredentials();

  const res = await fetch(`${baseUrl}/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to retrieve PayPal invoice details (${res.status}): ${errText}`);
  }

  const data = await res.json();

  // Find payment / payer view link
  let paymentUrl = '';
  if (data.detail?.metadata?.payer_view_url) {
    paymentUrl = data.detail.metadata.payer_view_url;
  } else if (Array.isArray(data.links)) {
    const payerLink = data.links.find((l: any) => l.rel === 'payer-view' || l.rel === 'pay' || l.rel === 'self');
    if (payerLink) paymentUrl = payerLink.href;
  }

  // Fallback sandbox preview link if direct link isn't returned
  if (!paymentUrl) {
    paymentUrl = `https://www.sandbox.paypal.com/invoice/p/#${invoiceId}`;
  }

  const totalVal = parseFloat(data.amount?.value || data.detail?.payment_term?.due_amount?.value || '0');
  const dueVal = parseFloat(data.due_amount?.value || '0');
  const paidVal = parseFloat(data.payments?.paid_amount?.value || '0');

  return {
    id: data.id || invoiceId,
    status: data.status || 'SENT',
    invoiceNumber: data.detail?.invoice_number || invoiceId,
    amount: totalVal,
    currency: data.amount?.currency_code || 'USD',
    dueAmount: dueVal,
    paidAmount: paidVal,
    paymentUrl,
    recipientEmail: data.primary_recipients?.[0]?.billing_info?.email_address || '',
    raw: data
  };
}

/**
 * Send an invoice reminder through PayPal
 */
export async function sendPayPalReminder(invoiceId: string, customNote?: string): Promise<boolean> {
  const token = await getPayPalAccessToken();
  const { baseUrl } = getCredentials();

  const res = await fetch(`${baseUrl}/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/remind`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: 'Reminder: Outstanding Payment for SakhiDesk Order',
      note: customNote || 'Hello! This is a friendly reminder that your invoice is pending payment. Please click the link to complete payment securely via PayPal.',
      send_to_recipient: true
    }),
    cache: 'no-store'
  });

  if (!res.ok && res.status !== 204 && res.status !== 200) {
    const errText = await res.text();
    throw new Error(`PayPal reminder failed (${res.status}): ${errText}`);
  }

  return true;
}

/**
 * Cancel an invoice on PayPal
 */
export async function cancelPayPalInvoice(invoiceId: string, reason?: string): Promise<boolean> {
  const token = await getPayPalAccessToken();
  const { baseUrl } = getCredentials();

  const res = await fetch(`${baseUrl}/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: 'Invoice Cancelled',
      note: reason || 'This order was cancelled by the merchant.',
      send_to_recipient: true
    }),
    cache: 'no-store'
  });

  return res.ok || res.status === 204;
}
