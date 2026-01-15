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
  const [drops, setDrops] = useState<HaulData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDrops = async () => {
      if (typeof window === 'undefined') return;
      
      const allHauls: HaulData[] = [];
      
      // If user is authenticated, load from database
      if (user) {
        try {
          const response = await fetch('/api/drops/list');
          if (response.ok) {
            const data = await response.json();
            const dbDrops: HaulData[] = (data.drops || []).map((drop: any) => ({
              haulId: drop.haul_id,
              products: drop.products || [],
              outfitIdeas: drop.outfitIdeas || drop.outfits,
              outfits: drop.outfits,
              queries: drop.queries || [],
              createdAt: drop.created_at || drop.createdAt,
            }));
            allHauls.push(...dbDrops);
          }
        } catch (err) {
          console.error('Error loading drops from database:', err);
        }
      }
      
      // Also load from localStorage (for anonymous or as fallback)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('haul_')) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const data = JSON.parse(stored);
              const haulId = key.replace('haul_', '');
              
              // Skip if already loaded from database
              if (!allHauls.find(h => h.haulId === haulId)) {
                allHauls.push({
                  haulId,
                  products: data.products || [],
                  outfitIdeas: data.outfitIdeas,
                  outfits: data.outfits,
                  queries: data.queries || [],
                  createdAt: data.createdAt || new Date().toISOString(),
                });
              }
            }
          } catch (err) {
            console.error(`Error parsing haul ${key}:`, err);
          }
        }
      }
      
      // Sort by date (newest first) and take only the 4 most recent
      allHauls.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setDrops(allHauls.slice(0, 4));
      setLoading(false);
    };
    
    loadDrops();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewDrop = (haulId: string) => {
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

  if (drops.length === 0) {
    return null; // Don't show section if no drops
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
          href="/drops"
          className="text-sm text-neutral-500 hover:text-neutral-900 uppercase tracking-wide transition-colors inline-flex items-center gap-2"
        >
          See all looks →
        </Link>
      </div>

      {/* Looks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {drops.map((drop, index) => {
          // Vary rotation for visual interest
          const rotations = [-1.5, 1, -0.5, 1.5];
          const rotation = rotations[index % 4];
          
          return (
            <div
              key={drop.haulId}
              onClick={() => handleViewDrop(drop.haulId)}
              className="group cursor-pointer relative transition-all duration-300 hover:-translate-y-2"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {/* Card */}
              <div className="bg-white border-2 border-neutral-200 hover:border-black transition-all shadow-lg hover:shadow-2xl overflow-hidden h-full group-hover:rotate-0">
                {/* Product Preview Grid */}
                <div className="grid grid-cols-2 gap-1 p-2 bg-neutral-50">
                  {drop.products.slice(0, 4).map((product, idx) => (
                    <div
                      key={product.id || idx}
                      className="relative aspect-square bg-white overflow-hidden"
                    >
                      <Image
                        src={product.image || '/placeholder.png'}
                        alt={product.name}
                        fill
                        className="object-contain p-1"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                  ))}
                </div>

                {/* Look Info */}
                <div className="p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
                    {formatDate(drop.createdAt)}
                  </p>
                  <p className="text-sm font-medium uppercase tracking-tight mb-1">
                    {drop.products.length} pieces
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
