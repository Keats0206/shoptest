'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Product } from './ProductCard';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onShop: () => void;
}

interface EnrichedProductData {
  description: string | null;
  images: string[];
  materials: string[] | null;
  key_features: string[] | null;
}

export default function ProductDetailModal({ product, isOpen, onClose, onShop }: ProductDetailModalProps) {
  const [enrichedData, setEnrichedData] = useState<EnrichedProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true);
      setCurrentImageIndex(0);
      
      // Fetch enriched product data
      fetch('/api/enrich-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: product.buyLink }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.description || data.images || data.materials || data.key_features) {
            setEnrichedData({
              description: data.description || null,
              images: data.images || [],
              materials: data.materials || null,
              key_features: data.key_features || null,
            });
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error enriching product:', error);
          setLoading(false);
        });
    } else {
      setEnrichedData(null);
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const images = enrichedData?.images.length ? enrichedData.images : [product.image];
  const displayImage = images[currentImageIndex] || product.image;

  const handleShop = () => {
    onShop();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white rounded-full border-2 border-neutral-200 hover:border-black transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] bg-neutral-50 rounded-lg overflow-hidden">
              {displayImage && displayImage !== '/placeholder.png' ? (
                <Image
                  src={displayImage}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-400">
                  No Image
                </div>
              )}
            </div>
            
            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      currentImageIndex === idx ? 'border-black' : 'border-neutral-200'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="space-y-6">
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
                {product.brand}
              </p>
              <h2 className="text-2xl md:text-3xl font-medium mb-4">{product.name}</h2>
              <p className="text-3xl font-bold">
                {product.currency === 'USD' ? '$' : product.currency} {product.price.toFixed(2)}
              </p>
            </div>

            {/* AI Reason */}
            {product.reason && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Why We Chose This</p>
                <p className="text-sm text-neutral-900 italic">"{product.reason}"</p>
              </div>
            )}

            {/* Description */}
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-neutral-200 rounded w-full animate-pulse" />
                <div className="h-4 bg-neutral-200 rounded w-5/6 animate-pulse" />
              </div>
            ) : (
              enrichedData?.description && (
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-wide mb-2">Description</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                    {enrichedData.description}
                  </p>
                </div>
              )
            )}

            {/* Key Features */}
            {enrichedData?.key_features && enrichedData.key_features.length > 0 && (
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wide mb-2">Key Features</h3>
                <ul className="space-y-1">
                  {enrichedData.key_features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-neutral-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Materials */}
            {enrichedData?.materials && enrichedData.materials.length > 0 && (
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wide mb-2">Materials</h3>
                <p className="text-sm text-neutral-600">{enrichedData.materials.join(', ')}</p>
              </div>
            )}

            {/* Shop Button */}
            <button
              onClick={handleShop}
              className="w-full py-4 bg-black text-white hover:bg-neutral-800 transition-colors font-medium text-base uppercase tracking-wide rounded-lg"
            >
              Shop Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
