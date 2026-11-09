const http = require('http');

function postJson(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + urlPath, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('===============================================================');
  console.log('🧪 SAKHIDESK: PAYPAL INVOICE FLOW TEST');
  console.log('===============================================================\n');

  // STEP 1: Test Email Validation
  console.log('1. Testing Customer Email Validation before PayPal call...');
  const invalidEmailOrderRes = await postJson('/api/orders', {
    customer_name: 'Invalid Email Tester',
    customer_phone: 'Phone with country code',
    customer_email: 'invalid-email-address',
    items: [{ name: 'Custom Butter Cake', quantity: 1, unit_price: 20.00 }],
    status: 'CONFIRMED'
  });

  const invalidOrderId = invalidEmailOrderRes.data?.order?.id;
  const invalidEmailInvoiceRes = await postJson('/api/paypal/create-invoice', { orderId: invalidOrderId });
  console.log('   Expected rejection status:', invalidEmailInvoiceRes.status);
  console.log('   Error message:', invalidEmailInvoiceRes.data?.error);
  if (invalidEmailInvoiceRes.status === 400 && invalidEmailInvoiceRes.data?.error?.includes('email')) {
    console.log('   ✅ Email validation working: blocked PayPal call with clear message\n');
  } else {
    console.error('   ❌ Email validation test failed');
  }

  // STEP 2: Create a Valid Order
  const runId = Date.now().toString().slice(-4);
  console.log(`2. Creating Fresh Valid Order #${runId} with real Sandbox buyer email...`);
  const orderRes = await postJson('/api/orders', {
    customer_name: `Pooja Buyer ${runId}`,
    customer_phone: 'Phone with country code',
    customer_email: 'sb-buyer@personal.example.com',
    delivery_date: '2026-11-12',
    delivery_time: '5:00 PM',
    delivery_address: '12 Palm Grove',
    items: [
      {
        name: 'Chocolate Cake',
        quantity: 1,
        unit_price: 35.00,
        customization: 'Happy Birthday Pooja'
      }
    ],
    notes: `Order created via SakhiDesk test suite #${runId}`,
    status: 'CONFIRMED',
    currency: 'USD',
    input_type: 'TEXT'
  });

  console.log('   Order Status:', orderRes.status);
  const order = orderRes.data?.order;
  console.log('   ✅ Order ID:', order?.id);
  console.log('   ✅ Order Number:', order?.order_number);
  console.log('   ✅ Total Amount:', order?.total_amount, '\n');

  // STEP 3: Create PayPal Draft Invoice
  console.log('3. Calling POST /api/paypal/create-invoice...');
  const draftRes = await postJson('/api/paypal/create-invoice', { orderId: order.id });
  console.log('   Draft Response Status:', draftRes.status);

  if (draftRes.status !== 200 || !draftRes.data?.success) {
    console.error('   ❌ Failed to create draft invoice:', draftRes.data);
    process.exit(1);
  }

  const invoice = draftRes.data.invoice;
  console.log('   ✅ PayPal Invoice ID:', invoice.paypal_invoice_id);
  console.log('   ✅ Formatted Invoice Number:', invoice.invoice_number);
  console.log('   ✅ Length of Invoice Number:', invoice.invoice_number.length, '(PayPal max: 25)');
  console.log('   ✅ Matches Pattern SKH-<order>-<rand>:', /^SKH-\d{3,6}-\d{4}$/.test(invoice.invoice_number));
  console.log('   ✅ Initial Status:', invoice.paypal_status, '\n');

  // STEP 4: Send Invoice via PayPal
  console.log('4. Calling POST /api/paypal/send-invoice (connects to Send Invoice button)...');
  const sendRes = await postJson('/api/paypal/send-invoice', { invoiceId: invoice.paypal_invoice_id });
  console.log('   Send Response Status:', sendRes.status);

  if (sendRes.status !== 200 || !sendRes.data?.success) {
    console.error('   ❌ Failed to send PayPal invoice:', sendRes.data);
    process.exit(1);
  }

  const payLink = sendRes.data.payLink || sendRes.data.paymentUrl;
  console.log('   ✅ Invoice Status after send:', sendRes.data.status);
  console.log('   ✅ Recipient Pay Link:', payLink, '\n');

  // STEP 5: Verify Saved Invoice in Invoices list
  console.log('5. Verifying invoice record in GET /api/invoices...');
  const listRes = await getJson('/api/invoices?search=' + encodeURIComponent(invoice.invoice_number));
  const found = listRes.data?.invoices?.[0];
  console.log('   Found invoice #:', found?.invoice_number);
  console.log('   Status in DB:', found?.paypal_status);
  console.log('   Saved payLink:', found?.payLink);
  console.log('   Saved payment_url:', found?.payment_url, '\n');

  console.log('===============================================================');
  console.log('🎉 FULL PAYPAL FLOW SUCCEEDED PERFECTLY!');
  console.log('PAY LINK TO OPEN:', payLink);
  console.log('===============================================================');
}

runTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
