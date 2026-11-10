export interface ExtractedOrderItem {
  name: string;
  original_name?: string;
  english_name?: string | null;
  quantity: number;
  unit_price: number | null;
  customization?: string;
  notes?: string;
}

/**
 * Format product name according to language rule:
 * - If customer language / original name is NOT English: "Original (English)" (e.g. "사과 (Apple)")
 * - If already in English: "English" with NO brackets (e.g. "Chocolate Cake")
 * - Max 200 characters
 */
export function buildProductDisplayName(originalName?: string | null, englishName?: string | null, fallbackName?: string | null): string {
  const orig = (originalName || '').trim();
  const eng = (englishName || '').trim();
  const fallback = (fallbackName || '').trim();

  // If already formatted with brackets like "사과 (Apple)"
  if (orig.includes('(') && orig.includes(')')) {
    return orig.slice(0, 200);
  }
  if (fallback.includes('(') && fallback.includes(')')) {
    return fallback.slice(0, 200);
  }

  // Check if original name contains non-Latin/non-ASCII characters (e.g. Korean, Hindi, Japanese, Chinese, Arabic, Cyrillic)
  const isNonLatin = /[^\u0000-\u007F]/.test(orig || fallback);

  // If non-Latin and an English translation is available and different
  if (isNonLatin) {
    const origText = orig || fallback;
    if (eng && eng.toLowerCase() !== origText.toLowerCase()) {
      return `${origText} (${eng})`.slice(0, 200);
    }
    return origText.slice(0, 200);
  }

  // If in Latin characters: check if it was explicitly non-English (e.g. Spanish, French, Italian, German) and eng is different
  if (orig && eng && orig.toLowerCase() !== eng.toLowerCase()) {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normOrig = normalize(orig);
    const normEng = normalize(eng);
    if (normOrig === normEng || normOrig + 's' === normEng || normOrig === normEng + 's') {
      return (eng || orig).slice(0, 200);
    }
    return `${orig} (${eng})`.slice(0, 200);
  }

  // English order item: show just the name with no brackets
  const finalName = eng || orig || fallback || 'Custom Item';
  return finalName.slice(0, 200);
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

  const systemPrompt = `You are SakhiDesk AI, an expert business order extractor for small businesses and independent entrepreneurs worldwide.
The customer message may be in English, Korean, Spanish, French, German, Hindi, Hinglish, Japanese, Chinese, or any other language.

CRITICAL LANGUAGE & PRODUCT NAMING RULES:
1. PRODUCT NAME EXTRACTION:
   - For every product/item in the order, you MUST extract:
     a) "original_name": The product name in the customer's ORIGINAL language exactly as written/intended (e.g. "사과", "tarta de chocolate", "chocolate cake", "robe d'été").
     b) "english_name": The English translation of the product name (e.g. "Apple", "Chocolate Cake", "Summer Dress"). If the product or message is already in English, english_name should match original_name.
     c) "name": One single display string formatted strictly according to this rule:
        - If the customer's original language for this product is NOT English: format as "<original_name> (<english_name>)", for example "사과 (Apple)" or "tarta de chocolate (Chocolate Cake)".
        - If the customer's original language for this product IS English (or the item is written in English, e.g. "Chocolate Cake"): format as JUST the English name with NO brackets (for example "Chocolate Cake").
        - Maximum length of "name" must be 200 characters.

2. NEVER invent or fabricate missing information.
3. If customer email is NOT mentioned, set customer_email to null and ADD to needs_attention: "Customer email is missing (Required to send PayPal invoice)".
4. If unit price is not mentioned by customer and not found in catalog, set unit_price to null and ADD to needs_attention: "Price not specified. Please enter the unit price."
5. If delivery date or time is ambiguous (e.g. "kal", "next Friday", "shaam ko"), resolve relative dates based on current reference date (Today is ${new Date().toISOString().split('T')[0]}), and if unclear, add to needs_attention.
6. If delivery address is missing, set delivery_address to null and ADD to needs_attention: "Delivery address not provided."
7. If there is special customization (e.g., cake inscription, size/colour), capture it under customization.
8. Return PURE JSON conforming to the requested schema. No markdown formatting or extra text outside JSON.`;

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
      "original_name": string,
      "english_name": string or null,
      "name": string (Display string: "Original (English)" if non-English, or "Original" if English, max 200 chars),
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
  "detected_language": string (e.g. "English", "Korean", "Hindi", "Hinglish", "Spanish", etc.)
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

  const systemPrompt = `You are SakhiDesk AI, an expert business order extractor for small businesses and independent entrepreneurs worldwide.
You are given an IMAGE containing a customer order. The image may be:
- a WhatsApp / Instagram / chat screenshot,
- a photo of a handwritten notebook page or order slip,
- a screenshot of a typed message, list, or document.
Read ALL visible content in the image. If it shows a chat conversation, extract the CUSTOMER'S order (ignore the seller's own replies).
The text may be in English, Korean, Spanish, French, German, Hindi, Hinglish, Japanese, Chinese, or any other language.

CRITICAL LANGUAGE & PRODUCT NAMING RULES:
1. PRODUCT NAME EXTRACTION: For every product/item you MUST extract:
   a) "original_name": the product name exactly as written in the image, in its original language (e.g. "사과", "tarta de chocolate", "Saree").
   b) "english_name": the English translation of the product name (if it is already English, repeat the same text).
   c) "name": One single display string formatted strictly:
      - If the item's original language is NOT English: "<original_name> (<english_name>)" (e.g. "사과 (Apple)").
      - If the item is in English: JUST the English name with NO brackets (e.g. "Saree"). Max 200 characters.
2. NEVER invent or fabricate information that is not visible in the image.
3. If the customer email is not visible, set customer_email to null and ADD to needs_attention: "Customer email is missing (Required to send PayPal invoice)".
4. If a unit price is not visible/legible, set unit_price to null and ADD to needs_attention: "Price not specified. Please enter the unit price." If a price is ambiguous, add a clear warning (e.g. "Unit price ambiguous for one item - please confirm.").
5. If handwriting is unclear or a value is uncertain, add a specific warning to needs_attention (e.g. "Unclear handwriting for one item - please verify.").
6. If the delivery date or time is ambiguous or relative (e.g. "kal", "next Friday", "shaam ko"), resolve it against the reference date (Today is ${new Date().toISOString().split('T')[0]}); if still unclear, add to needs_attention.
7. If the delivery address is not visible, set delivery_address to null and ADD to needs_attention: "Delivery address not provided."
8. Capture any special customization (e.g. cake inscription, size, colour) under customization.
9. Return PURE JSON ONLY, with no markdown formatting or extra text, using this EXACT structure:
{
  "customer_name": string or null,
  "customer_phone": string or null,
  "customer_email": string or null,
  "delivery_date": string (YYYY-MM-DD) or null,
  "delivery_time": string or null,
  "delivery_address": string or null,
  "items": [
    {
      "original_name": string,
      "english_name": string or null,
      "name": string (display string, max 200 chars),
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
  "detected_language": string (e.g. "English", "Korean", "Hindi", "Hinglish", "Spanish", etc.)
}`;

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
  if (!rawJson) {
    throw new Error('Gemini Vision returned an empty response for the uploaded image.');
  }

  try {
    const parsed: ExtractedOrderResult = JSON.parse(rawJson);
    return sanitizeExtractedOrder(parsed, 'Uploaded order image');
  } catch (err) {
    console.error('Failed to parse Gemini vision output:', rawJson);
    throw new Error('Could not parse extracted order data from the image. Please review and enter details manually.');
  }
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

        const displayName = buildProductDisplayName(it.original_name, it.english_name, it.name);

        if (price === null && !needsAttention.some(w => w.toLowerCase().includes('price'))) {
          needsAttention.push(`Price missing for "${displayName}". Please specify before creating invoice.`);
        }

        return {
          name: displayName,
          original_name: it.original_name || it.name,
          english_name: it.english_name || null,
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
