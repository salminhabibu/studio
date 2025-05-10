// src/app/api/youtube/download-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoURL = searchParams.get('url');
  const itag = searchParams.get('itag'); // itag is now preferred for specific audio quality
  const title = searchParams.get('title') || 'youtube_audio';

  if (!videoURL) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }
   if (!itag) {
    return NextResponse.json({ error: 'itag for audio format is required' }, { status: 400 });
  }

  if (!ytdl.validateURL(videoURL)) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(videoURL);
    const format = info.formats.find(f => f.itag.toString() === itag && f.hasAudio && !f.hasVideo);
    
    if (!format) {
        return NextResponse.json({ error: 'Requested audio format not found or invalid.' }, { status: 404 });
    }

    const container = format.container || 'mp3'; // Default to mp3 if not specified by format
    const cleanTitle = title.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_');
    const filename = `${cleanTitle}.${container}`;
    
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', format.mimeType || 'audio/mpeg');
    
    const stream = ytdl(videoURL, { 
        filter: f => f.itag.toString() === itag 
    });
    
    const webReadableStream = new ReadableStream({
        start(controller) {
            stream.on('data', (chunk) => {
                controller.enqueue(chunk);
            });
            stream.on('end', () => {
                controller.close();
            });
            stream.on('error', (err) => {
                controller.error(err);
            });
        },
        cancel() {
            stream.destroy();
        }
    });

    return new NextResponse(webReadableStream, { headers });

  } catch (err) {
    console.error('Error downloading audio:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to download audio';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
