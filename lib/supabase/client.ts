import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Client-side: env vars are available via NEXT_PUBLIC_ prefix
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
