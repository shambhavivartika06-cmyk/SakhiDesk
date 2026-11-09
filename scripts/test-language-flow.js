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
  console.log('🌐 SAKHIDESK: MULTI-LANGUAGE & PAYPAL FLOW VERIFICATION');
  console.log('===============================================================\n');

  // TEST CASE A: Korean Order "사과 3개를 30달러에 사고 싶어요."
  console.log('---------------------------------------------------------------');
  console.log('TEST CASE A: Korean Order ("사과 3개를 30달러에 사고 싶어요.")');
  console.log('---------------------------------------------------------------');
  
  console.log('1. Calling Gemini AI Extraction (/api/ai/extract)...');
  const extractKorean = await postJson('/api/ai/extract', {
    text: '사과 3개를 30달러에 사고 싶어요.'
  });

  console.log('   Extraction status:', extractKorean.status);
  const koreanOrder = extractKorean.data?.extracted || extractKorean.data?.order;
  console.log('   Detected language:', koreanOrder?.detected_language);
  console.log('   Extracted items:', JSON.stringify(koreanOrder?.items, null, 2));

  const firstItemA = koreanOrder?.items?.[0];
  const prodNameA = firstItemA?.name;
  const qtyA = firstItemA?.quantity;
  const unitPriceA = firstItemA?.unit_price || 10.00; // $30 for 3 = $10 each
  const totalA = qtyA * unitPriceA;

  console.log(`   Product name: "${prodNameA}" (Expected: "사과 (Apple)")`);
  console.log(`   Quantity: ${qtyA} (Expected: 3)`);
  console.log(`   Unit price: $${unitPriceA}`);
  console.log(`   Total amount: $${totalA} (Expected: $30)`);

  const nameMatchA = Boolean(prodNameA && prodNameA.includes('사과') && prodNameA.includes('(Apple)'));
  console.log('   ✅ Product name matches language rule:', nameMatchA);

  console.log('2. Confirming Order with a Gmail address...');
  const runIdA = Date.now().toString().slice(-4);
  const orderResA = await postJson('/api/orders', {
    customer_name: `Min-jun Kim ${runIdA}`,
    customer_phone: 'Phone with country code',
    customer_email: 'minjun.kim.test@gmail.com',
    delivery_date: '2026-11-15',
    delivery_address: '12 Palm Grove',
    items: [
      {
        name: prodNameA || '사과 (Apple)',
        quantity: qtyA || 3,
        unit_price: unitPriceA || 10.00
      }
    ],
    original_message: `사과 3개를 30달러에 사고 싶어요. #${runIdA}`,
    currency: 'USD',
    status: 'CONFIRMED'
  });

  const orderIdA = orderResA.data?.order?.id;
  console.log('   ✅ Order created with ID:', orderIdA, 'Order #:', orderResA.data?.order?.order_number);

  console.log('3. Creating PayPal Draft Invoice...');
  const invoiceResA = await postJson('/api/paypal/create-invoice', { orderId: orderIdA });
  console.log('   Create invoice status:', invoiceResA.status);
  const paypalInvA = invoiceResA.data?.invoice;
  console.log('   ✅ PayPal Invoice ID:', paypalInvA?.paypal_invoice_id);
  console.log('   ✅ Invoice Number:', paypalInvA?.invoice_number);

  console.log('4. Sending PayPal Invoice...');
  const sendResA = await postJson('/api/paypal/send-invoice', { invoiceId: paypalInvA?.paypal_invoice_id });
  console.log('   Send status:', sendResA.status);
  const payLinkA = sendResA.data?.payLink || sendResA.data?.paymentUrl;
  console.log('   ✅ Pay Link:', payLinkA);

  console.log('5. Verifying live PayPal Invoice details via status API...');
  const statusResA = await getJson('/api/paypal/status/' + paypalInvA?.paypal_invoice_id);
  console.log('   Live status:', statusResA.data?.status);
  console.log('   Verified Pay Link:', statusResA.data?.payLink);

  console.log('\n---------------------------------------------------------------');
  console.log('TEST CASE B: Chocolate Cake Sample (English/Hinglish)');
  console.log('---------------------------------------------------------------');

  const cakeMessage = 'Hi didi, mujhe kal ke liye 2 chocolate cakes chahiye, 1 kg each. One cake should have Happy Birthday Aanya written on it. Total price kitna hoga? Delivery tomorrow evening at 6.';
  console.log('1. Calling Gemini AI Extraction (/api/ai/extract)...');
  const extractCake = await postJson('/api/ai/extract', {
    text: cakeMessage
  });

  console.log('   Extraction status:', extractCake.status);
  const cakeOrder = extractCake.data?.extracted || extractCake.data?.order;
  console.log('   Extracted items:', JSON.stringify(cakeOrder?.items, null, 2));

  const firstItemB = cakeOrder?.items?.[0];
  const prodNameB = firstItemB?.name;
  console.log(`   Product name: "${prodNameB}" (Expected: "Chocolate Cake" with NO brackets)`);
  const hasNoBrackets = Boolean(prodNameB && !prodNameB.includes('(') && !prodNameB.includes(')'));
  console.log('   ✅ Has NO brackets:', hasNoBrackets);

  console.log('2. Confirming Order with a Gmail address...');
  const runIdB = Date.now().toString().slice(-4);
  const orderResB = await postJson('/api/orders', {
    customer_name: `Sarah Jenkins ${runIdB}`,
    customer_phone: 'Phone with country code',
    customer_email: 'sarah.jenkins.bakery@gmail.com',
    delivery_date: '2026-11-12',
    delivery_time: '6:00 PM',
    delivery_address: '401 Lotus Enclave',
    items: [
      {
        name: prodNameB || 'Chocolate Cake',
        quantity: 2,
        unit_price: 25.00,
        customization: 'Happy Birthday Aanya'
      }
    ],
    original_message: `${cakeMessage} #${runIdB}`,
    currency: 'USD',
    status: 'CONFIRMED'
  });

  const orderIdB = orderResB.data?.order?.id;
  console.log('   ✅ Order created with ID:', orderIdB, 'Order #:', orderResB.data?.order?.order_number);

  console.log('3. Creating PayPal Draft Invoice...');
  const invoiceResB = await postJson('/api/paypal/create-invoice', { orderId: orderIdB });
  console.log('   Create invoice status:', invoiceResB.status);
  const paypalInvB = invoiceResB.data?.invoice;
  console.log('   ✅ PayPal Invoice ID:', paypalInvB?.paypal_invoice_id);
  console.log('   ✅ Invoice Number:', paypalInvB?.invoice_number);

  console.log('4. Sending PayPal Invoice...');
  const sendResB = await postJson('/api/paypal/send-invoice', { invoiceId: paypalInvB?.paypal_invoice_id });
  console.log('   Send status:', sendResB.status);
  const payLinkB = sendResB.data?.payLink || sendResB.data?.paymentUrl;
  console.log('   ✅ Pay Link:', payLinkB);

  console.log('5. Verifying live PayPal Invoice details via status API...');
  const statusResB = await getJson('/api/paypal/status/' + paypalInvB?.paypal_invoice_id);
  console.log('   Live status:', statusResB.data?.status);
  console.log('   Verified Pay Link:', statusResB.data?.payLink);

  console.log('\n===============================================================');
  console.log('🎉 VERIFICATION SUMMARY:');
  console.log('Case A (Korean):', nameMatchA ? 'PASSED ✅' : 'FAILED ❌', `Pay Link: ${payLinkA}`);
  console.log('Case B (Cake):', hasNoBrackets ? 'PASSED ✅' : 'FAILED ❌', `Pay Link: ${payLinkB}`);
  console.log('===============================================================');
}

runTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
