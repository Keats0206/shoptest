import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { loadHaulsFromDatabase } from '@/lib/supabase/hauls';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load hauls (styling sessions) using the new schema
    const hauls = await loadHaulsFromDatabase(supabase, user.id);

    // Transform to old format for backward compatibility
    const drops = hauls.map(haul => ({
      id: haul.id,
      haul_id: haul.haulId || haul.id,
      user_id: user.id,
      products: haul.products || [],
      outfitIdeas: haul.outfitIdeas || haul.outfits || [],
      outfits: haul.outfits || [],
      queries: [],
      profile: haul.quizData || null,
      is_anonymous: false,
      share_token: null, // Share tokens are on individual outfits now
      created_at: haul.createdAt,
      updated_at: haul.createdAt,
    }));

    return NextResponse.json({ drops });
  } catch (error) {
    console.error('Error fetching drops:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch drops' },
      { status: 500 }
    );
  }
}
