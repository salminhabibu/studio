// src/app/api/youtube/download-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoURL = searchParams.get('url');
  const itag = searchParams.get('itag');
  const title = searchParams.get('title') || 'youtube_video';
  const downloadType = searchParams.get('type') as 'videoaudio' | 'videoonly' | 'audioonly' | null;


  console.log(`[api/youtube/download-video] Request. URL: ${videoURL}, itag: ${itag}, title: ${title}, type: ${downloadType}`);

  if (!videoURL || !itag) {
    return NextResponse.json({ error: 'URL and itag are required' }, { status: 400 });
  }
  if (!ytdl.validateURL(videoURL)) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(videoURL);
    let format = info.formats.find(f => f.itag.toString() === itag);
    
    if (!format) {
      return NextResponse.json({ error: 'Requested video format not found.' }, { status: 404 });
    }

    // Refine format based on downloadType if needed
    if (downloadType === 'videoonly' && format.hasAudio) {
        // Try to find a video-only format with the same quality if the selected one has audio
        const videoOnlyAlternative = info.formats.find(f => f.qualityLabel === format!.qualityLabel && f.hasVideo && !f.hasAudio);
        if (videoOnlyAlternative) format = videoOnlyAlternative;
        // If no direct alternative, we proceed with the user's itag choice but it might contain audio.
        // Client should ideally filter formats for video-only upfront.
    } else if (downloadType === 'videoaudio' && (!format.hasAudio || !format.hasVideo)) {
         // Try to find a video+audio format with similar quality if the selected one is not.
        const videoAudioAlternative = info.formats.find(f => f.qualityLabel === format!.qualityLabel && f.hasVideo && f.hasAudio);
        if (videoAudioAlternative) format = videoAudioAlternative;
    }


    const container = format.container || 'mp4';
    const cleanTitle = title.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_');
    const filename = `${cleanTitle}.${container}`;
    
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', format.mimeType || 'video/mp4');
    
    const stream = ytdl(videoURL, { 
        filter: f => f.itag.toString() === itag,
        // quality: format.itag // Already filtered by itag
    });

    const webReadableStream = new ReadableStream({
        start(controller) {
            stream.on('data', (chunk) => controller.enqueue(chunk));
            stream.on('end', () => controller.close());
            stream.on('error', (err) => controller.error(err));
        },
        cancel() { stream.destroy(); }
    });

    return new NextResponse(webReadableStream, { headers });

  } catch (err) {
    console.error(`[api/youtube/download-video] Error for URL ${videoURL}, itag ${itag}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to download video';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
