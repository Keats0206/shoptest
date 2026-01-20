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
    const { haulId, products, outfitIdeas, outfits, queries, profile, quiz } = body;

    // Better validation with detailed error messages
    if (!haulId) {
      console.error('Save drop failed: Missing haulId');
      return NextResponse.json({ error: 'Missing required field: haulId' }, { status: 400 });
    }

    // Prefer outfitIdeas over outfits (new format)
    const outfitsToSave = outfitIdeas || outfits;

    if (!outfitsToSave || !Array.isArray(outfitsToSave) || outfitsToSave.length === 0) {
      console.error('Save drop failed: Missing outfitIdeas', {
        hasProducts: !!products,
        hasOutfitIdeas: !!outfitIdeas,
        hasOutfits: !!outfits,
        outfitIdeasLength: outfitIdeas?.length,
        outfitsLength: outfits?.length,
      });
      return NextResponse.json({ 
        error: 'Missing required data: must provide outfitIdeas or outfits array' 
      }, { status: 400 });
    }

    // Log what we're trying to save (for debugging)
    console.log('Saving drop:', {
      haulId,
      userId: user.id,
      outfitIdeasCount: outfitsToSave.length,
    });

    // Use the new schema save function
    // Note: outfitIdeas should already be in the correct format from generate-haul route
    const quizData = profile || quiz || null;
    
    try {
      const result = await saveOutfitsToDatabase(
        supabase,
        user.id,
        outfitsToSave,
        quizData
      );

      console.log('Drop saved successfully:', { 
        haulId, 
        sessionId: result.sessionId,
        outfitCount: result.outfitIds.length 
      });

      // Return response in format compatible with old API
      return NextResponse.json({ 
        success: true, 
        drop: {
          id: result.sessionId,
          haul_id: haulId,
          sessionId: result.sessionId,
          outfitIds: result.outfitIds,
        }
      });
    } catch (saveError) {
      console.error('Error saving to database:', saveError);
      throw saveError;
    }
  } catch (error) {
    console.error('Error saving drop:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save drop',
        details: error instanceof Error && error.message ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
