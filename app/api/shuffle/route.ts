import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/channel3';

export const runtime = 'nodejs';

// Random fashion search queries for quick shuffles
const FASHION_QUERIES = [
  "women's blouse",
  "women's pants",
  "women's dress",
  "women's jacket",
  "women's shoes",
  "women's bag",
  "women's accessories",
  "women's jewelry",
  "women's top",
  "women's skirt",
  "women's sweater",
  "women's blazer",
  "women's boots",
  "women's heels",
  "women's sandals",
  "women's handbag",
  "women's earrings",
  "women's ring",
  "women's necklace",
  "women's belt",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { keptIds = [], count = 12 } = body;

    // Generate random queries for variety
    const shuffledQueries = [...FASHION_QUERIES].sort(() => Math.random() - 0.5);
    const queriesToUse = shuffledQueries.slice(0, Math.ceil(count / 2));

    const allProducts: Array<{
      id: string;
      name: string;
      brand: string;
      image: string;
      price: number;
      currency: string;
      buyLink: string;
      category?: string;
    }> = [];

    // Search for products
    for (const query of queriesToUse) {
      try {
        const products = await searchProducts(query, 2);
        if (products && products.length > 0) {
          products.forEach((product) => {
            // Skip if this product is already kept
            if (keptIds.includes(product.id)) {
              return;
            }
            
            const category = inferCategory(query, product.name);
            allProducts.push({
              ...product,
              category,
            });
          });
        }
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
      }
    }

    // Shuffle and limit results
    const shuffled = allProducts.sort(() => Math.random() - 0.5);
    const selectedProducts = shuffled.slice(0, count);

    if (selectedProducts.length === 0) {
      return NextResponse.json(
        { error: 'No products found. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      products: selectedProducts,
    });
  } catch (error) {
    console.error('Error generating shuffle:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDev = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate shuffle. Please try again.',
        ...(isDev && { details: errorMessage, stack: error instanceof Error ? error.stack : undefined })
      },
      { status: 500 }
    );
  }
}

function inferCategory(query: string, productName: string): string {
  const lowerQuery = query.toLowerCase();
  const lowerName = productName.toLowerCase();
  
  if (lowerQuery.includes('top') || lowerQuery.includes('blouse') || lowerQuery.includes('shirt') || lowerName.includes('blouse') || lowerName.includes('shirt')) {
    return 'top';
  }
  if (lowerQuery.includes('bottom') || lowerQuery.includes('trouser') || lowerQuery.includes('pant') || lowerName.includes('trouser') || lowerName.includes('pant')) {
    return 'bottom';
  }
  if (lowerQuery.includes('jacket') || lowerQuery.includes('coat') || lowerQuery.includes('blazer') || lowerName.includes('jacket') || lowerName.includes('coat') || lowerName.includes('blazer')) {
    return 'outerwear';
  }
  if (lowerQuery.includes('shoe') || lowerQuery.includes('boot') || lowerQuery.includes('sandal') || lowerName.includes('shoe') || lowerName.includes('boot') || lowerName.includes('sandal')) {
    return 'shoes';
  }
  if (lowerQuery.includes('bag') || lowerQuery.includes('accessory') || lowerQuery.includes('jewelry') || lowerName.includes('bag') || lowerName.includes('accessory') || lowerName.includes('ring') || lowerName.includes('earring')) {
    return 'accessories';
  }
  
  return 'other';
}

