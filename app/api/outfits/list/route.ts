import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { loadOutfitsFromDatabase } from '@/lib/supabase/outfits';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outfits = await loadOutfitsFromDatabase(supabase, user.id);

    return NextResponse.json({ outfits });
  } catch (error) {
    console.error('Error fetching outfits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch outfits' },
      { status: 500 }
    );
  }
}
