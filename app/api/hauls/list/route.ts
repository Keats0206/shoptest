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

    const hauls = await loadHaulsFromDatabase(supabase, user.id);

    return NextResponse.json({ hauls });
  } catch (error) {
    console.error('Error fetching hauls:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch hauls' },
      { status: 500 }
    );
  }
}
