'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import Link from 'next/link';
import ProductDetailModal, { type Product } from '@/components/ProductDetailModal';
import { useAuth } from '@/components/AuthProvider';
import { type OutfitIdea, type OutfitItem } from '@/components/OutfitCard';

function OutfitDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const outfitIndex = parseInt(searchParams.get('outfitIndex') || '0', 10);
  const haulId = searchParams.get('haulId');
  
  const [outfit, setOutfit] = useState<OutfitIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, Product>>({});

  useEffect(() => {
    if (!haulId) {
      setLoading(false);
      return;
    }

    // Load haul data from sessionStorage or localStorage
    if (typeof window !== 'undefined') {
      let storedHaul = sessionStorage.getItem(`haul_${haulId}`);
      
      if (!storedHaul) {
        storedHaul = localStorage.getItem(`haul_${haulId}`);
      }
      
      if (storedHaul) {
        try {
          const data = JSON.parse(storedHaul);
          
          // Get outfitIdeas or convert from legacy format
          let outfitIdeas: OutfitIdea[] = [];
          if (data.outfitIdeas && data.outfitIdeas.length > 0) {
            outfitIdeas = data.outfitIdeas;
          } else if (data.outfits && data.outfits.length > 0) {
            outfitIdeas = data.outfits.map((outfit: any) => {
              const items: OutfitItem[] = outfit.items.map((item: any) => ({
                category: item.category,
                product: item.product,
                variants: item.variants || item.alternatives || [],
                reasoning: item.reasoning,
                isMain: item.category !== 'shoes' && item.category !== 'bag' && item.category !== 'jewelry' && item.category !== 'accessories',
              }));
              
              const totalPrice = items.reduce((sum: number, item: OutfitItem) => sum + (item.product.price || 0), 0);
              const allPrices = items.flatMap((item: OutfitItem) => [
                item.product.price || 0,
                ...item.variants.map((v: Product) => v.price || 0)
              ]).filter((p: number) => p > 0);
              
              const priceRange = allPrices.length > 0 ? {
                min: Math.min(...allPrices),
                max: Math.max(...allPrices),
              } : undefined;
              
              return {
                name: outfit.name,
                occasion: outfit.occasion,
                stylistBlurb: outfit.stylistBlurb || `This ${outfit.name} look works together through color harmony and complementary silhouettes.`,
                items,
                totalPrice,
                priceRange,
              };
            });
          }

          if (outfitIdeas[outfitIndex]) {
            setOutfit(outfitIdeas[outfitIndex]);
            
            // Track outfit detail view
            track('outfit_detail_view', {
              outfitName: outfitIdeas[outfitIndex].name,
              haulId,
              outfitIndex,
            });
          }
          
          setLoading(false);
        } catch (err) {
          console.error('Error parsing haul data:', err);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
  }, [haulId, outfitIndex]);

  const handleVariantClick = (item: OutfitItem, variant: Product) => {
    setSelectedVariants(prev => ({
      ...prev,
      [item.product.id]: variant,
    }));
    
    track('variant_clicked', {
      originalProductId: item.product.id,
      variantProductId: variant.id,
      priceDifference: variant.price - item.product.price,
      outfitName: outfit?.name || '',
      haulId: haulId || undefined,
    });
    
    setSelectedProduct(variant);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleShopClick = () => {
    if (selectedProduct) {
      track('product_outbound_click', {
        productId: selectedProduct.id,
        price: selectedProduct.price,
        brand: selectedProduct.brand,
        haulId: haulId || undefined,
      });
      window.open(selectedProduct.buyLink, '_blank', 'noopener,noreferrer');
    }
  };

  // Calculate current total price (using selected variants if any)
  const getCurrentTotalPrice = () => {
    if (!outfit) return 0;
    return outfit.items.reduce((sum, item) => {
      const selectedVariant = selectedVariants[item.product.id];
      const productToUse = selectedVariant || item.product;
      return sum + (productToUse.price || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-64 bg-neutral-200 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-neutral-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!outfit) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-medium mb-4 uppercase tracking-tight">Outfit Not Found</h1>
          <p className="text-neutral-600 mb-8 text-sm">This outfit could not be loaded.</p>
          {haulId && (
            <Link
              href={`/haul?id=${haulId}`}
              className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Back to Looks
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={haulId ? `/haul?id=${haulId}` : '/'}
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6 uppercase tracking-wide"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to all looks
          </Link>
          
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-medium mb-2 uppercase tracking-tight">
              {outfit.name}
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-4">
              {outfit.occasion}
            </p>
            
            {/* Stylist Blurb */}
            <div className="bg-neutral-50 border-l-4 border-black pl-6 py-4 mb-6 max-w-3xl">
              <p className="text-sm italic text-neutral-700 leading-relaxed">
                "{outfit.stylistBlurb}"
              </p>
            </div>

            {/* Current Total Price */}
            <div className="flex items-center gap-4 mb-6">
              <p className="text-lg font-medium uppercase tracking-wide">
                Total: <span className="text-2xl">${getCurrentTotalPrice().toFixed(0)}</span>
              </p>
              {outfit.priceRange && outfit.priceRange.min !== outfit.priceRange.max && (
                <p className="text-sm text-neutral-500">
                  Range: ${outfit.priceRange.min.toFixed(0)} - ${outfit.priceRange.max.toFixed(0)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Items & Variants */}
        <div className="space-y-12">
          {outfit.items.map((item, itemIndex) => {
            const selectedVariant = selectedVariants[item.product.id];
            const productToShow = selectedVariant || item.product;
            const hasVariants = item.variants.length > 0;
            
            return (
              <div key={item.product.id} className="border-b border-neutral-200 pb-8 last:border-0">
                {/* Category Header */}
                <div className="mb-6">
                  <h2 className="text-lg font-medium uppercase tracking-tight mb-2">
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </h2>
                  {item.reasoning && (
                    <p className="text-sm text-neutral-600 italic">
                      {item.reasoning}
                    </p>
                  )}
                </div>

                {/* Current Product (Main or Selected Variant) */}
                <div className="mb-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Product Image */}
                    <div className="relative aspect-[3/4] w-full md:w-80 bg-neutral-50 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={productToShow.image || '/placeholder.png'}
                        alt={productToShow.name}
                        fill
                        className="object-contain p-6"
                        sizes="320px"
                      />
                      {selectedVariant && (
                        <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 text-xs uppercase tracking-wide">
                          Selected Alternative
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                          {productToShow.brand}
                        </p>
                        <h3 className="text-xl font-medium mb-2">{productToShow.name}</h3>
                        <p className="text-2xl font-bold mb-4">
                          ${productToShow.price.toFixed(2)}
                        </p>
                        {selectedVariant && (
                          <div className="mb-4">
                            <p className="text-xs text-neutral-500 mb-2">Original:</p>
                            <p className="text-sm line-through text-neutral-400">
                              {item.product.brand} {item.product.name} - ${item.product.price.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          handleProductClick(productToShow);
                          setTimeout(() => handleShopClick(), 100);
                        }}
                        className="px-6 py-3 bg-black text-white hover:bg-neutral-900 transition-colors font-medium text-sm uppercase tracking-wide"
                      >
                        Shop Now
                      </button>
                    </div>
                  </div>
                </div>

                {/* Variants */}
                {hasVariants && (
                  <div>
                    <h3 className="text-base font-medium uppercase tracking-wide mb-4">
                      Similar Items ({item.variants.length} options)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {item.variants.map((variant) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        const priceDiff = variant.price - item.product.price;
                        
                        return (
                          <div
                            key={variant.id}
                            className={`relative group cursor-pointer transition-all border-2 rounded ${
                              isSelected
                                ? 'border-black bg-white'
                                : 'border-neutral-200 bg-white hover:border-neutral-400'
                            }`}
                            onClick={() => handleVariantClick(item, variant)}
                          >
                            {/* Product Image */}
                            <div className="relative aspect-[3/4] bg-neutral-50 mb-2 overflow-hidden rounded-t">
                              <Image
                                src={variant.image || '/placeholder.png'}
                                alt={variant.name}
                                fill
                                className="object-contain p-3"
                                sizes="(max-width: 768px) 50vw, 25vw"
                              />
                            </div>

                            {/* Product Info */}
                            <div className="p-3 space-y-1">
                              <p className="text-xs text-neutral-500 uppercase tracking-wide line-clamp-1">
                                {variant.brand}
                              </p>
                              <p className="text-xs font-medium uppercase tracking-tight line-clamp-2">
                                {variant.name}
                              </p>
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium">
                                  ${variant.price.toFixed(0)}
                                </p>
                                {priceDiff !== 0 && (
                                  <span className={`text-xs ${
                                    priceDiff > 0 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Selected Indicator */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-black text-white flex items-center justify-center rounded-full">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onShop={handleShopClick}
        user={user}
        onTrackPrice={() => {
          // Track price tracking trigger if needed
        }}
      />
    </div>
  );
}

export default function OutfitDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-64 bg-neutral-200 mb-8" />
        </div>
      </div>
    }>
      <OutfitDetailContent />
    </Suspense>
  );
}
