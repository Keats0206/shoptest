'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import ProductDetailModal, { type Product } from '@/components/ProductDetailModal';

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

export default function ShareableDropPage() {
  const params = useParams();
  const router = useRouter();
  const dropId = params.id as string;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!dropId) {
      setError('No drop ID provided');
      setLoading(false);
      return;
    }

    // First try to load from localStorage (for anonymous drops)
    if (typeof window !== 'undefined') {
      let storedHaul = sessionStorage.getItem(`haul_${dropId}`);
      
      if (!storedHaul) {
        storedHaul = localStorage.getItem(`haul_${dropId}`);
      }
      
      if (storedHaul) {
        try {
          const data: HaulData = JSON.parse(storedHaul);
          setProducts(data.products || []);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Error parsing haul data:', err);
        }
      }
    }

    // If not in localStorage, try to fetch from API (for shared drops)
    fetch(`/api/drops/share?token=${dropId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        setProducts(data.drop?.products || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching shared drop:', err);
        setError('Drop not found');
        setLoading(false);
      });
  }, [dropId]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleShopClick = () => {
    if (selectedProduct) {
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
          <h1 className="text-2xl font-medium mb-4 uppercase tracking-tight">Drop Not Found</h1>
          <p className="text-neutral-600 mb-8 text-sm">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
          >
            Take Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-medium mb-2 uppercase tracking-tight">
            Shared Style Drop
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">
            {currentDate} • {products.length} pieces
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-neutral-600 mb-4 max-w-2xl">
            These pieces are styled to work together as complete outfits. Each item has been thoughtfully selected to complement the others.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="relative group cursor-pointer transition-all"
              onClick={() => handleProductClick(product)}
            >
              <div className="relative aspect-[3/4] bg-neutral-50 mb-3 overflow-hidden">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-4 border-2 border-neutral-300 rounded-t-full bg-white z-10" />
                <Image
                  src={product.image || '/placeholder.png'}
                  alt={product.name}
                  fill
                  className="object-contain p-6 pt-8"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>

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
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/quiz')}
            className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
          >
            Create Your Own Drop
          </button>
        </div>
      </div>

      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onShop={handleShopClick}
      />
    </div>
  );
}
