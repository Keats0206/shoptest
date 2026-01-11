'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
  queries?: string[];
  createdAt: string;
}

export default function DropsPage() {
  const router = useRouter();
  const [drops, setDrops] = useState<HaulData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load all hauls from localStorage
      const allHauls: HaulData[] = [];
      
      // Check all localStorage keys that start with 'haul_'
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('haul_')) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const data = JSON.parse(stored);
              // Extract haulId from key (format: haul_${haulId})
              const haulId = key.replace('haul_', '');
              allHauls.push({
                haulId,
                products: data.products || [],
                queries: data.queries || [],
                createdAt: data.createdAt || new Date().toISOString(),
              });
            }
          } catch (err) {
            console.error(`Error parsing haul ${key}:`, err);
          }
        }
      }
      
      // Sort by date (newest first)
      allHauls.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setDrops(allHauls);
      setLoading(false);
    }
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleViewDrop = (haulId: string) => {
    router.push(`/haul?id=${haulId}`);
  };

  const handleDeleteDrop = (haulId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`haul_${haulId}`);
      setDrops(prev => prev.filter(drop => drop.haulId !== haulId));
    }
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
            My Drops
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">
            {drops.length} {drops.length === 1 ? 'drop' : 'drops'} saved
          </p>
        </div>

        {drops.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-400 mb-6 text-sm uppercase tracking-wide">
              No drops yet
            </p>
            <button
              onClick={() => router.push('/quiz')}
              className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Take Quiz
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drops.map((drop) => (
              <div
                key={drop.haulId}
                onClick={() => handleViewDrop(drop.haulId)}
                className="relative group cursor-pointer border-2 border-neutral-200 hover:border-black transition-all"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteDrop(drop.haulId, e)}
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

                {/* Preview Grid */}
                <div className="grid grid-cols-3 gap-1 p-2 bg-neutral-50">
                  {drop.products.slice(0, 6).map((product, idx) => (
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
                  {drop.products.length > 6 && (
                    <div className="relative aspect-square bg-neutral-200 flex items-center justify-center">
                      <span className="text-xs text-neutral-500 font-medium">
                        +{drop.products.length - 6}
                      </span>
                    </div>
                  )}
                </div>

                {/* Drop Info */}
                <div className="p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                    {formatDate(drop.createdAt)}
                  </p>
                  <p className="text-sm font-medium uppercase tracking-tight">
                    {drop.products.length} pieces
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
