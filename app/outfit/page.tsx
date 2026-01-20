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
  const [quizData, setQuizData] = useState<any>(null);

  useEffect(() => {
    if (!haulId) {
      setLoading(false);
      return;
    }

    const loadOutfit = async () => {
      // Check if haulId is a UUID (database session ID) or localStorage key
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(haulId);

      // If it's a UUID, try loading from database first
      if (isUUID) {
        try {
          const response = await fetch(`/api/hauls/${haulId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.haul) {
              const haul = data.haul;
              const outfitIdeas = haul.outfits || [];
              
              if (outfitIdeas[outfitIndex]) {
                setOutfit(outfitIdeas[outfitIndex]);
                
                // Track outfit detail view
                track('outfit_detail_view', {
                  outfitName: outfitIdeas[outfitIndex].name,
                  haulId,
                  outfitIndex,
                });
              }
              
              // Load quiz data for style image
              setQuizData(haul.quizData || null);
              
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('Error loading haul from database:', err);
          // Fall through to localStorage
        }
      }

      // Load haul data from sessionStorage or localStorage (for old format or anonymous)
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
            
            // Load quiz data for style image
            setQuizData(data.quiz || data.quizData || null);
            
            setLoading(false);
          } catch (err) {
            console.error('Error parsing haul data:', err);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadOutfit();
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

  // Get style image from quiz data
  const getStyleImage = () => {
    if (!quizData) return null;
    
    // Check for styleVibes array (new format) or styleVibe string (old format)
    const styleVibes = quizData.styleVibes || (quizData.styleVibe ? [quizData.styleVibe] : []);
    
    if (styleVibes.length > 0) {
      // Use the first selected style
      return `/styles/${styleVibes[0]}.png`;
    }
    
    return null;
  };

  const styleImage = getStyleImage();

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
    <div className="min-h-screen bg-white">
      {/* Header - Mobile Only */}
      <div className="md:hidden px-4 pt-8 pb-4 border-b border-neutral-200">
        <Link
          href={haulId ? `/haul?id=${haulId}` : '/'}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4 uppercase tracking-wide"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to all looks
        </Link>
        <h1 className="text-2xl font-medium mb-1 uppercase tracking-tight">
          {outfit.name}
        </h1>
        <p className="text-xs text-neutral-500 uppercase tracking-wide">
          {outfit.occasion}
        </p>
      </div>

      {/* Main Layout - Desktop: Side by Side, Mobile: Stacked */}
      <div className="flex flex-col md:flex-row">
        {/* Left Side - Sticky Style Image & Info (Desktop Only) */}
        {styleImage && (
          <div className="hidden md:block md:w-1/2 lg:w-2/5 border-r border-neutral-200">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <div className="p-8 lg:p-12">
                {/* Back Link */}
                <Link
                  href={haulId ? `/haul?id=${haulId}` : '/'}
                  className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-8 uppercase tracking-wide"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to all looks
                </Link>

                {/* Style Image */}
                <div className="relative aspect-[2/3] w-full mb-8 bg-neutral-50 rounded-lg overflow-hidden">
                  <Image
                    src={styleImage}
                    alt="Style inspiration"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 40vw"
                  />
                </div>

                {/* Outfit Info */}
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-medium mb-2 uppercase tracking-tight">
                      {outfit.name}
                    </h1>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide mb-6">
                      {outfit.occasion}
                    </p>
                    
                    {/* Stylist Blurb */}
                    <div className="bg-neutral-50 border-l-4 border-black pl-6 py-4 mb-6">
                      <p className="text-sm italic text-neutral-700 leading-relaxed">
                        "{outfit.stylistBlurb}"
                      </p>
                    </div>
                  </div>

                  {/* Total Price */}
                  <div className="pt-6 border-t border-neutral-200">
                    <div className="flex items-baseline gap-4 mb-2">
                      <p className="text-sm text-neutral-500 uppercase tracking-wide">Total</p>
                      <p className="text-3xl font-medium uppercase tracking-tight">
                        ${getCurrentTotalPrice().toFixed(0)}
                      </p>
                    </div>
                    {outfit.priceRange && outfit.priceRange.min !== outfit.priceRange.max && (
                      <p className="text-xs text-neutral-500">
                        Range: ${outfit.priceRange.min.toFixed(0)} - ${outfit.priceRange.max.toFixed(0)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Side - Products Grid */}
        <div className={`flex-1 ${styleImage ? 'md:w-1/2 lg:w-3/5' : 'w-full'}`}>
          <div className="p-4 md:p-8 lg:p-12">
            {/* Header - Desktop Only (if no style image) or Mobile */}
            <div className={`mb-8 ${styleImage ? 'md:hidden' : ''}`}>
              {!styleImage && (
                <Link
                  href={haulId ? `/haul?id=${haulId}` : '/'}
                  className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6 uppercase tracking-wide"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to all looks
                </Link>
              )}
              <h1 className="text-2xl md:text-3xl font-medium mb-2 uppercase tracking-tight">
                {outfit.name}
              </h1>
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-4">
                {outfit.occasion}
              </p>
              {styleImage && (
                <>
                  <div className="bg-neutral-50 border-l-4 border-black pl-6 py-4 mb-6">
                    <p className="text-sm italic text-neutral-700 leading-relaxed">
                      "{outfit.stylistBlurb}"
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <p className="text-lg font-medium uppercase tracking-wide">
                      Total: <span className="text-2xl">${getCurrentTotalPrice().toFixed(0)}</span>
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Products Grid */}
            <div className="space-y-8">
              {outfit.items.map((item, itemIndex) => {
                const selectedVariant = selectedVariants[item.product.id];
                const mainProduct = selectedVariant || item.product;
                const hasVariants = item.variants.length > 0;
                
                return (
                  <div key={item.product.id} className="space-y-4">
                    {/* Category Header */}
                    <div>
                      <h2 className="text-base font-medium uppercase tracking-tight mb-1">
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </h2>
                      {item.reasoning && (
                        <p className="text-xs text-neutral-600 italic">
                          {item.reasoning}
                        </p>
                      )}
                    </div>

                    {/* Main Product + Variants Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {/* Main/Selected Product */}
                      <div
                        className={`relative group cursor-pointer transition-all border-2 rounded ${
                          true // Always show main product as selected
                            ? 'border-black bg-white'
                            : 'border-neutral-200 bg-white hover:border-neutral-400'
                        }`}
                        onClick={() => handleProductClick(mainProduct)}
                      >
                        {/* Product Image */}
                        <div className="relative aspect-[3/4] bg-neutral-50 mb-2 overflow-hidden rounded-t">
                          <img
                            src={mainProduct.image || '/placeholder.png'}
                            alt={mainProduct.name}
                            className="w-full h-full object-contain p-3"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.png';
                            }}
                          />
                        </div>

                        {/* Product Info */}
                        <div className="p-3 space-y-1">
                          <p className="text-xs text-neutral-500 uppercase tracking-wide line-clamp-1">
                            {mainProduct.brand}
                          </p>
                          <p className="text-xs font-medium uppercase tracking-tight line-clamp-2">
                            {mainProduct.name}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium">
                              ${mainProduct.price.toFixed(0)}
                            </p>
                          </div>
                        </div>

                        {/* Selected Indicator */}
                        <div className="absolute top-2 right-2 w-5 h-5 bg-black text-white flex items-center justify-center rounded-full">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>

                      {/* Variants */}
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
                              <img
                                src={variant.image || '/placeholder.png'}
                                alt={variant.name}
                                className="w-full h-full object-contain p-3"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.png';
                                }}
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
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onShop={handleShopClick}
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
