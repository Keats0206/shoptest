import ProductCard, { Product } from './ProductCard';

interface HaulGridProps {
  products: Product[];
  onProductClick?: (productId: string) => void;
}

export default function HaulGrid({ products, onProductClick }: HaulGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">No products found. Try adjusting your preferences!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onShopClick={() => onProductClick?.(product.id)}
        />
      ))}
    </div>
  );
}

