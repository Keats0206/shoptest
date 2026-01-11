'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  currency: string;
  buyLink: string;
  reason?: string;
  category?: string; // 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessories'
}


interface HaulData {
  products: Product[];
  queries?: string[];
  createdAt: string;
  profile?: {
    styleVibe: string;
    shoppingFor: string;
    budget: string;
    bodyType: string;
    colorPreferences: string;
    gender: string;
    favoriteBrands?: string;
    userProblem?: string;
  };
}

export default function HaulPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [keptProducts, setKeptProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refining, setRefining] = useState(false);
  const [showRefineOptions, setShowRefineOptions] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<HaulData['profile'] | null>(null);
  const haulId = searchParams.get('id');

  useEffect(() => {
    if (!haulId) {
      setError('No haul ID provided');
      setLoading(false);
      return;
    }

    // Load haul data from sessionStorage or localStorage
    if (typeof window !== 'undefined') {
      let storedHaul = sessionStorage.getItem(`haul_${haulId}`);
      
      // Fallback to localStorage if not in sessionStorage
      if (!storedHaul) {
        storedHaul = localStorage.getItem(`haul_${haulId}`);
      }
      
      if (storedHaul) {
        try {
          const data: HaulData = JSON.parse(storedHaul);
          const loadedProducts = data.products || [];
          setProducts(loadedProducts);
          setOriginalProfile(data.profile || null);
          setLoading(false);
        } catch (err) {
          console.error('Error parsing haul data:', err);
          setError('Failed to load haul. Please take the quiz again.');
          setLoading(false);
        }
      } else {
        setError('Haul not found. Please take the quiz again.');
        setLoading(false);
      }
    }
  }, [haulId]);


  const handleKeepProduct = (productId: string) => {
    setKeptProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };


  const handleProductClick = (product: Product) => {
    window.open(product.buyLink, '_blank', 'noopener,noreferrer');
  };

  const handleRefine = async (refinementType: string) => {
    if (!originalProfile || !haulId) {
      setError('Unable to refine: original profile not found');
      return;
    }

    setRefining(true);
    setShowRefineOptions(false);
    setError(null);

    try {
      const response = await fetch('/api/generate-haul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...originalProfile,
          refinement: refinementType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refine haul');
      }

      const data = await response.json();
      const newHaulId = data.haulId || `haul_${Date.now()}`;
      
      if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('No products were generated. Please try again.');
      }
      
      if (typeof window !== 'undefined') {
        const haulData: HaulData = {
          products: data.products,
          queries: data.queries || [],
          createdAt: new Date().toISOString(),
          profile: originalProfile, // Keep original profile for future refinements
        };
        sessionStorage.setItem(`haul_${newHaulId}`, JSON.stringify(haulData));
        localStorage.setItem(`haul_${newHaulId}`, JSON.stringify(haulData));
      }
      
      router.push(`/haul?id=${newHaulId}`);
    } catch (error) {
      console.error('Error refining haul:', error);
      setError(error instanceof Error ? error.message : 'Failed to refine haul. Please try again.');
      setRefining(false);
    }
  };

  const handleShare = async () => {
    if (!haulId) return;

    const shareUrl = `${window.location.origin}/haul?id=${haulId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-64 bg-neutral-200 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-neutral-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-medium mb-4 uppercase tracking-tight">Error</h1>
          <p className="text-neutral-600 mb-8 text-sm">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
          >
            Take Quiz Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between md:gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-medium mb-2 uppercase tracking-tight">
                Your ShopPal Selection for {currentDate}
              </h1>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                {products.length} pieces curated for you
              </p>
            </div>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide mt-4 md:mt-0"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Rack View */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => {
              const isKept = keptProducts.has(product.id);
              return (
                <div
                  key={product.id}
                  className={`relative group cursor-pointer transition-all ${
                    isKept ? 'opacity-60' : ''
                  }`}
                  onClick={() => handleProductClick(product)}
                >
                  {/* Keep Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleKeepProduct(product.id);
                    }}
                    className={`absolute top-2 right-2 z-10 w-8 h-8 border-2 flex items-center justify-center transition-all ${
                      isKept
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white hover:border-black'
                    }`}
                  >
                    {isKept && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Product Image - Hanging Rack Style */}
                  <div className="relative aspect-[3/4] bg-neutral-50 mb-3 overflow-hidden">
                    {/* Top "hanger" hook */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-4 border-2 border-neutral-300 rounded-t-full bg-white z-10" />
                    <Image
                      src={product.image || '/placeholder.png'}
                      alt={product.name}
                      fill
                      className="object-contain p-6 pt-8"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">
                      {product.brand}
                    </p>
                    <p className="text-sm font-medium uppercase tracking-tight line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-sm font-medium">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        {/* Footer Actions */}
        <div className="mt-12 space-y-6">
          {/* Refine Section */}
          {originalProfile && (
            <div className="text-center">
              <button
                onClick={() => setShowRefineOptions(!showRefineOptions)}
                disabled={refining}
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-neutral-300 hover:border-black transition-colors font-medium text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refining ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Refining...</span>
                  </>
                ) : (
                  <span>Refine this drop</span>
                )}
              </button>
              
              {showRefineOptions && !refining && (
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => handleRefine('more-casual')}
                    className="px-4 py-2 border border-neutral-300 hover:border-black hover:bg-black hover:text-white transition-colors font-medium text-xs uppercase tracking-wide"
                  >
                    More casual
                  </button>
                  <button
                    onClick={() => handleRefine('different-colors')}
                    className="px-4 py-2 border border-neutral-300 hover:border-black hover:bg-black hover:text-white transition-colors font-medium text-xs uppercase tracking-wide"
                  >
                    Different colors
                  </button>
                  <button
                    onClick={() => handleRefine('lower-prices')}
                    className="px-4 py-2 border border-neutral-300 hover:border-black hover:bg-black hover:text-white transition-colors font-medium text-xs uppercase tracking-wide"
                  >
                    Lower prices
                  </button>
                  <button
                    onClick={() => handleRefine('more-options')}
                    className="px-4 py-2 border border-neutral-300 hover:border-black hover:bg-black hover:text-white transition-colors font-medium text-xs uppercase tracking-wide"
                  >
                    More options
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* New Selection Button */}
          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              <span>New ShopPal Selection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

