import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

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
    const { haulId, products, queries, profile } = body;

    if (!haulId || !products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate share token for anonymous drops
    const shareToken = randomBytes(16).toString('hex');

    const { data, error } = await supabase
      .from('drops')
      .insert({
        user_id: user.id,
        haul_id: haulId,
        products,
        queries: queries || [],
        profile: profile || null,
        is_anonymous: false,
        share_token: shareToken,
      })
      .select()
      .single();

    if (error) {
      // If duplicate, update instead
      if (error.code === '23505') {
        const { data: updated, error: updateError } = await supabase
          .from('drops')
          .update({
            products,
            queries: queries || [],
            profile: profile || null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('haul_id', haulId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return NextResponse.json({ success: true, drop: updated });
      }
      throw error;
    }

    return NextResponse.json({ success: true, drop: data });
  } catch (error) {
    console.error('Error saving drop:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save drop' },
      { status: 500 }
    );
  }
}
