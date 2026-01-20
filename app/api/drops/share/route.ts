import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing share token' }, { status: 400 });
    }

    const supabase = await createClient();

    // Find outfit by share_token (share tokens are on individual outfits now)
    const { data: outfit, error: outfitError } = await supabase
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
      .eq('share_token', token)
      .single();

    if (outfitError || !outfit) {
      return NextResponse.json({ error: 'Outfit not found' }, { status: 404 });
    }

    // Transform to old format for backward compatibility
    const items = (outfit.outfit_items || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => {
        const product = item.products
          ? {
              id: item.products.external_id,
              name: item.products.name,
              brand: item.products.brand,
              image: item.products.image,
              price: item.products.price,
              currency: item.products.currency,
              buyLink: item.products.buy_link,
            }
          : null;

        const variants = (item.product_variants || [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((variant: any) =>
            variant.products
              ? {
                  id: variant.products.external_id,
                  name: variant.products.name,
                  brand: variant.products.brand,
                  image: variant.products.image,
                  price: variant.products.price,
                  currency: variant.products.currency,
                  buyLink: variant.products.buy_link,
                }
              : null
          )
          .filter((v: any) => v !== null);

        return {
          category: item.category,
          reasoning: item.reasoning,
          isMain: item.is_main,
          product,
          variants,
        };
      })
      .filter((item: any) => item.product !== null);

    const allProducts = items
      .flatMap((item: any) => [item.product, ...(item.variants || [])])
      .filter((p: any) => p !== null);

    // Return drop data (no user info) in old format
    return NextResponse.json({
      drop: {
        id: outfit.id,
        haul_id: outfit.id, // Use outfit ID as haul_id for compatibility
        products: allProducts,
        queries: [],
        created_at: outfit.created_at,
        outfitIdeas: [{
          name: outfit.name,
          occasion: outfit.occasion,
          stylistBlurb: outfit.stylist_blurb,
          items,
          totalPrice: outfit.total_price,
          priceRange: outfit.price_range_min && outfit.price_range_max
            ? { min: outfit.price_range_min, max: outfit.price_range_max }
            : undefined,
        }],
      },
    });
  } catch (error) {
    console.error('Error fetching shared drop:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch drop' },
      { status: 500 }
    );
  }
}
