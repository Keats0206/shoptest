import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { saveOutfitsToDatabase } from '@/lib/supabase/outfits';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { outfitIdeas, quiz } = body;

    if (!outfitIdeas || !Array.isArray(outfitIdeas) || outfitIdeas.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: outfitIdeas' }, { status: 400 });
    }

    const { sessionId, outfitIds } = await saveOutfitsToDatabase(
      supabase,
      user.id,
      outfitIdeas,
      quiz
    );

    return NextResponse.json({ success: true, sessionId, outfitIds });
  } catch (error) {
    console.error('Error saving haul:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save haul' },
      { status: 500 }
    );
  }
}
