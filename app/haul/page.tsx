'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import ProductDetailModal, { type Product } from '@/components/ProductDetailModal';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';
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
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [outfitIdeas, setOutfitIdeas] = useState<OutfitIdea[]>([]);
  const [keptProducts, setKeptProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalQuiz, setOriginalQuiz] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState('');
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFeedback, setShowFeedback] = useState(true);
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
          setError('Failed to load drop. Please start over.');
          setLoading(false);
        }
      } else {
        setError('Drop not found. Please start over.');
        setLoading(false);
      }
    }
  }, [haulId]);


  const handleKeepProduct = (productId: string) => {
    if (!user) {
      setAuthModalTitle('Sign in to save items');
      setAuthModalMessage('Sign in to keep and organize your favorite pieces');
      setShowAuthModal(true);
      // Track auth trigger
      track('auth_triggered', {
        trigger: 'keep_item',
        haulId,
      });
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

  const handleSaveDrop = async () => {
    if (!user) {
      setAuthModalTitle('Sign in to save this drop');
      setAuthModalMessage('Sign in to save and access your drops anytime');
      setShowAuthModal(true);
      // Track auth trigger
      track('auth_triggered', {
        trigger: 'save_drop',
        haulId,
      });
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
          outfitIdeas: outfitIdeas.length > 0 ? outfitIdeas : undefined,
          outfits: outfitIdeas.length > 0 ? outfitIdeas.map(o => ({
            name: o.name,
            occasion: o.occasion,
            items: o.items.map(item => ({
              outfitName: o.name,
              outfitOccasion: o.occasion,
              category: item.category,
              reasoning: item.reasoning,
              query: '',
              product: item.product,
              variants: item.variants,
            })),
          })) : undefined, // Backward compatibility
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
    // Always allow new drops - styling consultation is available to everyone
    // Auth is optional for saving, but not required for creating new drops
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
          <div className="flex flex-col md:flex-row md:items-start md:justify-between md:gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-medium mb-2 uppercase tracking-tight">
                Your Stylist's Picks
              </h1>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                {outfitIdeas.length} complete looks curated for {currentDate}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 items-center">
            <button
              onClick={handleNewDrop}
              className="px-6 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Create Another Look
            </button>
            {user && (
              <button
                onClick={handleSaveDrop}
                disabled={saving || saved}
                className="px-6 py-2 border-2 border-neutral-300 hover:border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Look'}
              </button>
            )}
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
                onKeepProduct={handleKeepProduct}
                keptProducts={keptProducts}
                user={user}
                haulId={haulId || undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-600 mb-4">
              No outfit ideas found. Please try creating a new look.
            </p>
            <button
              onClick={handleNewDrop}
              className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Create New Look
            </button>
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
        user={user}
        onTrackPrice={() => {
          if (!user) {
            setAuthModalTitle('Sign in to track prices');
            setAuthModalMessage('Sign in to get notified when items go on sale');
            setShowAuthModal(true);
            // Track auth trigger
            track('auth_triggered', {
              trigger: 'track_price',
              haulId,
            });
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
        trigger={authModalTitle.toLowerCase().includes('save') ? 'save_drop' 
          : authModalTitle.toLowerCase().includes('refine') ? 'refine'
          : authModalTitle.toLowerCase().includes('keep') ? 'keep_item'
          : authModalTitle.toLowerCase().includes('create') ? 'new_drop'
          : authModalTitle.toLowerCase().includes('track') ? 'track_price'
          : 'haul_page'}
        haulId={haulId || undefined}
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
