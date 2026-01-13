'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import ProductDetailModal, { type Product } from '@/components/ProductDetailModal';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';


interface OutfitItem {
  outfitName: string;
  outfitOccasion: string;
  category: string;
  reasoning: string;
  query: string;
  product: Product;
  alternatives?: Product[];
}

interface Outfit {
  name: string;
  occasion: string;
  items: OutfitItem[];
}

interface HaulData {
  products: Product[];
  outfits?: Outfit[];
  versatilePieces?: OutfitItem[];
  quiz?: any;
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

function HaulContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [versatilePieces, setVersatilePieces] = useState<OutfitItem[]>([]);
  const [keptProducts, setKeptProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [originalQuiz, setOriginalQuiz] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState('');
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
          setOutfits(data.outfits || []);
          setVersatilePieces(data.versatilePieces || []);
          setOriginalQuiz(data.quiz || data.profile || null);
          setLoading(false);
          
          // Track haul view
          track('haul_view', {
            haulId,
            productCount: loadedProducts.length,
            outfitCount: data.outfits?.length || 0,
          });
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
    if (!user) {
      setAuthModalTitle('Sign in to save items');
      setAuthModalMessage('Sign in to keep and organize your favorite pieces');
      setShowAuthModal(true);
      return;
    }

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
    setSelectedProduct(product);
  };

  const handleShopClick = () => {
    if (selectedProduct) {
      // Track product click
      track('product_click', {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        brand: selectedProduct.brand,
        price: selectedProduct.price,
        haulId,
      });
      window.open(selectedProduct.buyLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRefine = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!user) {
      setAuthModalTitle('Sign in to refine your drop');
      setAuthModalMessage('Sign in to adjust your style preferences and get new recommendations');
      setShowAuthModal(true);
      return;
    }
    
    if (!originalQuiz || !haulId) {
      setError('Unable to refine: original quiz data not found');
      return;
    }

    if (!refinementPrompt.trim()) {
      return;
    }

    setRefining(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-haul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz: originalQuiz,
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
          products: data.products || [],
          outfits: data.outfits || [],
          versatilePieces: data.versatilePieces || [],
          quiz: data.quiz || originalQuiz,
          createdAt: new Date().toISOString(),
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

  const handleSaveDrop = async () => {
    if (!user) {
      setAuthModalTitle('Sign in to save this drop');
      setAuthModalMessage('Sign in to save and access your drops anytime');
      setShowAuthModal(true);
      return;
    }

    if (!haulId || !originalQuiz) {
      setError('Unable to save: missing drop data');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/drops/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          haulId,
          products,
          outfits,
          versatilePieces,
          quiz: originalQuiz,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save drop');
      }

      setSaved(true);
      track('drop_saved', { haulId });
      
      // Migrate localStorage hauls if this is first save
      if (typeof window !== 'undefined') {
        const allHauls: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('haul_')) {
            try {
              const haulData = JSON.parse(localStorage.getItem(key) || '{}');
              allHauls.push({
                haulId: key.replace('haul_', ''),
                ...haulData,
              });
            } catch (e) {
              // Skip invalid entries
            }
          }
        }

        if (allHauls.length > 0) {
          // Migrate all hauls
          fetch('/api/drops/migrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hauls: allHauls }),
          }).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Error saving drop:', error);
      setError(error instanceof Error ? error.message : 'Failed to save drop');
    } finally {
      setSaving(false);
    }
  };

  const handleNewDrop = () => {
    if (!user) {
      setAuthModalTitle('Sign in to create more drops');
      setAuthModalMessage('Sign in to generate unlimited personalized drops');
      setShowAuthModal(true);
      return;
    }
    router.push('/quiz');
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
                Your Personalized Drop
              </h1>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                Complete outfits curated for {currentDate} • {products.length} pieces
              </p>
            </div>
            {user && (
              <button
                onClick={handleSaveDrop}
                disabled={saving || saved}
                className="px-6 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Drop'}
              </button>
            )}
          </div>

          {/* Refinement Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <form onSubmit={handleRefine} className="flex-1 flex gap-2">
              <input
                type="text"
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                placeholder="Tell your stylist what to adjust... (e.g., 'make it more casual', 'lower the budget', 'try different colors')"
                className="flex-1 px-4 py-2 border-2 border-neutral-300 focus:border-black focus:outline-none text-sm"
                disabled={refining}
              />
              <button
                type="submit"
                disabled={refining || !refinementPrompt.trim()}
                className="px-6 py-2 border-2 border-neutral-300 hover:border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {refining ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refining...
                  </span>
                ) : (
                  'Refine'
                )}
              </button>
            </form>
            <button
              onClick={handleNewDrop}
              className="px-6 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide whitespace-nowrap"
            >
              New Drop
            </button>
          </div>
        </div>

        {/* Outfits Display */}
        {outfits.length > 0 ? (
          <div className="space-y-12 mb-12">
            {outfits.map((outfit, outfitIndex) => (
              <div key={outfitIndex} className="outfit-section">
                <div className="mb-4">
                  <h2 className="text-xl font-medium uppercase tracking-tight mb-1">
                    {outfit.name}
                  </h2>
                  <p className="text-sm text-neutral-500 uppercase tracking-wide">
                    {outfit.occasion}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {outfit.items.map((item) => {
                    const product = item.product;
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
                            e.preventDefault();
                            handleKeepProduct(product.id);
                          }}
                          className={`absolute top-2 right-2 z-20 w-8 h-8 border-2 flex items-center justify-center transition-all ${
                            isKept
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 bg-white hover:border-black'
                          }`}
                          type="button"
                        >
                          {isKept && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        {/* Product Image */}
                        <div className="relative aspect-[3/4] bg-neutral-50 mb-3 overflow-hidden">
                          <Image
                            src={product.image || '/placeholder.png'}
                            alt={product.name}
                            fill
                            className="object-contain p-6"
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
                          {item.reasoning && (
                            <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                              {item.reasoning}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Versatile Pieces */}
            {versatilePieces.length > 0 && (
              <div className="versatile-pieces-section">
                <div className="mb-4">
                  <h2 className="text-xl font-medium uppercase tracking-tight mb-1">
                    Versatile Pieces
                  </h2>
                  <p className="text-sm text-neutral-500 uppercase tracking-wide">
                    Works across multiple outfits
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {versatilePieces.map((item) => {
                    const product = item.product;
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
                            e.preventDefault();
                            handleKeepProduct(product.id);
                          }}
                          className={`absolute top-2 right-2 z-20 w-8 h-8 border-2 flex items-center justify-center transition-all ${
                            isKept
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 bg-white hover:border-black'
                          }`}
                          type="button"
                        >
                          {isKept && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        {/* Product Image */}
                        <div className="relative aspect-[3/4] bg-neutral-50 mb-3 overflow-hidden">
                          <Image
                            src={product.image || '/placeholder.png'}
                            alt={product.name}
                            fill
                            className="object-contain p-6"
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
                          {item.reasoning && (
                            <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                              {item.reasoning}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Fallback: Display products in grid if no outfits */
          <div className="mb-6">
            <p className="text-sm text-neutral-600 mb-4 max-w-2xl">
              These pieces are styled to work together as complete outfits. Each item has been thoughtfully selected to complement the others in your personalized drop.
            </p>
          </div>
        )}
        
        {/* Fallback Product Grid */}
        {outfits.length === 0 && products.length > 0 && (
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
                      e.preventDefault();
                      handleKeepProduct(product.id);
                    }}
                    className={`absolute top-2 right-2 z-20 w-8 h-8 border-2 flex items-center justify-center transition-all ${
                      isKept
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white hover:border-black'
                    }`}
                    type="button"
                  >
                    {isKept && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Product Image */}
                  <div className="relative aspect-[3/4] bg-neutral-50 mb-3 overflow-hidden">
                    <Image
                      src={product.image || '/placeholder.png'}
                      alt={product.name}
                      fill
                      className="object-contain p-6"
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
        )}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onShop={handleShopClick}
        user={user}
        onTrackPrice={() => {
          if (!user) {
            setAuthModalTitle('Sign in to track prices');
            setAuthModalMessage('Sign in to get notified when items go on sale');
            setShowAuthModal(true);
          }
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          // Retry the action that triggered auth
        }}
        title={authModalTitle}
        message={authModalMessage}
      />
    </div>
  );
}

export default function HaulPage() {
  return (
    <Suspense fallback={
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
    }>
      <HaulContent />
    </Suspense>
  );
}
