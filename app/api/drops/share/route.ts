import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing share token' }, { status: 400 });
    }

    const supabase = await createClient();

    // Find drop by share_token
    const { data, error } = await supabase
      .from('drops')
      .select('*')
      .eq('share_token', token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Drop not found' }, { status: 404 });
    }

    // Return drop data (no user info)
    return NextResponse.json({
      drop: {
        id: data.id,
        haul_id: data.haul_id,
        products: data.products,
        queries: data.queries,
        created_at: data.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching shared drop:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch drop' },
      { status: 500 }
    );
  }
}
