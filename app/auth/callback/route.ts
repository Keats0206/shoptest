import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectParam = requestUrl.searchParams.get('redirect');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Get redirect path from query param, localStorage (via cookie), or default to home
  let redirectPath = '/';
  
  // Priority 1: Check redirect query parameter
  if (redirectParam) {
    try {
      const decodedPath = decodeURIComponent(redirectParam);
      // Validate it's a valid app route (not auth routes)
      if (decodedPath && !decodedPath.startsWith('/auth/')) {
        redirectPath = decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`;
      }
    } catch (e) {
      // Invalid redirect param, use default
    }
  }

  // Priority 2: Try to get from referer header
  if (redirectPath === '/') {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const path = refererUrl.pathname;
        // Only redirect to valid app routes (not auth routes)
        if (path && path !== '/auth/callback' && !path.startsWith('/auth/')) {
          redirectPath = path;
          // Preserve query params if they exist (like haul?id=...)
          if (refererUrl.search) {
            redirectPath += refererUrl.search;
          }
        }
      } catch (e) {
        // Invalid referer, use default
      }
    }
  }

  // URL to redirect to after sign in process completes
  const redirectUrl = `${origin}${redirectPath}`;
  const response = NextResponse.redirect(redirectUrl);
  
  // Set a cookie to trigger client-side auth success tracking
  response.cookies.set('auth_just_completed', 'true', {
    path: '/',
    maxAge: 5, // 5 seconds - just enough for client to detect
    httpOnly: false,
  });
  
  return response;
}
