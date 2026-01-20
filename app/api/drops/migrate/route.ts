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
    const { hauls } = body; // Array of haul data from localStorage

    if (!hauls || !Array.isArray(hauls)) {
      return NextResponse.json({ error: 'Invalid hauls data' }, { status: 400 });
    }

    const migratedDrops = [];

    for (const haul of hauls) {
      const { haulId, products, outfitIdeas, outfits, queries, profile, quiz } = haul;

      // Prefer outfitIdeas over outfits (new format)
      const outfitsToSave = outfitIdeas || outfits;

      // Skip if no valid outfit data
      if (!outfitsToSave || !Array.isArray(outfitsToSave) || outfitsToSave.length === 0) {
        console.warn(`Skipping haul ${haulId}: No outfitIdeas or outfits found`);
        continue;
      }

      try {
        // Use the new schema save function
        const quizData = profile || quiz || null;
        const result = await saveOutfitsToDatabase(
          supabase,
          user.id,
          outfitsToSave,
          quizData
        );

        migratedDrops.push({
          id: result.sessionId,
          haul_id: haulId,
          sessionId: result.sessionId,
          outfitIds: result.outfitIds,
        });
      } catch (error) {
        console.error(`Error migrating haul ${haulId}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      migrated: migratedDrops.length,
      drops: migratedDrops,
    });
  } catch (error) {
    console.error('Error migrating drops:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to migrate drops' },
      { status: 500 }
    );
  }
}
