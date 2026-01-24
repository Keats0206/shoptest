'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthProvider';
import { track } from '@vercel/analytics';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  message?: string;
  trigger?: string; // Track what triggered auth
  haulId?: string; // For tracking context
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Sign in to continue',
  message = 'Sign in to save and refine your looks',
  trigger,
  haulId,
}: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const supabase = createClient();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Store redirect path when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const currentPath = pathname + (window.location.search || '');
      localStorage.setItem('auth_redirect_path', currentPath);
    }
  }, [isOpen, pathname]);

  // Close if user is already authenticated
  useEffect(() => {
    if (user && isOpen) {
      // Track successful auth
      track('auth_success', {
        trigger: trigger || 'navigation',
        haulId,
        method: 'already_authenticated',
      });
      
      onSuccess?.();
      onClose();
    }
  }, [user, isOpen, onSuccess, onClose, trigger, haulId]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const redirectPath = typeof window !== 'undefined' 
        ? localStorage.getItem('auth_redirect_path') || pathname 
        : pathname;
      
      // Use NEXT_PUBLIC_SITE_URL if set, otherwise fall back to window.location.origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
        },
      });

      if (error) throw error;

      // Track email auth initiated
      track('auth_initiated', {
        method: 'email',
        trigger: trigger || 'navigation',
        haulId,
      });

      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white p-8 max-w-md w-full mx-4 border-2 border-neutral-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium uppercase tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-neutral-600 mb-6 uppercase tracking-wide">{message}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {magicLinkSent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✉️</div>
            <h3 className="text-lg font-medium mb-2 uppercase tracking-wide">Check your email</h3>
            <p className="text-sm text-neutral-600 mb-4">
              We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
            </p>
            <button
              onClick={() => {
                setMagicLinkSent(false);
                setEmail('');
              }}
              className="text-sm text-neutral-600 hover:text-neutral-900 underline uppercase tracking-wide"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs text-neutral-600 mb-2 uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-neutral-300 focus:border-black focus:outline-none"
                placeholder="you@example.com"
                disabled={loading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full px-4 py-3 bg-black text-white hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm uppercase tracking-wide"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-neutral-500 text-center uppercase tracking-wide">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
