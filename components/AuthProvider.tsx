'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { track } from '@vercel/analytics';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const hasTrackedAuth = useRef(false);
  const previousUser = useRef<User | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      previousUser.current = currentUser;
      setLoading(false);
      
      // Check if auth just completed (via cookie set by callback route)
      if (typeof window !== 'undefined' && currentUser) {
        const authJustCompleted = document.cookie.includes('auth_just_completed=true');
        if (authJustCompleted && !hasTrackedAuth.current) {
          // Get redirect path from localStorage
          const redirectPath = localStorage.getItem('auth_redirect_path');
          const haulId = redirectPath?.includes('haul?id=') 
            ? new URLSearchParams(redirectPath.split('?')[1] || '').get('id') 
            : null;
          
          // Track successful authentication
          track('auth_success', {
            method: session?.user?.app_metadata?.provider || 'email',
            redirectPath: redirectPath || '/',
            haulId: haulId || undefined,
          });
          
          hasTrackedAuth.current = true;
          
          // Clear the cookie
          document.cookie = 'auth_just_completed=; path=/; max-age=0';
          
          // If we're not already on the redirect path and it's different, redirect
          if (redirectPath && redirectPath !== window.location.pathname + window.location.search) {
            // Small delay to ensure state is updated
            setTimeout(() => {
              window.location.href = redirectPath;
            }, 100);
          } else {
            // Clear stored redirect path if we're already on it
            localStorage.removeItem('auth_redirect_path');
          }
        }
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      
      // Track auth success when user transitions from null to authenticated
      if (
        typeof window !== 'undefined' &&
        !previousUser.current &&
        currentUser &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
      ) {
        const redirectPath = localStorage.getItem('auth_redirect_path');
        const haulId = redirectPath?.includes('haul?id=') 
          ? new URLSearchParams(redirectPath.split('?')[1] || '').get('id') 
          : null;
        
        if (!hasTrackedAuth.current) {
          track('auth_success', {
            method: session?.user?.app_metadata?.provider || 'email',
            redirectPath: redirectPath || '/',
            haulId: haulId || undefined,
          });
          hasTrackedAuth.current = true;
          
          // Clear stored redirect path after tracking
          if (redirectPath && typeof window !== 'undefined') {
            localStorage.removeItem('auth_redirect_path');
          }
        }
      }
      
      setUser(currentUser);
      previousUser.current = currentUser;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    hasTrackedAuth.current = false;
    previousUser.current = null;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
