import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: history, error } = await supabase
      .from('usage_history')
      .select('*')
      .eq('user_email', session.user.email)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching usage history:', error);
      return NextResponse.json({ history: [] });
    }

    return NextResponse.json({ 
      history: history || [],
    });
  } catch (error) {
    console.error('Credits history API error:', error);
    return NextResponse.json({ history: [] });
  }
}