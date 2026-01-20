import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { loadHaulsFromDatabase } from '@/lib/supabase/hauls';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sessionId = id;

    // Load all hauls and find the one matching the session ID
    const hauls = await loadHaulsFromDatabase(supabase, user.id);
    const haul = hauls.find((h: any) => h.id === sessionId);

    if (!haul) {
      return NextResponse.json({ error: 'Haul not found' }, { status: 404 });
    }

    return NextResponse.json({ haul });
  } catch (error) {
    console.error('Error fetching haul:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch haul' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sessionId = id;

    // Delete the styling session (cascade will delete related outfits, items, etc.)
    const { error } = await supabase
      .from('styling_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting haul:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete haul' },
      { status: 500 }
    );
  }
}
