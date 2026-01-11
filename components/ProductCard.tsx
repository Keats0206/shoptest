import Image from 'next/image';

export interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  currency: string;
  buyLink: string;
  reason?: string;
}

interface ProductCardProps {
  product: Product;
  onShopClick?: () => void;
  onProductClick?: (product: Product) => void;
}

export default function ProductCard({ product, onShopClick, onProductClick }: ProductCardProps) {
  const handleShopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShopClick) {
      onShopClick();
    }
    // Track analytics
    if (typeof window !== 'undefined') {
      // Simple analytics - you can replace with your tracking service
      console.log('Product click:', product.id);
    }
    window.open(product.buyLink, '_blank', 'noopener,noreferrer');
  };

  const handleCardClick = () => {
    if (onProductClick) {
      onProductClick(product);
    }
  };

  return (
    <div 
      className="group relative bg-white rounded-2xl overflow-hidden border border-neutral-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
        {product.image && product.image !== '/placeholder.png' ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-400 text-sm">
            No Image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
            {product.brand}
          </p>
          <h3 className="font-medium text-neutral-900 line-clamp-2 mb-2">
            {product.name}
          </h3>
        </div>

        {/* Reason */}
        {product.reason && (
          <p className="text-sm text-neutral-600 mb-3 italic line-clamp-2">
            "{product.reason}"
          </p>
        )}

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-neutral-900">
            {product.currency === 'USD' ? '$' : product.currency} {product.price.toFixed(2)}
          </p>
          <button
            onClick={handleShopClick}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Shop Now
          </button>
        </div>
      </div>
    </div>
  );
}

