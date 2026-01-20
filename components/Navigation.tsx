'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import AuthModal from './AuthModal';

export default function Navigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignIn = () => {
    // Store current path for redirect after auth
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_redirect_path', pathname);
    }
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Redirect will be handled by callback route
  };

  return (
    <>
      <nav className="border-b border-neutral-200 bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 md:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-xl md:text-2xl font-serif font-bold tracking-tight">
                StyleRun
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-4 md:gap-6">
              {user && (
                <Link
                  href="/looks"
                  className={`text-xs md:text-sm font-medium transition-colors py-2 px-1 ${
                    pathname === '/looks'
                      ? 'text-neutral-900'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  My Looks
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
                Get Styled
              </Link>
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="text-xs md:text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors py-2 px-1"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="text-xs md:text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors py-2 px-1 uppercase tracking-wide"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Sign in to StyleRun"
        message="Save your looks, refine recommendations, and access your style profile"
      />
    </>
  );
}

