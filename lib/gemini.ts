export interface ExtractedOrderItem {
  name: string;
  quantity: number;
  unit_price: number | null;
  customization?: string;
  notes?: string;
}

export interface ExtractedOrderResult {
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  delivery_address: string | null;
  items: ExtractedOrderItem[];
  subtotal: number | null;
  currency: string;
  additional_notes: string | null;
  needs_attention: string[];
  confidence_score?: number;
  detected_language?: string;
}

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured in .env.local.');
  }
  return key;
}

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

/**
 * Extract structured order data from customer messages in English, Hindi, or Hinglish
 */
export async function extractOrderFromText(rawText: string, productCatalog?: Array<{ name: string; price: number }>): Promise<ExtractedOrderResult> {
  const apiKey = getGeminiApiKey();

  const catalogContext = productCatalog && productCatalog.length > 0
    ? `\nSeller's Available Product Catalog for price reference:\n${productCatalog.map(p => `- ${p.name}: $${p.price.toFixed(2)}`).join('\n')}\nIf a customer item matches a catalog item, you may suggest the catalog unit_price, but do NOT guess prices if no match is found.`
    : '';

  const systemPrompt = `You are SakhiDesk AI, an expert business order extractor for Indian small businesses (home bakers, tailors, handmade jewellery, handicrafts).
The customer message may be in English, Hindi, Hinglish (Hindi words written in English letters, like "mujhe kal ke liye 2 chocolate cakes chahiye 1 kg each"), or mixed.

CRITICAL INSTRUCTIONS:
1. NEVER invent or fabricate missing information.
2. If customer email is NOT mentioned, set customer_email to null and ADD to needs_attention: "Customer email is missing (Required to send PayPal invoice)".
3. If unit price is not mentioned by customer and not found in catalog, set unit_price to null and ADD to needs_attention: "Price not specified. Please enter the unit price."
4. If delivery date or time is ambiguous (e.g. "kal", "next Friday", "shaam ko"), resolve relative dates based on current reference date (Today is ${new Date().toISOString().split('T')[0]}), and if unclear, add to needs_attention.
5. If delivery address is missing, set delivery_address to null and ADD to needs_attention: "Delivery address not provided."
6. If there is special customization (e.g., cake inscription, kurti size/colour), capture it under customization.
7. Return PURE JSON conforming to the requested schema. No markdown formatting or extra text outside JSON.`;

  const userPrompt = `Customer Message:
"""
${rawText}
"""
${catalogContext}

Extract and return a JSON object with this exact structure:
{
  "customer_name": string or null,
  "customer_phone": string or null,
  "customer_email": string or null,
  "delivery_date": string (YYYY-MM-DD) or null,
  "delivery_time": string or null,
  "delivery_address": string or null,
  "items": [
    {
      "name": string,
      "quantity": number,
      "unit_price": number or null,
      "customization": string or null,
      "notes": string or null
    }
  ],
  "subtotal": number or null (calculate ONLY if all items have confirmed unit_price),
  "currency": "USD",
  "additional_notes": string or null,
  "needs_attention": [array of string warnings for missing, ambiguous, or critical fields],
  "detected_language": "English" or "Hindi" or "Hinglish"
}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    }),
    cache: 'no-store'
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Gemini API extraction error:', res.status, errorText);
    throw new Error(`Gemini AI extraction failed: ${errorText}`);
  }

  const data = await res.json();
  const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error('Gemini AI returned empty response for order extraction.');
  }

  try {
    const parsed: ExtractedOrderResult = JSON.parse(rawJson);
    return sanitizeExtractedOrder(parsed, rawText);
  } catch (err) {
    console.error('Failed to parse Gemini output:', rawJson);
    throw new Error('Could not parse extracted order data into valid JSON.');
  }
}

/**
 * Extract order from an uploaded image (screenshot of WhatsApp chat or handwritten order notebook)
 */
export async function extractOrderFromImage(base64Data: string, mimeType: string): Promise<ExtractedOrderResult> {
  const apiKey = getGeminiApiKey();

  const systemPrompt = `You are SakhiDesk AI. Analyze this image of a customer order (could be a WhatsApp chat screenshot, an order slip, or a handwritten notebook page).
Extract the customer details, products, quantities, prices, delivery dates, and customizations.
Understand English, Hindi, and Hinglish handwriting or text.
CRITICAL: Never invent missing information. Highlight any unclear handwriting, missing email, missing address, or missing prices in 'needs_attention'.
Return pure JSON matching the standard SakhiDesk order schema.`;

  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: systemPrompt },
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    }),
    cache: 'no-store'
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini Vision extraction failed: ${errorText}`);
  }

  const data = await res.json();
  const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(rawJson);
  return sanitizeExtractedOrder(parsed, 'Uploaded order image');
}

/**
 * Generate a WhatsApp promotional message for a product
 */
export async function generatePromotionalMessage(
  product: { name: string; price: number; description?: string; category?: string },
  language: 'English' | 'Hindi' | 'Hinglish',
  tone: 'friendly' | 'festive' | 'urgent' = 'friendly'
): Promise<string> {
  const apiKey = getGeminiApiKey();

  const prompt = `Write a short, engaging, warm WhatsApp promotional message for a small handmade/home business seller.
Product: ${product.name}
Price: $${product.price.toFixed(2)}
Description: ${product.description || ''}
Category: ${product.category || 'Handcrafted'}
Language: ${language} (if Hinglish, write natural Hindi in English alphabet, e.g. "Namaste friends! Hamari new collection aa gayi hai...")
Tone: ${tone} (use appropriate friendly emojis like ✨🌸🧁👗)
Keep it concise, friendly, and include a call to action to reply on WhatsApp or visit the mini-shop to order!
Return ONLY the promotional message text.`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
    }),
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error('Failed to generate promotion message with Gemini.');
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

/**
 * AI Business Assistant for seller Q&A based on actual stored database records
 */
export async function askBusinessAssistant(
  question: string,
  businessStats: {
    totalRevenue: number;
    pendingRevenue: number;
    totalOrders: number;
    completedOrders: number;
    pendingInvoices: number;
    topProducts: Array<{ name: string; count: number }>;
    pendingCustomers: Array<{ name: string; amount: number; invoiceNumber: string }>;
    recentOrders: Array<{ orderNumber: string; customerName: string; total: number; status: string }>;
  }
): Promise<string> {
  const apiKey = getGeminiApiKey();

  const prompt = `You are "Sakhi", a warm, encouraging, smart AI business assistant for a woman home entrepreneur.
Answer the seller's question using ONLY the actual business data provided below.
DO NOT make up statistics or facts. If data is not available, politely say so.
Keep the answer concise, cheerful, practical, and beginner-friendly (2-4 sentences or short bullet points).

BUSINESS REAL-TIME DATA:
- Total Earned Paid Revenue: $${businessStats.totalRevenue.toFixed(2)}
- Pending Payments (Invoices sent but unpaid): $${businessStats.pendingRevenue.toFixed(2)}
- Total Orders: ${businessStats.totalOrders}
- Completed & Paid Orders: ${businessStats.completedOrders}
- Outstanding Invoices Count: ${businessStats.pendingInvoices}
- Top Selling Products: ${businessStats.topProducts.map(p => `${p.name} (${p.count} sold)`).join(', ') || 'None yet'}
- Customers with Pending Payments: ${businessStats.pendingCustomers.map(c => `${c.name} ($${c.amount.toFixed(2)} on #${c.invoiceNumber})`).join(', ') || 'All clear, no pending payments!'}
- Recent Orders: ${businessStats.recentOrders.map(o => `#${o.orderNumber} by ${o.customerName} ($${o.total.toFixed(2)}, ${o.status})`).join('; ')}

Seller's Question: "${question}"

Respond warmly in simple language:`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 }
    }),
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error('Failed to query AI business assistant.');
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'I could not process that request. Please try again.';
}

/**
 * Sanitize and validate extracted order schema
 */
function sanitizeExtractedOrder(parsed: any, originalText: string): ExtractedOrderResult {
  const needsAttention: string[] = Array.isArray(parsed.needs_attention) ? [...parsed.needs_attention] : [];

  // Check email
  if (!parsed.customer_email || !parsed.customer_email.includes('@')) {
    if (!needsAttention.some(w => w.toLowerCase().includes('email'))) {
      needsAttention.push('Customer email is missing (Required to create PayPal invoice)');
    }
  }

  // Check items
  const items: ExtractedOrderItem[] = Array.isArray(parsed.items) && parsed.items.length > 0
    ? parsed.items.map((it: any) => {
        const qty = Number(it.quantity) || 1;
        const price = (it.unit_price !== null && it.unit_price !== undefined && !isNaN(Number(it.unit_price)))
          ? Number(it.unit_price)
          : null;

        if (price === null && !needsAttention.some(w => w.toLowerCase().includes('price'))) {
          needsAttention.push(`Price missing for "${it.name || 'item'}". Please specify before creating invoice.`);
        }

        return {
          name: it.name || 'Custom Item',
          quantity: qty,
          unit_price: price,
          customization: it.customization || '',
          notes: it.notes || ''
        };
      })
    : [
        {
          name: 'Custom Order Item',
          quantity: 1,
          unit_price: null,
          customization: '',
          notes: ''
        }
      ];

  // Calculate subtotal if all items have price
  let subtotal: number | null = null;
  const allPriced = items.every(i => i.unit_price !== null);
  if (allPriced) {
    subtotal = items.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 1)), 0);
  } else {
    subtotal = null;
  }

  return {
    customer_name: parsed.customer_name || 'Customer',
    customer_phone: parsed.customer_phone || '',
    customer_email: parsed.customer_email || '',
    delivery_date: parsed.delivery_date || '',
    delivery_time: parsed.delivery_time || '',
    delivery_address: parsed.delivery_address || '',
    items,
    subtotal,
    currency: parsed.currency || 'USD',
    additional_notes: parsed.additional_notes || '',
    needs_attention: needsAttention,
    detected_language: parsed.detected_language || 'English'
  };
}
