'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

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

export default function StyleDropsShowcase() {
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
          
          // Transform hauls to HaulData format for compatibility
          const dbHauls: HaulData[] = (data.hauls || []).map((haul: any) => ({
            haulId: haul.id,
            products: haul.products || [],
            outfitIdeas: haul.outfits || [],
            outfits: haul.outfits || [],
            queries: [],
            createdAt: haul.createdAt,
          }));
          
          // Filter out invalid hauls (must have products or outfitIdeas/outfits)
          const validHauls = dbHauls.filter(haul => {
            const hasProducts = haul.products && haul.products.length > 0;
            const hasOutfitIdeas = haul.outfitIdeas && haul.outfitIdeas.length > 0;
            const hasOutfits = haul.outfits && haul.outfits.length > 0;
            return hasProducts || hasOutfitIdeas || hasOutfits;
          });
          
          // Sort by date (newest first) and take only the 4 most recent
          validHauls.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          setHauls(validHauls.slice(0, 4));
        } else {
          console.error('Failed to load hauls from database:', response.status, response.statusText);
          setHauls([]);
        }
      } catch (err) {
        console.error('Error loading hauls from database:', err);
        setHauls([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadHauls();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewHaul = (haulId: string) => {
    router.push(`/haul?id=${haulId}`);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 mb-24">
        <div className="h-8 w-48 bg-neutral-200 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (hauls.length === 0) {
    return null; // Don't show section if no hauls
  }

  return (
    <div className="max-w-6xl mx-auto px-4 mb-24">
      {/* Section Header */}
      <div className="mb-8 md:mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-medium mb-3 uppercase tracking-tight">
          Your Looks
        </h2>
        <p className="text-sm text-neutral-600 mb-4">
          Your personalized styling collections
        </p>
        <Link
          href="/looks"
          className="text-sm text-neutral-500 hover:text-neutral-900 uppercase tracking-wide transition-colors inline-flex items-center gap-2"
        >
          See all looks →
        </Link>
      </div>

      {/* Looks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {hauls.map((haul, index) => {
          // Vary rotation for visual interest
          const rotations = [-1.5, 1, -0.5, 1.5];
          const rotation = rotations[index % 4];
          
          return (
            <div
              key={haul.haulId}
              onClick={() => handleViewHaul(haul.haulId)}
              className="group cursor-pointer relative transition-all duration-300 hover:-translate-y-2"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {/* Card */}
              <div className="bg-white border-2 border-neutral-200 hover:border-black transition-all shadow-lg hover:shadow-2xl overflow-hidden h-full group-hover:rotate-0">
                {/* Product Preview Grid */}
                <div className="grid grid-cols-2 gap-1 p-2 bg-neutral-50">
                  {(() => {
                    // Prioritize outfitIdeas (new structure) over products array (old structure)
                    let displayProducts: any[] = [];
                    
                    // First, try to extract from outfitIdeas (new structure)
                    if (haul.outfitIdeas && haul.outfitIdeas.length > 0) {
                      // Get one product from each outfit for better representation
                      displayProducts = haul.outfitIdeas
                        .map((outfit: any) => {
                          // Get the first main item or first item with an image
                          const mainItem = outfit.items?.find((item: any) => item.isMain && item.product?.image);
                          const firstItem = outfit.items?.find((item: any) => item.product?.image);
                          return (mainItem || firstItem)?.product;
                        })
                        .filter((product: any) => product && product.image);
                    }
                    
                    // If no outfitIdeas, try outfits (backward compatibility)
                    if (displayProducts.length === 0 && haul.outfits && haul.outfits.length > 0) {
                      displayProducts = haul.outfits
                        .map((outfit: any) => {
                          const firstItem = outfit.items?.find((item: any) => item.product?.image);
                          return firstItem?.product;
                        })
                        .filter((product: any) => product && product.image);
                    }
                    
                    // Fallback to products array (old structure)
                    if (displayProducts.length === 0 && haul.products && haul.products.length > 0) {
                      displayProducts = haul.products.filter((product: any) => product && product.image);
                    }
                    
                    // If still no products, show placeholder
                    if (displayProducts.length === 0) {
                      return (
                        <div className="col-span-2 aspect-square bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
                          No images available
                        </div>
                      );
                    }
                    
                    return displayProducts.slice(0, 4).map((product: any, idx: number) => (
                      <div
                        key={product?.id || idx}
                        className="relative aspect-square bg-white overflow-hidden"
                      >
                        <Image
                          src={product?.image || '/placeholder.png'}
                          alt={product?.name || 'Product'}
                          fill
                          className="object-contain p-1"
                          sizes="(max-width: 768px) 50vw, 25vw"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ));
                  })()}
                </div>

                {/* Look Info */}
                <div className="p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
                    {formatDate(haul.createdAt)}
                  </p>
                  <p className="text-sm font-medium uppercase tracking-tight mb-1">
                    {(() => {
                      // Prioritize outfit count (new structure) over product count (old structure)
                      const outfitCount = haul.outfitIdeas?.length || haul.outfits?.length || 0;
                      const productCount = haul.products?.length || 0;
                      
                      if (outfitCount > 0) {
                        // Show outfit count for new structure
                        return `${outfitCount} ${outfitCount === 1 ? 'outfit' : 'outfits'}`;
                      }
                      if (productCount > 0) {
                        // Fallback to product count for old structure
                        return `${productCount} ${productCount === 1 ? 'piece' : 'pieces'}`;
                      }
                      return 'View look';
                    })()}
                  </p>
                  <p className="text-xs text-neutral-400 group-hover:text-neutral-600 transition-colors">
                    View look →
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
