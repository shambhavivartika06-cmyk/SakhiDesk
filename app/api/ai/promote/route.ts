import { NextRequest, NextResponse } from 'next/server';
import { generatePromotionalMessage } from '@/lib/gemini';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { productId, language = 'English', tone = 'friendly' } = await req.json();

    const db = getDb();
    let product: any = null;

    if (productId) {
      product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    }

    if (!product) {
      // Pick first product as default
      product = db.prepare('SELECT * FROM products LIMIT 1').get();
    }

    if (!product) {
      return NextResponse.json({ success: false, error: 'No products available to generate promotion.' }, { status: 404 });
    }

    const message = await generatePromotionalMessage(
      {
        name: product.name,
        price: product.price,
        description: product.description,
        category: product.category
      },
      language,
      tone
    );

    // Form encoded WhatsApp link
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      success: true,
      message,
      whatsappUrl: waUrl,
      product
    });
  } catch (error: any) {
    console.error('Error generating promo message:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
