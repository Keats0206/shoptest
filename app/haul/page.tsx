'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { track } from '@vercel/analytics';
import ProductDetailModal, { type Product } from '@/components/ProductDetailModal';
import DropFeedback from '@/components/DropFeedback';
import OutfitCard, { type OutfitIdea, type OutfitItem } from '@/components/OutfitCard';


// Backward compatibility interfaces
interface LegacyOutfitItem {
  outfitName: string;
  outfitOccasion: string;
  category: string;
  reasoning: string;
  query: string;
  product: Product;
  alternatives?: Product[];
  variants?: Product[];
}

interface LegacyOutfit {
  name: string;
  occasion: string;
  items: LegacyOutfitItem[];
  stylistBlurb?: string;
}

interface HaulData {
  products: Product[];
  outfits?: LegacyOutfit[];
  outfitIdeas?: OutfitIdea[]; // New structure
  versatilePieces?: LegacyOutfitItem[];
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
  const [products, setProducts] = useState<Product[]>([]);
  const [outfitIdeas, setOutfitIdeas] = useState<OutfitIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalQuiz, setOriginalQuiz] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFeedback, setShowFeedback] = useState(true);
  const haulId = searchParams.get('id');

  useEffect(() => {
    if (!haulId) {
      setError('No haul ID provided');
      setLoading(false);
      return;
    }

    const loadHaul = async () => {
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
              const loadedProducts = haul.products || [];
              setProducts(loadedProducts);
              
              // Set outfit ideas from the haul
              if (haul.outfits && haul.outfits.length > 0) {
                setOutfitIdeas(haul.outfits);
              } else {
                setOutfitIdeas([]);
              }
              
              setOriginalQuiz(haul.quizData || null);
              setLoading(false);
              
              // Check if feedback already submitted
              if (typeof window !== 'undefined') {
                const feedbackSubmitted = localStorage.getItem(`feedback_${haulId}`);
                setShowFeedback(feedbackSubmitted !== 'true');
              }
              
              // Track haul view
              track('haul_view', {
                haulId,
                productCount: loadedProducts.length,
                outfitCount: haul.outfits?.length || 0,
              });
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
        
        // Fallback to localStorage if not in sessionStorage
        if (!storedHaul) {
          storedHaul = localStorage.getItem(`haul_${haulId}`);
        }
        
        if (storedHaul) {
          try {
            const data: HaulData = JSON.parse(storedHaul);
            const loadedProducts = data.products || [];
            setProducts(loadedProducts);
            
            // Prioritize new outfitIdeas structure, fallback to legacy outfits
            if (data.outfitIdeas && data.outfitIdeas.length > 0) {
              setOutfitIdeas(data.outfitIdeas);
            } else if (data.outfits && data.outfits.length > 0) {
              // Convert legacy format to new format
              const converted: OutfitIdea[] = data.outfits.map(outfit => {
                const items: OutfitItem[] = outfit.items.map(item => ({
                  category: item.category,
                  product: item.product,
                  variants: item.variants || item.alternatives || [],
                  reasoning: item.reasoning,
                  isMain: item.category !== 'shoes' && item.category !== 'bag' && item.category !== 'jewelry' && item.category !== 'accessories',
                }));
                
                const totalPrice = items.reduce((sum, item) => sum + (item.product.price || 0), 0);
                const allPrices = items.flatMap(item => [
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
                  stylistBlurb: outfit.stylistBlurb || `This ${outfit.name} look works together through color harmony and complementary silhouettes.`,
                  items,
                  totalPrice,
                  priceRange,
                };
              });
              setOutfitIdeas(converted);
            } else {
              setOutfitIdeas([]);
            }
            
            setOriginalQuiz(data.quiz || data.profile || null);
            setLoading(false);
            
            // Check if feedback already submitted
            if (typeof window !== 'undefined') {
              const feedbackSubmitted = localStorage.getItem(`feedback_${haulId}`);
              setShowFeedback(feedbackSubmitted !== 'true');
            }
            
            // Track haul view (use loaded data, not state)
            const loadedOutfitIdeas = data.outfitIdeas || (data.outfits ? data.outfits.map(outfit => {
              const items = outfit.items.map(item => ({
                category: item.category,
                product: item.product,
                variants: item.variants || item.alternatives || [],
                reasoning: item.reasoning,
                isMain: true,
              }));
              const totalPrice = items.reduce((sum, item) => sum + (item.product.price || 0), 0);
              return {
                name: outfit.name,
                occasion: outfit.occasion,
                stylistBlurb: (outfit as any).stylistBlurb || '',
                items,
                totalPrice,
              };
            }) : []);
            
            track('haul_view', {
              haulId,
              productCount: loadedProducts.length,
              outfitCount: loadedOutfitIdeas.length,
            });
          } catch (err) {
            console.error('Error parsing haul data:', err);
            setError('Failed to load haul. Please start over.');
            setLoading(false);
          }
        } else {
          setError('Haul not found. Please start over.');
          setLoading(false);
        }
      }
    };

    loadHaul();
  }, [haulId]);


  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleShopClick = () => {
    if (selectedProduct) {
      // Track product outbound click
      track('product_outbound_click', {
        productId: selectedProduct.id,
        price: selectedProduct.price,
        brand: selectedProduct.brand,
        haulId,
      });
      window.open(selectedProduct.buyLink, '_blank', 'noopener,noreferrer');
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
            onClick={() => router.push('/quiz')}
            className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
          >
            Start Over
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
          <div>
            <h1 className="text-3xl md:text-4xl font-medium mb-2 uppercase tracking-tight">
              Your Stylist's Picks
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">
              {outfitIdeas.length} complete looks curated for {currentDate}
            </p>
          </div>
        </div>

        {/* Outfit Ideas Display */}
        {outfitIdeas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {outfitIdeas.map((outfit, outfitIndex) => (
              <OutfitCard
                key={outfitIndex}
                outfit={outfit}
                outfitIndex={outfitIndex}
                onProductClick={handleProductClick}
                haulId={haulId || undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-600">
              No outfit ideas found. Please try creating a new look.
            </p>
          </div>
        )}

        {/* Drop Feedback - Show at bottom after outfits */}
        {showFeedback && haulId && !loading && outfitIdeas.length > 0 && (
          <div className="mt-16 pt-8 border-t border-neutral-200">
            <DropFeedback
              haulId={haulId}
              onSubmitted={() => setShowFeedback(false)}
            />
          </div>
        )}
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
