import { SupabaseClient } from '@supabase/supabase-js';

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  image: string;
  price: number;
  currency: string;
  buyLink: string;
}

export interface OutfitItem {
  category: string;
  reasoning: string | null;
  isMain: boolean;
  product: Product | null;
  variants: Product[];
}

export interface Outfit {
  id: string;
  name: string;
  occasion: string | null;
  stylistBlurb: string | null;
  totalPrice: number | null;
  priceRange?: { min: number; max: number };
  shareToken: string | null;
  createdAt: string;
  items: OutfitItem[];
}

export interface Haul {
  id: string;
  haulId: string; // For compatibility
  createdAt: string;
  quizData: any; // JSONB data from quiz
  outfits: Outfit[];
  outfitIdeas: Outfit[]; // For compatibility
  products: Product[]; // All products from all outfits
  outfitCount: number;
}

/**
 * Load hauls (styling sessions) from database with all related outfits
 */
export async function loadHaulsFromDatabase(
  supabase: SupabaseClient,
  userId: string
): Promise<Haul[]> {
  // Get styling sessions (hauls)
  const { data: sessions, error: sessionsError } = await supabase
    .from('styling_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (sessionsError) {
    throw sessionsError;
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((s) => s.id);

  // Get session-outfit links
  const { data: sessionOutfits, error: linksError } = await supabase
    .from('session_outfits')
    .select('session_id, outfit_id, position')
    .in('session_id', sessionIds)
    .order('position', { ascending: true });

  if (linksError) {
    throw linksError;
  }

  const outfitIds = (sessionOutfits || []).map((so) => so.outfit_id);

  if (outfitIds.length === 0) {
    return sessions.map((session) => ({
      id: session.id,
      haulId: session.id,
      createdAt: session.created_at,
      quizData: session.quiz_data,
      outfits: [],
      outfitIdeas: [],
      products: [],
      outfitCount: 0,
    }));
  }

  // Get outfits with their items and products
  const { data: outfits, error: outfitsError } = await supabase
    .from('outfits')
    .select(`
      id,
      name,
      occasion,
      stylist_blurb,
      total_price,
      price_range_min,
      price_range_max,
      share_token,
      created_at,
      outfit_items (
        id,
        category,
        reasoning,
        is_main,
        position,
        products (
          id,
          external_id,
          name,
          brand,
          image,
          price,
          currency,
          buy_link
        ),
        product_variants (
          position,
          products (
            id,
            external_id,
            name,
            brand,
            image,
            price,
            currency,
            buy_link
          )
        )
      )
    `)
    .in('id', outfitIds);

  if (outfitsError) {
    throw outfitsError;
  }

  // Create a map of outfit_id -> outfit data
  const outfitsMap = new Map<string, Outfit>();
  (outfits || []).forEach((outfit) => {
    const transformedOutfit: Outfit = {
      id: outfit.id,
      name: outfit.name,
      occasion: outfit.occasion,
      stylistBlurb: outfit.stylist_blurb,
      totalPrice: outfit.total_price,
      priceRange: outfit.price_range_min && outfit.price_range_max
        ? { min: outfit.price_range_min, max: outfit.price_range_max }
        : undefined,
      shareToken: outfit.share_token,
      createdAt: outfit.created_at,
      items: (outfit.outfit_items || [])
        .sort((a, b) => a.position - b.position)
        .map((item) => {
          // Supabase returns joined relations as arrays, even for one-to-one relationships
          const productData = Array.isArray(item.products) ? item.products[0] : item.products;
          const product: Product | null = productData
            ? {
                id: productData.external_id || productData.id,
                name: productData.name,
                brand: productData.brand,
                image: productData.image,
                price: productData.price,
                currency: productData.currency,
                buyLink: productData.buy_link,
              }
            : null;

          const variants: Product[] = (item.product_variants || [])
            .sort((a, b) => a.position - b.position)
            .map((variant) => {
              // Supabase returns joined relations as arrays
              const variantProductData = Array.isArray(variant.products) ? variant.products[0] : variant.products;
              return variantProductData
                ? {
                    id: variantProductData.external_id || variantProductData.id,
                    name: variantProductData.name,
                    brand: variantProductData.brand,
                    image: variantProductData.image,
                    price: variantProductData.price,
                    currency: variantProductData.currency,
                    buyLink: variantProductData.buy_link,
                  }
                : null;
            })
            .filter((v): v is Product => v !== null);

          return {
            category: item.category,
            reasoning: item.reasoning,
            isMain: item.is_main,
            product,
            variants,
          };
        })
        .filter((item) => item.product !== null),
    };
    outfitsMap.set(outfit.id, transformedOutfit);
  });

  // Group outfits by session
  const hauls: Haul[] = sessions.map((session) => {
    const sessionOutfitsForSession = (sessionOutfits || [])
      .filter((so) => so.session_id === session.id)
      .sort((a, b) => a.position - b.position);

    const sessionOutfitsList = sessionOutfitsForSession
      .map((so) => outfitsMap.get(so.outfit_id))
      .filter((outfit): outfit is Outfit => outfit !== undefined);

    // Get all products from all outfits in this haul
    const allProducts: Product[] = sessionOutfitsList
      .flatMap((outfit) => outfit.items.map((item) => item.product))
      .filter((p): p is Product => p !== null);

    return {
      id: session.id,
      haulId: session.id, // For compatibility
      createdAt: session.created_at,
      quizData: session.quiz_data,
      outfits: sessionOutfitsList,
      outfitIdeas: sessionOutfitsList, // For compatibility
      products: allProducts, // All products from all outfits
      outfitCount: sessionOutfitsList.length,
    };
  });

  return hauls;
}
