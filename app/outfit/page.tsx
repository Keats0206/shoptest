'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { type OutfitIdea, type OutfitItem, Product } from '@/components/OutfitCard';

function OutfitDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const outfitIndex = parseInt(searchParams.get('outfitIndex') || '0', 10);
  const haulId = searchParams.get('haulId');
  
  const [outfit, setOutfit] = useState<OutfitIdea | null>(null);
  const [loading, setLoading] = useState(true);
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

  const handleBuyClick = (product: { id: string; price: number; brand: string; buyLink: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    track('product_outbound_click', {
      productId: product.id,
      price: product.price,
      brand: product.brand,
      haulId: haulId || undefined,
    });
    window.open(product.buyLink, '_blank', 'noopener,noreferrer');
  };

  // Calculate total price using main recommended products
  const getCurrentTotalPrice = () => {
    if (!outfit) return 0;
    return outfit.items.reduce((sum, item) => {
      return sum + (item.product.price || 0);
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
            {/* Header - Desktop Only when no style image, or Mobile when no style image */}
            {!styleImage && (
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
                <h1 className="text-2xl md:text-3xl font-medium mb-2 uppercase tracking-tight">
                  {outfit.name}
                </h1>
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-4">
                  {outfit.occasion}
                </p>
              </div>
            )}

            {/* Products Grid */}
            <div className="space-y-12">
              {outfit.items.map((item, itemIndex) => {
                return (
                  <div key={item.product.id} className="space-y-6">
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

                    {/* Main Recommended Product */}
                    <div className="bg-neutral-50 border-2 border-neutral-200 text-neutral-900 p-6 rounded-lg">
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="relative w-32 h-40 md:w-40 md:h-52 flex-shrink-0 bg-white rounded overflow-hidden">
                          <img
                            src={item.product.image || '/placeholder.png'}
                            alt={item.product.name}
                            className="w-full h-full object-contain p-2"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.png';
                            }}
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                              {item.product.brand}
                            </p>
                            <p className="text-sm md:text-base font-medium uppercase tracking-tight mb-2 text-neutral-900">
                              {item.product.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 mb-3">
                            <p className="text-lg font-medium text-neutral-900">
                              ${item.product.price.toFixed(0)}
                            </p>
                            <span className="bg-lime-400 text-black px-3 py-1 text-xs font-medium uppercase tracking-wide font-bold">
                              Recommended
                            </span>
                          </div>
                          {/* Buy Button */}
                          <button
                            onClick={(e) => handleBuyClick(item.product, e)}
                            className="w-full bg-black text-white px-4 py-2 rounded font-medium text-sm uppercase tracking-wide hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                          >
                            Buy Now
                            <ExternalLink className="w-4 h-4" />
                            <span className="text-xs text-neutral-300">(opens in new tab)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Alternatives Section */}
                    {item.variants.length > 0 && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm text-neutral-500 uppercase tracking-wide mb-2">
                            Alternatives
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {item.variants.map((variant) => {
                            return (
                              <div
                                key={variant.id}
                                className="relative group transition-all border-2 border-neutral-200 rounded hover:border-neutral-400 bg-white"
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
                                <div className="p-3 space-y-2">
                                  <div className="space-y-1">
                                    <p className="text-xs text-neutral-500 uppercase tracking-wide line-clamp-1">
                                      {variant.brand}
                                    </p>
                                    <p className="text-xs font-medium uppercase tracking-tight line-clamp-2">
                                      {variant.name}
                                    </p>
                                    <p className="text-xs font-medium">
                                      ${variant.price.toFixed(0)}
                                    </p>
                                  </div>
                                  {/* Buy Button */}
                                  <button
                                    onClick={(e) => handleBuyClick(variant, e)}
                                    className="w-full bg-black text-white px-3 py-2 rounded text-xs font-medium uppercase tracking-wide hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    Buy
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
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
        </div>
      </div>

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
