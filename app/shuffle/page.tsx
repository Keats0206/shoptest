'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  currency: string;
  buyLink: string;
  category?: string;
}

interface BoardItem extends Product {
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large';
  rotation: number;
}

export default function ShufflePage() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [keptItems, setKeptItems] = useState<Set<string>>(new Set());
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [boardContainer, setBoardContainer] = useState<HTMLDivElement | null>(null);

  const generateBoardLayout = (products: Product[]): BoardItem[] => {
    return products.map((product, index) => {
      // Create varied positions and sizes for collage effect
      const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
      const size = sizes[index % 3] as 'small' | 'medium' | 'large';
      
      // Random positioning within bounds
      const maxX = 85;
      const maxY = 80;
      const x = Math.random() * maxX;
      const y = Math.random() * maxY;
      
      // Slight rotation for organic feel
      const rotation = (Math.random() - 0.5) * 8; // -4 to +4 degrees
      
      return {
        ...product,
        x,
        y,
        size,
        rotation,
      };
    });
  };

  const generateShuffle = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const keptIds = Array.from(keptItems);
      const response = await fetch('/api/shuffle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keptIds,
          count: 12,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate shuffle');
      }

      const data = await response.json();
      const boardItems = generateBoardLayout(data.products);
      
      // Merge kept items with new items
      const keptProducts = items.filter(item => keptItems.has(item.id));
      const newItems = boardItems.filter(item => !keptItems.has(item.id));
      
      setItems([...keptProducts, ...newItems]);
      
      // Unlock all new items
      const newUnlocked = new Set(unlockedItems);
      newItems.forEach(item => newUnlocked.add(item.id));
      setUnlockedItems(newUnlocked);
      
    } catch (err) {
      console.error('Error generating shuffle:', err);
      setError('Failed to generate. Tap to try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (itemId: string, event: React.MouseEvent | React.TouchEvent) => {
    // Don't toggle on click if we just finished dragging
    if (draggingItemId === itemId) {
      return;
    }

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // If not unlocked, unlock it first
    if (!unlockedItems.has(itemId)) {
      setUnlockedItems(prev => new Set(prev).add(itemId));
      return;
    }

    // Toggle keep status
    setKeptItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleDragStart = (itemId: string, event: React.MouseEvent | React.TouchEvent) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !unlockedItems.has(itemId) || !boardContainer) return;

    event.preventDefault();
    event.stopPropagation();

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    const containerRect = boardContainer.getBoundingClientRect();
    const containerX = (clientX - containerRect.left) / containerRect.width * 100;
    const containerY = (clientY - containerRect.top) / containerRect.height * 100;

    setDraggingItemId(itemId);
    setDragOffset({
      x: containerX - item.x,
      y: containerY - item.y,
    });
  };


  useEffect(() => {
    if (!draggingItemId || !dragOffset || !boardContainer) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingItemId || !dragOffset || !boardContainer) return;
      
      const clientX = e.clientX;
      const clientY = e.clientY;
      
      const containerRect = boardContainer.getBoundingClientRect();
      const newX = ((clientX - containerRect.left) / containerRect.width * 100) - dragOffset.x;
      const newY = ((clientY - containerRect.top) / containerRect.height * 100) - dragOffset.y;

      // Constrain to board bounds (with some padding for item size)
      const constrainedX = Math.max(0, Math.min(90, newX));
      const constrainedY = Math.max(0, Math.min(85, newY));

      setItems(prev => prev.map(item => 
        item.id === draggingItemId 
          ? { ...item, x: constrainedX, y: constrainedY }
          : item
      ));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingItemId || !dragOffset || !boardContainer) return;
      
      e.preventDefault();
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      
      const containerRect = boardContainer.getBoundingClientRect();
      const newX = ((clientX - containerRect.left) / containerRect.width * 100) - dragOffset.x;
      const newY = ((clientY - containerRect.top) / containerRect.height * 100) - dragOffset.y;

      // Constrain to board bounds (with some padding for item size)
      const constrainedX = Math.max(0, Math.min(90, newX));
      const constrainedY = Math.max(0, Math.min(85, newY));

      setItems(prev => prev.map(item => 
        item.id === draggingItemId 
          ? { ...item, x: constrainedX, y: constrainedY }
          : item
      ));
    };

    const handleMouseUp = () => {
      setDraggingItemId(null);
      setDragOffset(null);
    };

    const handleTouchEnd = () => {
      setDraggingItemId(null);
      setDragOffset(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingItemId, dragOffset, boardContainer]);

  const handleShuffleAgain = async () => {
    // Keep only kept items, shuffle the rest
    await generateShuffle();
  };

  const getSizeClasses = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return 'w-24 h-32 md:w-32 md:h-40';
      case 'medium':
        return 'w-32 h-40 md:w-40 md:h-52';
      case 'large':
        return 'w-40 h-52 md:w-48 md:h-64';
      default:
        return 'w-32 h-40';
    }
  };

  useEffect(() => {
    // Generate initial shuffle on mount
    if (items.length === 0) {
      generateShuffle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Header */}
      <div className="sticky top-12 md:top-16 left-0 right-0 z-20 bg-white/80 backdrop-blur-sm border-b border-neutral-200 px-4 py-2 md:px-6 md:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-medium uppercase tracking-tight mb-0.5 md:mb-1">
              Shuffle
            </h1>
            <p className="text-[10px] md:text-xs text-neutral-500 uppercase tracking-wide hidden md:block">
              Tap items to unlock • Keep what you love
            </p>
          </div>
          
          {keptItems.size > 0 && (
            <span className="text-xs text-neutral-500 uppercase tracking-wide hidden md:inline">
              {keptItems.size} kept
            </span>
          )}
        </div>
      </div>

      {/* Main Board Area */}
      <div className="py-8 min-h-screen pb-24">
        {error && (
          <div className="max-w-6xl mx-auto px-4 mb-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {items.length === 0 && !loading && (
          <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
            <p className="text-neutral-400 mb-6 text-sm uppercase tracking-wide">
              Ready to shuffle?
            </p>
            <button
              onClick={generateShuffle}
              className="px-8 py-4 border-2 border-black hover:bg-black hover:text-white transition-all text-sm uppercase tracking-wide font-medium"
            >
              Tap to Generate
            </button>
          </div>
        )}

        {/* Collage Board */}
        {items.length > 0 && (
          <div className="relative max-w-6xl mx-auto px-4" style={{ minHeight: '600px' }}>
            <div 
              ref={setBoardContainer}
              className="relative w-full" 
              style={{ aspectRatio: '4/3' }}
            >
              {items.map((item) => {
                const isKept = keptItems.has(item.id);
                const isUnlocked = unlockedItems.has(item.id);
                const isLocked = !isUnlocked;

                const isDragging = draggingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`absolute group transition-all duration-300 ${
                      isLocked ? 'opacity-40 grayscale cursor-pointer' : isDragging ? 'cursor-grabbing z-50' : 'cursor-grab'
                    } ${isKept ? 'ring-2 ring-black' : ''} ${isDragging ? 'scale-105' : ''}`}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      transform: `rotate(${isDragging ? 0 : item.rotation}deg)`,
                      zIndex: isDragging ? 50 : isKept ? 10 : 1,
                      touchAction: 'none',
                    }}
                    onMouseDown={(e) => !isLocked && handleDragStart(item.id, e)}
                    onTouchStart={(e) => !isLocked && handleDragStart(item.id, e)}
                    onClick={(e) => handleItemClick(item.id, e)}
                  >
                    {/* Lock overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-neutral-900/50 flex items-center justify-center z-10 rounded">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Keep indicator */}
                    {isKept && (
                      <div className="absolute -top-2 -right-2 z-20 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Product Image */}
                    <div
                      className={`relative bg-neutral-50 border-2 ${
                        isKept ? 'border-black' : 'border-neutral-200'
                      } overflow-hidden transition-all ${
                        getSizeClasses(item.size)
                      } ${
                        isUnlocked && !isKept ? 'group-hover:border-black group-hover:scale-105' : ''
                      }`}
                    >
                      <Image
                        src={item.image || '/placeholder.png'}
                        alt={item.name}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 25vw, 15vw"
                      />
                    </div>

                    {/* Product Info (shown on hover for unlocked items) */}
                    {isUnlocked && (
                      <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 bg-white border border-neutral-200 p-2 shadow-lg max-w-[150px]">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wide truncate">
                          {item.brand}
                        </p>
                        <p className="text-xs font-medium uppercase tracking-tight truncate">
                          {item.name}
                        </p>
                        <p className="text-xs font-medium mt-1">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-pulse space-y-4 text-center">
              <div className="text-sm text-neutral-400 uppercase tracking-wide">
                Generating your shuffle...
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {items.length > 0 && !loading && (
          <div className="max-w-6xl mx-auto px-4 mt-8 text-center">
            <div className="inline-flex flex-col md:flex-row items-center gap-4 text-xs text-neutral-400 uppercase tracking-wide">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-neutral-300 rounded"></div>
                <span>Tap to unlock</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black rounded"></div>
                <span>Tap to keep</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
                <span>Drag to move</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Shuffle Button */}
      {(items.length > 0 || loading) && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-200 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {keptItems.size > 0 && (
              <span className="text-xs text-neutral-500 uppercase tracking-wide">
                {keptItems.size} kept
              </span>
            )}
            <button
              onClick={handleShuffleAgain}
              disabled={loading}
              className="w-full md:w-auto px-6 py-4 bg-black text-white hover:bg-neutral-900 transition-all text-sm uppercase tracking-wide font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Shuffling...' : 'Shuffle'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

