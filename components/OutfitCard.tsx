'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { track } from '@vercel/analytics';

export interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  currency: string;
  buyLink: string;
}

export interface OutfitItem {
  category: string;
  product: Product;
  variants: Product[];
  reasoning: string;
  isMain?: boolean;
}

export interface OutfitIdea {
  name: string;
  occasion: string;
  stylistBlurb: string;
  items: OutfitItem[];
  totalPrice: number;
  priceRange?: { min: number; max: number };
}

interface OutfitCardProps {
  outfit: OutfitIdea;
  onProductClick?: (product: Product) => void;
  haulId?: string;
  outfitIndex?: number;
}

export default function OutfitCard({
  outfit,
  onProductClick,
  haulId,
  outfitIndex = 0,
}: OutfitCardProps & { outfitIndex?: number }) {
  const handleViewDetails = () => {
    track('outfit_expanded', {
      outfitName: outfit.name,
      haulId,
    });
  };

  const handleShopClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (onProductClick) {
      onProductClick(product);
    }
  };


  // Get price display text
  const getPriceDisplay = () => {
    if (outfit.priceRange && outfit.priceRange.min !== outfit.priceRange.max) {
      return `$${outfit.priceRange.min} - $${outfit.priceRange.max}`;
    }
    return `$${outfit.totalPrice.toFixed(0)}`;
  };

  const hasVariants = outfit.items.some(item => item.variants.length > 0);

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Collapsed View */}
      <div className="p-6">
        {/* Stylist Blurb */}
        <div className="mb-4">
          <p className="text-sm italic text-neutral-700 leading-relaxed">
            "{outfit.stylistBlurb}"
          </p>
        </div>

        {/* Outfit Name & Occasion */}
        <div className="mb-4">
          <h3 className="text-lg font-medium uppercase tracking-tight mb-1">
            {outfit.name}
          </h3>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">
            {outfit.occasion}
          </p>
        </div>

        {/* 4 Items Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {outfit.items.map((item) => {
            const product = item.product;
            
            return (
              <div
                key={product.id}
                className="relative group cursor-pointer transition-all"
                onClick={() => onProductClick && onProductClick(product)}
              >
                {/* Product Image */}
                <div className="relative aspect-[3/4] bg-neutral-50 mb-2 overflow-hidden rounded">
                  <Image
                    src={product.image || '/placeholder.png'}
                    alt={product.name}
                    fill
                    className="object-contain p-3"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>

                {/* Product Info */}
                <div className="space-y-0.5">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide line-clamp-1">
                    {product.brand}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-tight line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-xs font-medium">
                    ${product.price.toFixed(0)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Price */}
        <div className="mb-4 pt-4 border-t border-neutral-200">
          <p className="text-sm font-medium uppercase tracking-wide">
            Total: <span className="text-base">{getPriceDisplay()}</span>
          </p>
        </div>

        {/* View Details Button */}
        {haulId && (
          <Link
            href={`/outfit?haulId=${haulId}&outfitIndex=${outfitIndex}`}
            onClick={handleViewDetails}
            className="block w-full px-4 py-2 border-2 border-neutral-300 hover:border-black hover:bg-black hover:text-white transition-colors font-medium text-xs uppercase tracking-wide text-center"
          >
            {hasVariants ? `View Similar Items (${outfit.items.reduce((sum, item) => sum + item.variants.length, 0)})` : 'View Details'}
          </Link>
        )}
      </div>
    </div>
  );
}
