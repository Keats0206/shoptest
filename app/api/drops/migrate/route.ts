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
    const { hauls } = body; // Array of haul data from localStorage

    if (!hauls || !Array.isArray(hauls)) {
      return NextResponse.json({ error: 'Invalid hauls data' }, { status: 400 });
    }

    const migratedDrops = [];

    for (const haul of hauls) {
      const { haulId, products, queries, profile } = haul;

      if (!haulId || !products || !Array.isArray(products)) {
        continue; // Skip invalid hauls
      }

      const shareToken = randomBytes(16).toString('hex');

      // Try to insert, or update if exists
      const { data, error } = await supabase
        .from('drops')
        .upsert(
          {
            user_id: user.id,
            haul_id: haulId,
            products,
            queries: queries || [],
            profile: profile || null,
            is_anonymous: false,
            share_token: shareToken,
          },
          {
            onConflict: 'user_id,haul_id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error(`Error migrating haul ${haulId}:`, error);
        continue;
      }

      migratedDrops.push(data);
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
