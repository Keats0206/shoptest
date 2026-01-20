import { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export interface OutfitIdea {
  name: string;
  occasion: string;
  stylistBlurb: string;
  items: Array<{
    category: string;
    reasoning?: string;
    isMain?: boolean;
    product: {
      id: string;
      name: string;
      brand?: string;
      image: string;
      price: number;
      currency?: string;
      buyLink: string;
    };
    variants?: Array<{
      id: string;
      name: string;
      brand?: string;
      image: string;
      price: number;
      currency?: string;
      buyLink: string;
    }>;
  }>;
  totalPrice: number;
  priceRange?: { min: number; max: number };
}

/**
 * Save outfits to the normalized database schema
 */
export async function saveOutfitsToDatabase(
  supabase: SupabaseClient,
  userId: string,
  outfitIdeas: OutfitIdea[],
  quizData?: unknown
): Promise<{ sessionId: string; outfitIds: string[] }> {
  // Step 1: Create styling session
  const { data: session, error: sessionError } = await supabase
    .from('styling_sessions')
    .insert({
      user_id: userId,
      quiz_data: quizData || null,
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`Failed to create styling session: ${sessionError.message}`);
  }

  const sessionId = session.id;
  const outfitIds: string[] = [];

  // Step 2: Process each outfit
  for (let outfitIndex = 0; outfitIndex < outfitIdeas.length; outfitIndex++) {
    const outfit = outfitIdeas[outfitIndex];

    // Step 2a: Create or get products
    const productIds: string[] = [];
    const variantMaps: Map<number, string[]> = new Map(); // Maps item index to variant product IDs

    for (let itemIndex = 0; itemIndex < outfit.items.length; itemIndex++) {
      const item = outfit.items[itemIndex];

      // Insert or get main product
      const { data: mainProduct, error: productError } = await supabase
        .from('products')
        .upsert(
          {
            external_id: item.product.id,
            name: item.product.name,
            brand: item.product.brand || null,
            image: item.product.image,
            price: item.product.price,
            currency: item.product.currency || 'USD',
            buy_link: item.product.buyLink,
          },
          {
            onConflict: 'external_id',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (productError) {
        console.error(`Error upserting product ${item.product.id}:`, productError);
        // Try to get existing product
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('external_id', item.product.id)
          .single();

        if (existing) {
          productIds.push(existing.id);
        } else {
          throw new Error(`Failed to save product: ${item.product.id}`);
        }
      } else {
        productIds.push(mainProduct.id);
      }

      // Insert or get variant products
      const variantProductIds: string[] = [];
      if (item.variants && item.variants.length > 0) {
        for (const variant of item.variants) {
          const { data: variantProduct, error: variantError } = await supabase
            .from('products')
            .upsert(
              {
                external_id: variant.id,
                name: variant.name,
                brand: variant.brand || null,
                image: variant.image,
                price: variant.price,
                currency: variant.currency || 'USD',
                buy_link: variant.buyLink,
              },
              {
                onConflict: 'external_id',
                ignoreDuplicates: false,
              }
            )
            .select()
            .single();

          if (variantError) {
            console.error(`Error upserting variant ${variant.id}:`, variantError);
            // Try to get existing
            const { data: existing } = await supabase
              .from('products')
              .select('id')
              .eq('external_id', variant.id)
              .single();

            if (existing) {
              variantProductIds.push(existing.id);
            }
          } else {
            variantProductIds.push(variantProduct.id);
          }
        }
      }
      variantMaps.set(itemIndex, variantProductIds);
    }

    // Step 2b: Create outfit
    const shareToken = randomBytes(16).toString('hex');
    const { data: savedOutfit, error: outfitError } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        name: outfit.name,
        occasion: outfit.occasion || null,
        stylist_blurb: outfit.stylistBlurb || null,
        total_price: outfit.totalPrice,
        price_range_min: outfit.priceRange?.min || null,
        price_range_max: outfit.priceRange?.max || null,
        share_token: shareToken,
      })
      .select()
      .single();

    if (outfitError) {
      throw new Error(`Failed to create outfit: ${outfitError.message}`);
    }

    outfitIds.push(savedOutfit.id);

    // Step 2c: Create outfit items
    for (let itemIndex = 0; itemIndex < outfit.items.length; itemIndex++) {
      const item = outfit.items[itemIndex];
      const productId = productIds[itemIndex];

      const { data: outfitItem, error: itemError } = await supabase
        .from('outfit_items')
        .insert({
          outfit_id: savedOutfit.id,
          product_id: productId,
          category: item.category,
          reasoning: item.reasoning || null,
          is_main: item.isMain || false,
          position: itemIndex,
        })
        .select()
        .single();

      if (itemError) {
        console.error(`Error creating outfit item:`, itemError);
        continue;
      }

      // Step 2d: Create product variants
      const variantProductIds = variantMaps.get(itemIndex) || [];
      for (let variantIndex = 0; variantIndex < variantProductIds.length; variantIndex++) {
        const variantProductId = variantProductIds[variantIndex];

        await supabase.from('product_variants').insert({
          outfit_item_id: outfitItem.id,
          product_id: variantProductId,
          position: variantIndex,
        });
      }
    }

    // Step 2e: Link outfit to session
    await supabase.from('session_outfits').insert({
      session_id: sessionId,
      outfit_id: savedOutfit.id,
      position: outfitIndex,
    });
  }

  return { sessionId, outfitIds };
}

export interface LoadedOutfit {
  id: string;
  name: string;
  occasion: string | null;
  stylistBlurb: string | null;
  totalPrice: number | null;
  priceRange?: { min: number; max: number };
  shareToken: string | null;
  createdAt: string;
  items: Array<{
    category: string;
    reasoning: string | null;
    isMain: boolean;
    product: {
      id: string;
      name: string;
      brand: string | null;
      image: string;
      price: number;
      currency: string;
      buyLink: string;
    } | null;
    variants: Array<{
      id: string;
      name: string;
      brand: string | null;
      image: string;
      price: number;
      currency: string;
      buyLink: string;
    }>;
  }>;
}

/**
 * Load outfits from database with all related data
 */
export async function loadOutfitsFromDatabase(
  supabase: SupabaseClient,
  userId: string
): Promise<LoadedOutfit[]> {
  // First get outfits
  const { data: outfits, error } = await supabase
    .from('outfits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  if (!outfits || outfits.length === 0) {
    return [];
  }

  // Then get outfit items for each outfit
  const outfitIds = outfits.map((o) => o.id);
  const { data: outfitItems, error: itemsError } = await supabase
    .from('outfit_items')
    .select(`
      *,
      products (*),
      product_variants (
        position,
        products (*)
      )
    `)
    .in('outfit_id', outfitIds)
    .order('position', { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  // Group items by outfit_id
  const itemsByOutfit = new Map<string, typeof outfitItems>();
  (outfitItems || []).forEach((item) => {
    if (!itemsByOutfit.has(item.outfit_id)) {
      itemsByOutfit.set(item.outfit_id, []);
    }
    itemsByOutfit.get(item.outfit_id)!.push(item);
  });

  // Transform to frontend format
  return outfits.map((outfit): LoadedOutfit => {
    const items = (itemsByOutfit.get(outfit.id) || [])
      .sort((a, b) => a.position - b.position)
      .map((item) => {
        // Supabase returns joined relations as arrays, even for one-to-one relationships
        const productData = Array.isArray(item.products) ? item.products[0] : item.products;
        const product = productData
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

        const variants = (item.product_variants || [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((variant: any) => {
            // Supabase returns joined relations as arrays, even for one-to-one relationships
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
          .filter((v: any): v is NonNullable<typeof v> => v !== null);

        return {
          category: item.category,
          reasoning: item.reasoning,
          isMain: item.is_main,
          product,
          variants,
        };
      })
      .filter((item) => item.product !== null);

    return {
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
      items,
    };
  });
}
