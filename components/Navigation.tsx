'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

export default function Navigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

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
            {user && (
              <Link
                href="/drops"
                className={`text-xs md:text-sm font-medium transition-colors py-2 px-1 ${
                  pathname === '/drops'
                    ? 'text-neutral-900'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                My Drops
              </Link>
            )}
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
            {user ? (
              <button
                onClick={() => signOut()}
                className="text-xs md:text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors py-2 px-1"
              >
                Sign Out
              </button>
            ) : (
              <span className="text-xs text-neutral-500">Anonymous</span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

