import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ credits: 0 }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('email', session.user.email)
      .single();

    if (error || !data) {
      return NextResponse.json({ credits: 0 }, { status: 200 });
    }

    return NextResponse.json({ credits: data.credits });

  } catch (error) {
    console.error('Credits error:', error);
    return NextResponse.json({ credits: 0 }, { status: 200 });
  }
}
