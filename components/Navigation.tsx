'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-neutral-200 bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl md:text-2xl font-serif font-bold tracking-tight">
              ShopPal
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/drops"
              className={`text-xs md:text-sm font-medium transition-colors py-2 px-1 ${
                pathname === '/drops'
                  ? 'text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Drops
            </Link>
            <Link
              href="/quiz"
              className={`text-xs md:text-sm font-medium transition-colors py-2 px-1 ${
                pathname === '/quiz'
                  ? 'text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Quiz
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

