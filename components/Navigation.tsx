'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import AuthModal from './AuthModal';
import { Sparkles, Shirt } from 'lucide-react';

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
            {/* Logo with Icon */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 to-neutral-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10">
                  <Shirt className="w-5 h-5 md:w-6 md:h-6 text-neutral-900 group-hover:scale-110 transition-transform duration-300" />
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-neutral-400 absolute -top-1 -right-1 group-hover:text-neutral-600 transition-colors duration-300" />
                </div>
              </div>
              <span className="text-xl md:text-2xl font-serif font-bold tracking-tight group-hover:text-neutral-700 transition-colors">
                StyleRun
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-4 md:gap-6">
              {user && (
                <Link
                  href="/looks"
                  className={`text-xs md:text-sm font-medium transition-all py-2 px-3 rounded-md relative group ${
                    pathname === '/looks'
                      ? 'text-neutral-900 bg-neutral-50'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/50'
                  }`}
                >
                  <span className="relative z-10">My Looks</span>
                  {pathname === '/looks' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-neutral-100 to-transparent rounded-md opacity-50" />
                  )}
                </Link>
              )}
              <Link
                href="/quiz"
                className={`text-xs md:text-sm font-medium transition-all py-2 px-3 rounded-md relative group ${
                  pathname === '/quiz'
                    ? 'text-neutral-900 bg-neutral-50'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/50'
                }`}
              >
                <span className="relative z-10">Get Styled</span>
                {pathname === '/quiz' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-neutral-100 to-transparent rounded-md opacity-50" />
                )}
              </Link>
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="text-xs md:text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-all py-2 px-3 rounded-md hover:bg-neutral-50/50"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="text-xs md:text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-all py-2 px-3 rounded-md hover:bg-neutral-50/50 uppercase tracking-wide"
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

