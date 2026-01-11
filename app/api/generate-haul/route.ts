import { NextRequest, NextResponse } from 'next/server';
import { generateSearchQueries, generateProductReason, StyleProfile } from '@/lib/anthropic';
import { searchProducts } from '@/lib/channel3';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refinement, ...profileData } = body;
    const refinementType = refinement; // Store refinement type
    let profile: StyleProfile & { gender?: string } = profileData;

    // Ensure gender is set to women's if not provided
    if (!profile.gender) {
      profile.gender = "women's";
    }

    // Apply refinement modifications
    if (refinementType) {
      if (refinementType === 'more-casual') {
        // Modify styleVibe to be more casual
        profile.styleVibe = profile.styleVibe.includes('casual') ? profile.styleVibe : `casual ${profile.styleVibe}`;
      } else if (refinementType === 'different-colors') {
        // Cycle through color preferences
        const colorMap: Record<string, string> = {
          'mixed': 'neutral',
          'neutral': 'bold',
          'bold': 'pastel',
          'pastel': 'mixed',
        };
        profile.colorPreferences = colorMap[profile.colorPreferences] || 'mixed';
      } else if (refinementType === 'lower-prices') {
        // Adjust budget down
        const budgetMap: Record<string, string> = {
          '$$$$': '$$$',
          '$$$': '$$',
          '$$': '$',
          '$': '$',
        };
        profile.budget = budgetMap[profile.budget] || profile.budget;
      } else if (refinementType === 'more-options') {
        // Add variety - no specific change, just generate more diverse queries
        // This will be handled in the query generation
      }
    }

    // Validate required fields
    if (!profile.bodyType || !profile.styleVibe || !profile.budget || !profile.shoppingFor || !profile.colorPreferences) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate search queries using Claude - focus on outfit pieces
    const searchQueries = await generateSearchQueries(profile);

    // Search for products using Channel3 API
    const allProducts: Array<{
      id: string;
      name: string;
      brand: string;
      image: string;
      price: number;
      currency: string;
      buyLink: string;
      query: string;
      category?: string;
    }> = [];

    // Determine products per query based on refinement
    const productsPerQuery = refinementType === 'more-options' ? 3 : 2;
    
    // Search for products for each query
    for (const query of searchQueries) {
      try {
        const products = await searchProducts(query, productsPerQuery);
        if (products && products.length > 0) {
          products.forEach((product) => {
            // Try to infer category from query/name
            const category = inferCategory(query, product.name);
            allProducts.push({
              ...product,
              query,
              category,
            });
          });
        } else {
          console.warn(`No products returned for query: "${query}"`);
        }
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
        // Continue with other queries even if one fails
      }
    }

    console.log(`Total products found: ${allProducts.length} from ${searchQueries.length} queries`);

    // If no products were found, return an error
    if (allProducts.length === 0) {
      console.error('No products found for any query. Search queries were:', searchQueries);
      return NextResponse.json(
        { error: 'No products found. Please check your API configuration and try again.' },
        { status: 500 }
      );
    }

    // Limit products total - more for "more-options" refinement
    const maxProducts = refinementType === 'more-options' ? 16 : 12;
    const selectedProducts = allProducts.slice(0, maxProducts);
    console.log(`Selected ${selectedProducts.length} products for the haul`);

    // Generate reasons for each product using Claude
    const productsWithReasons = await Promise.all(
      selectedProducts.map(async (product) => {
        try {
          const reason = await generateProductReason(product.name, product.brand, profile);
          return {
            ...product,
            reason,
          };
        } catch (error) {
          console.error(`Error generating reason for ${product.name}:`, error);
          return {
            ...product,
            reason: `Perfect for your ${profile.styleVibe} aesthetic`,
          };
        }
      })
    );

    // Create a unique haul ID
    const haulId = `haul_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      haulId,
      products: productsWithReasons,
      queries: searchQueries,
    });
  } catch (error) {
    console.error('Error generating haul:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDev = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate haul. Please try again.',
        ...(isDev && { details: errorMessage, stack: error instanceof Error ? error.stack : undefined })
      },
      { status: 500 }
    );
  }
}

// Helper function to infer product category
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
  if (lowerQuery.includes('bag') || lowerQuery.includes('accessory') || lowerQuery.includes('jewelry') || lowerName.includes('bag') || lowerName.includes('accessory')) {
    return 'accessories';
  }
  
  return 'other';
}
