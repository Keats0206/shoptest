'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';

interface HaulData {
  haulId: string;
  products: Array<{
    id: string;
    name: string;
    brand: string;
    image: string;
    price: number;
    currency: string;
    buyLink: string;
    reason?: string;
    category?: string;
  }>;
  outfitIdeas?: any[];
  outfits?: any[];
  queries?: string[];
  createdAt: string;
}

export default function LooksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [hauls, setHauls] = useState<HaulData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHauls = async () => {
      if (typeof window === 'undefined') return;
      
      // Only load from database if user is authenticated
      if (!user) {
        setHauls([]);
        setLoading(false);
        return;
      }
      
      try {
        // Load hauls (styling sessions) from database
        const response = await fetch('/api/hauls/list');
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded from database:', data.hauls?.length || 0, 'hauls');
          
          // Transform hauls to HaulData format for compatibility
          const dbHauls: HaulData[] = (data.hauls || []).map((haul: any) => ({
            haulId: haul.id,
            products: haul.products || [],
            outfitIdeas: haul.outfits || [],
            outfits: haul.outfits || [],
            queries: [],
            createdAt: haul.createdAt,
          }));
          
          // Sort by date (newest first)
          dbHauls.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          setHauls(dbHauls);
        } else {
          console.warn('Database query failed:', response.status, response.statusText);
          setHauls([]);
        }
      } catch (err) {
        console.error('Error loading hauls from database:', err);
        setHauls([]);
      }
      
      setLoading(false);
    };
    
    loadHauls();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleViewHaul = (haulId: string) => {
    router.push(`/haul?id=${haulId}`);
  };

  const handleDeleteHaul = async (haulId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Delete from database if authenticated
    if (user) {
      try {
        const response = await fetch(`/api/hauls/${haulId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          console.error('Failed to delete from database');
        }
      } catch (err) {
        console.error('Error deleting from database:', err);
      }
    }
    
    // Also remove from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`haul_${haulId}`);
    }
    
    // Update UI
    setHauls(prev => prev.filter(haul => haul.haulId !== haulId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-64 bg-neutral-200 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-neutral-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-medium mb-2 uppercase tracking-tight">
            My Looks
          </h1>
          <p className="text-sm text-neutral-600 mb-2 italic">
            Your personalized styling collections, saved digitally
          </p>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">
            {hauls.length} {hauls.length === 1 ? 'look' : 'looks'} saved
          </p>
        </div>

        {hauls.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-400 mb-6 text-sm uppercase tracking-wide">
              No looks yet
            </p>
            <button
              onClick={() => router.push('/quiz')}
              className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Get Styled
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hauls.map((haul) => (
              <div
                key={haul.haulId}
                onClick={() => handleViewHaul(haul.haulId)}
                className="relative group cursor-pointer border-2 border-neutral-200 hover:border-black transition-all"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteHaul(haul.haulId, e)}
                  className="absolute top-2 right-2 z-10 w-8 h-8 bg-white border-2 border-neutral-300 hover:border-black flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <svg
                    className="w-4 h-4 text-neutral-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Preview Grid - Show one product from each outfit */}
                <div className="grid grid-cols-3 gap-1 p-2 bg-neutral-50">
                  {(() => {
                    const outfits = haul.outfitIdeas || haul.outfits || [];
                    const displayProducts = outfits
                      .map((outfit: any) => {
                        // Get first main item or first item with image
                        const mainItem = outfit.items?.find((item: any) => item.isMain && item.product?.image);
                        const firstItem = outfit.items?.find((item: any) => item.product?.image);
                        return (mainItem || firstItem)?.product;
                      })
                      .filter((p: any) => p !== null)
                      .slice(0, 6);
                    
                    return (
                      <>
                        {displayProducts.map((product: any, idx: number) => (
                          <div
                            key={product.id || idx}
                            className="relative aspect-square bg-white overflow-hidden"
                          >
                            <Image
                              src={product.image || '/placeholder.png'}
                              alt={product.name}
                              fill
                              className="object-contain p-1"
                              sizes="(max-width: 768px) 33vw, 20vw"
                            />
                          </div>
                        ))}
                        {outfits.length > 6 && (
                          <div className="relative aspect-square bg-neutral-200 flex items-center justify-center">
                            <span className="text-xs text-neutral-500 font-medium">
                              +{outfits.length - 6}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Look Info */}
                <div className="p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                    {formatDate(haul.createdAt)}
                  </p>
                  <p className="text-sm font-medium uppercase tracking-tight">
                    {haul.outfitIdeas?.length || haul.outfits?.length || 0} {haul.outfitIdeas?.length === 1 ? 'outfit' : 'outfits'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
