import { NextRequest, NextResponse } from 'next/server';
import { generateOutfitStructure, QuizData } from '@/lib/anthropic';
import { searchProducts } from '@/lib/channel3';

export const runtime = 'nodejs';

// Simple in-memory rate limiting (for MVP - use Redis/KV in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // Max 10 hauls per hour per IP
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function getClientIP(request: NextRequest): string {
  // Check various headers for IP (Vercel uses x-forwarded-for)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Clean up old entries periodically (every 100 requests, rough approximation)
  if (Math.random() < 0.01) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    // New or expired window - reset
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: record.resetTime };
  }

  // Increment count
  record.count++;
  rateLimitMap.set(ip, record);
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count, resetAt: record.resetTime };
}

// Helper function to get budget price range
function getBudgetRange(budgetRange: string): { min: number; max: number } | undefined {
  const budgetRanges: Record<string, { min: number; max: number }> = {
    '$': { min: 20, max: 50 },
    '$$': { min: 50, max: 150 },
    '$$$': { min: 100, max: 350 },
    '$$$$': { min: 250, max: 1000 },
    '$$$$$': { min: 500, max: 10000 }, // Splurge range
  };
  return budgetRanges[budgetRange];
}

// Outfit structure definitions with required categories
const outfitStructures: Record<string, { minItems: number; requiredCategories: string[] }> = {
  'Professional Polished': {
    minItems: 4,
    requiredCategories: ['blazer', 'top', 'bottom', 'shoes']
  },
  'Professional Classic': {
    minItems: 4,
    requiredCategories: ['blazer', 'top', 'bottom', 'shoes']
  },
  'Refined Casual': {
    minItems: 4,
    requiredCategories: ['top', 'bottom', 'outerwear', 'shoes']
  },
  'Casual Refined': {
    minItems: 4,
    requiredCategories: ['top', 'bottom', 'outerwear', 'shoes']
  },
  'Weekend Elevated': {
    minItems: 4,
    requiredCategories: ['dress', 'outerwear', 'bag', 'shoes']
  },
  'Minimalist Chic': {
    minItems: 4,
    requiredCategories: ['dress', 'outerwear', 'bag', 'shoes']
  },
  'Elevated Basics': {
    minItems: 3,
    requiredCategories: ['top', 'bottom', 'shoes']
  },
  'Casual Weekend': {
    minItems: 3,
    requiredCategories: ['top', 'bottom', 'shoes']
  },
};

// Helper function to validate outfit completeness
function validateOutfitCompleteness(outfit: { name: string; items: any[] }): { valid: boolean; missing: string[] } {
  // Find matching outfit structure (case-insensitive partial match)
  const outfitKey = Object.keys(outfitStructures).find(key => 
    outfit.name.toLowerCase().includes(key.toLowerCase()) || 
    key.toLowerCase().includes(outfit.name.toLowerCase())
  );
  
  const structure = outfitKey ? outfitStructures[outfitKey] : null;
  
  if (!structure) {
    // Default validation: must have at least 3 items and shoes
    const hasShoes = outfit.items.some(item => 
      item.category?.toLowerCase() === 'shoes' || 
      item.category?.toLowerCase() === 'shoe'
    );
    return {
      valid: outfit.items.length >= 3 && hasShoes,
      missing: hasShoes ? [] : ['shoes']
    };
  }
  
  // Check minimum items
  if (outfit.items.length < structure.minItems) {
    return {
      valid: false,
      missing: [`Need at least ${structure.minItems} items, have ${outfit.items.length}`]
    };
  }
  
  // Check required categories
  const itemCategories = outfit.items.map(item => item.category?.toLowerCase() || '');
  const missingCategories = structure.requiredCategories.filter(category => 
    !itemCategories.some(itemCat => itemCat.includes(category.toLowerCase()))
  );
  
  return {
    valid: missingCategories.length === 0,
    missing: missingCategories
  };
}

// Helper function to filter products by price range
function filterProductsByPrice(products: any[], min: number, max: number): any[] {
  return products.filter(product => {
    const price = product.price || 0;
    return price >= min && price <= max;
  });
}

// Helper function to rank products (prefer products in budget range, then by price)
function rankProducts(products: any[], min: number, max: number): any[] {
  return products.sort((a, b) => {
    const priceA = a.price || 0;
    const priceB = b.price || 0;
    
    // First, prioritize products within budget range
    const aInRange = priceA >= min && priceA <= max;
    const bInRange = priceB >= min && priceB <= max;
    
    if (aInRange && !bInRange) return -1;
    if (!aInRange && bInRange) return 1;
    
    // If both in range or both out of range, prefer lower price (but not too low)
    if (priceA < min) return 1; // Too cheap, deprioritize
    if (priceB < min) return -1;
    
    return priceA - priceB; // Prefer lower price within acceptable range
  });
}

// Helper function to ensure query has gender prefix if needed
function ensureGenderInQuery(query: string, gender: 'male' | 'female' | 'unisex' = 'female'): string {
  const lowerQuery = query.toLowerCase();
  
  if (gender === 'unisex') {
    // Don't add gender prefix for unisex
    return query;
  }
  
  const genderTerms = gender === 'female' 
    ? ["women's", "womens", "women", "ladies", "lady"]
    : ["men's", "mens", "men", "male"];
  
  const hasGenderTerm = genderTerms.some(term => lowerQuery.includes(term));
  
  if (!hasGenderTerm) {
    return gender === 'female' ? `women's ${query}` : `men's ${query}`;
  }
  
  return query;
}

// Helper function to validate product matches query and user preferences
function validateProductMatch(
  product: { name: string; materials?: string[]; key_features?: string[]; [key: string]: any },
  query: string,
  userStyles?: string[]
): boolean {
  const queryTerms = query.toLowerCase();
  const productTitle = product.name.toLowerCase();
  const productDescription = (product.description || '').toLowerCase();
  const productMaterials = (product.materials || []).map(m => m.toLowerCase());
  const productFeatures = (product.key_features || []).map(f => f.toLowerCase());
  
  // Combine all product text for searching
  const allProductText = [productTitle, productDescription, ...productMaterials, ...productFeatures].join(' ');
  
  // Check for sleeve length mismatches
  if (queryTerms.includes('long sleeve') && (
    productTitle.includes('short sleeve') || 
    productTitle.includes('sleeveless') ||
    productTitle.includes('tank')
  )) {
    return false;
  }
  
  if (queryTerms.includes('short sleeve') && productTitle.includes('long sleeve')) {
    return false;
  }
  
  if (queryTerms.includes('sleeveless') && (
    productTitle.includes('sleeve') && !productTitle.includes('sleeveless')
  )) {
    return false;
  }
  
  // Check for pattern when user wants minimalist
  if (userStyles && userStyles.some(style => 
    style.toLowerCase().includes('minimalist') || 
    style.toLowerCase().includes('minimal')
  )) {
    const patterns = ['spot', 'print', 'pattern', 'stripe', 'geo', 'geometric', 'floral', 'polka', 'dot', 'check', 'plaid', 'paisley', 'animal', 'leopard', 'zebra'];
    if (patterns.some(p => allProductText.includes(p))) {
      return false;
    }
  }
  
  // Check for material matches (if query specifies material)
  const materialTerms = ['wool', 'cashmere', 'silk', 'cotton', 'linen', 'leather', 'suede', 'denim', 'polyester', 'nylon', 'merino', 'alpaca', 'mohair'];
  const queryMaterials = materialTerms.filter(material => queryTerms.includes(material));
  
  if (queryMaterials.length > 0 && productMaterials.length > 0) {
    // If query specifies a material, product should have it (or be close)
    const hasMatchingMaterial = queryMaterials.some(material => 
      productMaterials.some(pm => pm.includes(material) || material.includes(pm.split(' ')[0]))
    );
    
    // For premium materials, be stricter
    const premiumMaterials = ['cashmere', 'silk', 'merino', 'alpaca'];
    if (queryMaterials.some(m => premiumMaterials.includes(m)) && !hasMatchingMaterial) {
      return false;
    }
  }
  
  // Check for material conflicts (e.g., query wants wool, product is polyester)
  const materialConflicts: Record<string, string[]> = {
    'wool': ['polyester', 'nylon', 'acrylic'],
    'cashmere': ['polyester', 'nylon', 'acrylic'],
    'silk': ['polyester', 'nylon'],
    'cotton': ['polyester', 'nylon'],
    'leather': ['faux leather', 'vegan leather', 'pleather'],
  };
  
  for (const queryMaterial of queryMaterials) {
    const conflicts = materialConflicts[queryMaterial] || [];
    if (conflicts.some(conflict => allProductText.includes(conflict))) {
      // Only reject if product doesn't also have the requested material
      if (!allProductText.includes(queryMaterial)) {
        return false;
      }
    }
  }
  
  // Check for color mismatches (basic check - only reject clear conflicts)
  const colorTerms = ['black', 'white', 'navy', 'beige', 'cream', 'tan', 'brown', 'gray', 'grey', 'red', 'blue', 'green', 'pink', 'yellow', 'orange', 'purple'];
  const queryColors = colorTerms.filter(color => queryTerms.includes(color));
  if (queryColors.length > 0) {
    // Check for direct color conflicts (e.g., query wants black, product is white)
    const conflictingColors: Record<string, string[]> = {
      'black': ['white', 'cream', 'beige'],
      'white': ['black', 'navy'],
      'navy': ['white', 'cream'],
    };
    
    for (const queryColor of queryColors) {
      const conflicts = conflictingColors[queryColor] || [];
      if (conflicts.some(conflict => productTitle.includes(conflict))) {
        // Only reject if product doesn't also mention the requested color
        if (!productTitle.includes(queryColor)) {
          return false;
        }
      }
    }
  }
  
  // Check for fit mismatches
  if (queryTerms.includes('fitted') && (
    productTitle.includes('oversized') || 
    productTitle.includes('relaxed') ||
    productTitle.includes('loose')
  )) {
    return false;
  }
  
  if (queryTerms.includes('oversized') && (
    productTitle.includes('fitted') || 
    productTitle.includes('slim') ||
    productTitle.includes('tailored fit')
  )) {
    return false;
  }
  
  // Check for category mismatches
  if (queryTerms.includes('dress') && (
    productTitle.includes('top') || 
    productTitle.includes('shirt') ||
    productTitle.includes('blouse')
  ) && !productTitle.includes('dress')) {
    return false;
  }
  
  if (queryTerms.includes('sweater') && (
    productTitle.includes('shirt') || 
    productTitle.includes('blouse')
  ) && !productTitle.includes('sweater')) {
    return false;
  }
  
  // Check for length mismatches (for bottoms and dresses)
  if (queryTerms.includes('midi') && (
    productTitle.includes('mini') || 
    productTitle.includes('short')
  )) {
    return false;
  }
  
  if (queryTerms.includes('mini') && (
    productTitle.includes('midi') || 
    productTitle.includes('maxi') ||
    productTitle.includes('long')
  )) {
    return false;
  }
  
  // Check for neckline mismatches
  if (queryTerms.includes('turtleneck') && (
    productTitle.includes('v-neck') || 
    productTitle.includes('scoop neck') ||
    productTitle.includes('crew neck')
  ) && !productTitle.includes('turtleneck')) {
    return false;
  }
  
  if (queryTerms.includes('v-neck') && productTitle.includes('turtleneck')) {
    return false;
  }
  
  // Check for style mismatches (e.g., query wants "wide leg" but product is "skinny")
  if (queryTerms.includes('wide leg') && (
    productTitle.includes('skinny') || 
    productTitle.includes('slim fit') ||
    productTitle.includes('tapered')
  )) {
    return false;
  }
  
  if (queryTerms.includes('skinny') && (
    productTitle.includes('wide leg') || 
    productTitle.includes('straight leg')
  )) {
    return false;
  }
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      const resetInMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { 
          error: `Too many requests. Please wait ${resetInMinutes} minute${resetInMinutes !== 1 ? 's' : ''} before creating another look. This helps us keep the service free for everyone.`
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          }
        }
      );
    }
    
    const body = await request.json();
    
    // Support both new quiz format and legacy profile format
    let quiz: QuizData;
    let gender: 'male' | 'female' | 'unisex' = 'female'; // Default to female
    
    if (body.quiz) {
      // New format: quiz data directly
      quiz = body.quiz;
      // Extract gender from quiz or body level
      if (body.quiz.gender) {
        gender = body.quiz.gender === 'male' ? 'male' : body.quiz.gender === 'unisex' ? 'unisex' : 'female';
      } else if (body.gender) {
        gender = body.gender === 'male' ? 'male' : body.gender === 'unisex' ? 'unisex' : 'female';
      }
    } else if (body.styles || body.styleVibe) {
      // Legacy format: convert to quiz format
      quiz = {
        styles: body.styleVibe ? body.styleVibe.split(',').map((s: string) => s.trim()) : ['classic'],
        occasions: body.shoppingFor ? body.shoppingFor.split(',').map((s: string) => s.trim()) : ['everyday-casual'],
        bodyType: body.bodyType || 'average',
        fitPreference: body.fitPreference,
        budgetRange: body.budget || '$$',
        avoidances: [],
        mustHaves: [],
        colorPreferences: body.colorPreferences || 'mixed',
        favoriteBrands: body.favoriteBrands ? (Array.isArray(body.favoriteBrands) ? body.favoriteBrands : body.favoriteBrands.split(',').map((s: string) => s.trim())) : undefined,
      };
      // Extract gender from legacy format
      if (body.gender) {
        if (body.gender === "women's" || body.gender === "womens" || body.gender === "female") {
          gender = 'female';
        } else if (body.gender === "men's" || body.gender === "mens" || body.gender === "male") {
          gender = 'male';
        } else if (body.gender === "unisex") {
          gender = 'unisex';
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Missing required fields: quiz data or style profile' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!quiz.styles || quiz.styles.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: styles' },
        { status: 400 }
      );
    }
    if (!quiz.occasions || quiz.occasions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: occasions' },
        { status: 400 }
      );
    }
    if (!quiz.bodyType) {
      return NextResponse.json(
        { error: 'Missing required field: bodyType' },
        { status: 400 }
      );
    }
    if (!quiz.budgetRange) {
      return NextResponse.json(
        { error: 'Missing required field: budgetRange' },
        { status: 400 }
      );
    }

    // Step 1: Generate outfit structure with Claude
    console.log('Generating outfit structure...');
    const outfitStructure = await generateOutfitStructure(quiz);
    console.log(`Generated ${outfitStructure.outfits.length} outfit ideas`);
    
    // Validate outfit completeness
    const outfitValidations = outfitStructure.outfits.map(outfit => ({
      outfit,
      validation: validateOutfitCompleteness(outfit)
    }));
    
    const incompleteOutfits = outfitValidations.filter(v => !v.validation.valid);
    if (incompleteOutfits.length > 0) {
      console.warn(`Warning: ${incompleteOutfits.length} outfits are incomplete:`);
      incompleteOutfits.forEach(({ outfit, validation }) => {
        console.warn(`  - ${outfit.name}: Missing ${validation.missing.join(', ')} (${outfit.items.length} items)`);
      });
      
      // Log a warning but don't fail - Claude should handle this, but we log for debugging
      console.warn('Consider regenerating if outfits are missing required categories, especially shoes.');
    }

    // Step 2: Extract all items into a single array with outfit context
    const allItems = outfitStructure.outfits.flatMap(outfit =>
      outfit.items.map(item => ({
        ...item,
        outfitName: outfit.name,
        outfitOccasion: outfit.occasion,
        outfitBlurb: outfit.stylistBlurb,
      }))
    );

    console.log(`Total items to search: ${allItems.length}`);

    // Step 3: Search Channel3 for each item (in parallel)
    const budgetRange = getBudgetRange(quiz.budgetRange);
    const priceMax = budgetRange?.max ?? 10000; // Default to high max if not specified
    const priceMin = budgetRange?.min ?? 0;
    
    const searchResults = await Promise.all(
      allItems.map(async (item) => {
        try {
          // Ensure query has gender prefix if needed (for query string, not filter)
          const enhancedQuery = ensureGenderInQuery(item.query, gender);
          
          // Search with increased depth (10 results) and proper filters
          const products = await searchProducts(
            enhancedQuery, 
            10, 
            priceMax, 
            priceMin,
            {
              gender: gender, // Use gender from request
              availability: ['InStock', 'LimitedAvailability'], // Only available items
            }
          );
          
          if (!products || products.length === 0) {
            console.warn(`No products found for query: "${enhancedQuery}"`);
            return {
              ...item,
              query: enhancedQuery,
              products: [],
            };
          }
          
          // Filter products by price range
          const filteredProducts = filterProductsByPrice(products, priceMin ?? 0, priceMax ?? 10000);
          
          // Validate products match query and user preferences
          const validatedProducts = (filteredProducts.length > 0 ? filteredProducts : products)
            .filter(product => validateProductMatch(product, enhancedQuery, quiz.styles));
          
          // Rank validated products
          const rankedProducts = rankProducts(
            validatedProducts.length > 0 ? validatedProducts : (filteredProducts.length > 0 ? filteredProducts : products), 
            priceMin ?? 0, 
            priceMax ?? 10000
          );
          
          const invalidCount = (filteredProducts.length > 0 ? filteredProducts : products).length - validatedProducts.length;
          if (invalidCount > 0) {
            console.log(`Query "${enhancedQuery}": Filtered out ${invalidCount} products that didn't match query/preferences`);
          }
          
          console.log(`Query "${enhancedQuery}": Found ${products.length} products, ${filteredProducts.length} in budget, ${validatedProducts.length} validated`);
          
          return {
            ...item,
            query: enhancedQuery,
            products: rankedProducts,
          };
        } catch (error) {
          console.error(`Error searching for "${item.query}":`, error);
          return {
            ...item,
            query: ensureGenderInQuery(item.query),
            products: [],
          };
        }
      })
    );

    // Step 4: Pick best product per item (first result = main product, rest as variants)
    const finalItems = searchResults.map((item) => {
      const bestProduct = item.products[0];
      // Use results 2-8 as variants (up to 7 variants per item)
      const variants = item.products.slice(1, 8);

      if (!bestProduct) {
        console.warn(`No products found for query: "${item.query}"`);
        return null;
      }

      return {
        outfitName: item.outfitName,
        outfitOccasion: item.outfitOccasion,
        outfitBlurb: item.outfitBlurb,
        category: item.category,
        reasoning: item.reasoning,
        query: item.query,
        isMain: item.isMain ?? false,
        product: {
          id: bestProduct.id,
          name: bestProduct.name,
          brand: bestProduct.brand,
          image: bestProduct.image,
          price: bestProduct.price,
          currency: bestProduct.currency,
          buyLink: bestProduct.buyLink,
        },
        variants: variants.map(variant => ({
          id: variant.id,
          name: variant.name,
          brand: variant.brand,
          image: variant.image,
          price: variant.price,
          currency: variant.currency,
          buyLink: variant.buyLink,
        })),
      };
    });

    // Filter out null items (queries that returned no products)
    const validItems = finalItems.filter((item): item is NonNullable<typeof item> => item !== null);

    if (validItems.length === 0) {
      console.error('No products found for any query');
      return NextResponse.json(
        { error: 'No products found. Please check your API configuration and try again.' },
        { status: 500 }
      );
    }

    // Step 5: Structure for display - group items back into outfits with pricing
    const outfitIdeas = outfitStructure.outfits.map(outfit => {
      const outfitItems = validItems.filter(item => item.outfitName === outfit.name);
      
      // Calculate total price (sum of main 4 items)
      const totalPrice = outfitItems.reduce((sum, item) => sum + (item.product.price || 0), 0);
      
      // Calculate price range including variants
      const allPrices = outfitItems.flatMap(item => [
        item.product.price || 0,
        ...item.variants.map(v => v.price || 0)
      ]).filter(p => p > 0);
      
      const priceRange = allPrices.length > 0 ? {
        min: Math.min(...allPrices),
        max: Math.max(...allPrices),
      } : undefined;

      return {
        name: outfit.name,
        occasion: outfit.occasion,
        stylistBlurb: outfit.stylistBlurb || '',
        items: outfitItems,
        totalPrice,
        priceRange,
      };
    });

    // Also create a flat products array for backward compatibility
    const allProducts = validItems.map(item => item.product);

    // Create outfits structure for backward compatibility (old format)
    const outfitsWithProducts = outfitIdeas.map(outfit => ({
      name: outfit.name,
      occasion: outfit.occasion,
      items: outfit.items,
    }));

    // Create a unique haul ID
    const haulId = `haul_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      haulId,
      outfitIdeas, // New structure with blurbs and pricing
      outfits: outfitsWithProducts, // Backward compatibility
      products: allProducts, // Backward compatibility
      quiz, // Store quiz data for future refinements
    });
  } catch (error) {
    console.error('Error generating haul:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDev = process.env.NODE_ENV === 'development';

    // Return user-friendly error messages
    let userFriendlyError = 'Something went wrong. Please try again.';
    
    if (error instanceof Error) {
      // Check for specific error types from our API wrappers
      if (error.message.includes('style recommendations')) {
        userFriendlyError = 'We\'re having trouble generating your style recommendations. Please try again.';
      } else if (error.message.includes('finding products') || error.message.includes('product catalog')) {
        userFriendlyError = 'We\'re having trouble finding products right now. Please try again in a moment.';
      } else if (error.message.includes('Too many requests') || error.message.includes('429')) {
        userFriendlyError = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message.includes('Service temporarily unavailable') || error.message.includes('402')) {
        userFriendlyError = 'Service temporarily unavailable. Please try again later.';
      } else if (error.message.includes('accessing the product catalog') || error.message.includes('403') || error.message.includes('401')) {
        userFriendlyError = 'We\'re having trouble accessing the product catalog. Please try again.';
      }
    }

    return NextResponse.json(
      {
        error: userFriendlyError,
        ...(isDev && { details: errorMessage, stack: error instanceof Error ? error.stack : undefined }),
      },
      { status: 500 }
    );
  }
}
