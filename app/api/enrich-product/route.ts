import { NextRequest, NextResponse } from 'next/server';
import { enrichProduct } from '@/lib/channel3';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const enriched = await enrichProduct(url);

    if (!enriched) {
      return NextResponse.json(
        { error: 'Failed to enrich product' },
        { status: 500 }
      );
    }

    // Extract images from the enriched product
    const images = enriched.images && enriched.images.length > 0
      ? enriched.images.map((img) => img.url)
      : (enriched.image_urls && enriched.image_urls.length > 0
        ? enriched.image_urls
        : []);

    return NextResponse.json({
      description: enriched.description,
      images: images,
      materials: enriched.materials,
      key_features: enriched.key_features,
    });
  } catch (error) {
    console.error('Error enriching product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to enrich product', details: errorMessage },
      { status: 500 }
    );
  }
}
