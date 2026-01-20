import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const haulId = searchParams.get('haulId');

    if (!haulId) {
      return NextResponse.json({ error: 'Missing haulId' }, { status: 400 });
    }

    // In new schema, haulId is the session ID
    // Delete styling session (cascades to outfits, outfit_items, product_variants)
    const { error } = await supabase
      .from('styling_sessions')
      .delete()
      .eq('user_id', user.id)
      .eq('id', haulId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting drop:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete drop' },
      { status: 500 }
    );
  }
}
