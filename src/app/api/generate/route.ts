import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { extractVideoId, isValidYoutubeUrl, getVideoInfo, isVideoTooLong } from '@/lib/youtube';
import { generateSeoBlog } from '@/lib/ai';

const FREE_CREDITS = parseInt(process.env.FREE_CREDITS || '2');

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl } = await request.json();
    console.log('=== Generate Request ===');
    console.log('YouTube URL:', youtubeUrl);

    if (!isValidYoutubeUrl(youtubeUrl)) {
      console.log('❌ Invalid YouTube URL');
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const videoId = extractVideoId(youtubeUrl);
    console.log('Extracted Video ID:', videoId);
    if (!videoId) {
      console.log('❌ Could not extract video ID');
      return NextResponse.json({ error: 'Could not extract video ID' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    console.log('Session:', session?.user?.email || 'No session');
    let userCredits = FREE_CREDITS;
    let userEmail = null;

    if (session?.user?.email) {
      userEmail = session.user.email;
      const { data } = await supabase
        .from('profiles')
        .select('credits')
        .eq('email', userEmail)
        .single();

      if (data && typeof data.credits === 'number') {
        userCredits = data.credits;
      }
    }

    if (userCredits <= 0) {
      console.log('❌ Insufficient credits:', userCredits);
      return NextResponse.json({ 
        error: 'Insufficient credits. Please purchase more credits.' 
      }, { status: 403 });
    }

    console.log('⏳ Fetching video info for:', videoId);
    const videoInfo = await getVideoInfo(videoId);
    console.log('✅ Video info fetched:', videoInfo.title);

    if (isVideoTooLong(videoInfo.duration, 240)) {
      return NextResponse.json({ 
        error: 'Video is too long. Please use videos under 240 minutes.' 
      }, { status: 400 });
    }

    const captions = `Video: ${videoInfo.title}\n\n${videoInfo.description}`;

    const result = await generateSeoBlog({
      videoTitle: videoInfo.title,
      videoDescription: videoInfo.description,
      captions: captions,
      language: 'en',
    });

    if (userEmail) {
      await supabase
        .from('profiles')
        .update({ credits: userCredits - 1 })
        .eq('email', userEmail);

      await supabase
        .from('usage_history')
        .insert({
          user_email: userEmail,
          title: result.title,
          source: 'YouTube',
          youtube_url: youtubeUrl,
          video_title: videoInfo.title,
        });
    }

    return NextResponse.json({
      title: result.title,
      content: result.content,
      seoData: result.seoData,
      videoTitle: videoInfo.title,
      youtubeUrl,
      publishedAt: videoInfo.publishedAt,
      remainingCredits: Math.max(0, userCredits - 1),
    });

  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate blog' 
    }, { status: 500 });
  }
}