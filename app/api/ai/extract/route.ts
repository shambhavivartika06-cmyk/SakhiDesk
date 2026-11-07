import { NextRequest, NextResponse } from 'next/server';
import { extractOrderFromText, extractOrderFromImage } from '@/lib/gemini';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, text, imageBase64, mimeType } = body;

    const db = getDb();
    const products = db.prepare('SELECT name, price FROM products WHERE is_available = 1').all() as Array<{ name: string; price: number }>;

    let result;

    if (mode === 'image') {
      if (!imageBase64) {
        return NextResponse.json({ success: false, error: 'No image data provided.' }, { status: 400 });
      }
      result = await extractOrderFromImage(imageBase64, mimeType || 'image/jpeg');
    } else {
      if (!text || !text.trim()) {
        return NextResponse.json({ success: false, error: 'Message text is required.' }, { status: 400 });
      }
      result = await extractOrderFromText(text.trim(), products);
    }

    return NextResponse.json({
      success: true,
      extracted: result,
      original_text: text || 'Image order input'
    });
  } catch (error: any) {
    console.error('AI order extraction error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'AI order extraction failed. Please review and enter details manually.'
    }, { status: 500 });
  }
}
