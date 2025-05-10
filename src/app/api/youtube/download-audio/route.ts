// src/app/api/youtube/download-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoURL = searchParams.get('url');
  const itag = searchParams.get('itag'); 
  const title = searchParams.get('title') || 'youtube_audio';

  console.log(`[api/youtube/download-audio] Request received. URL: ${videoURL}, itag: ${itag}, title: ${title}`);

  if (!videoURL) {
    console.warn('[api/youtube/download-audio] URL is required but not provided.');
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }
   if (!itag) {
    console.warn('[api/youtube/download-audio] itag for audio format is required but not provided.');
    return NextResponse.json({ error: 'itag for audio format is required' }, { status: 400 });
  }

  if (!ytdl.validateURL(videoURL)) {
    console.warn(`[api/youtube/download-audio] Invalid YouTube URL: ${videoURL}`);
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    console.log(`[api/youtube/download-audio] Fetching info to confirm format for itag ${itag}`);
    const info = await ytdl.getInfo(videoURL);
    const format = info.formats.find(f => f.itag.toString() === itag && f.hasAudio && !f.hasVideo);
    
    if (!format) {
        console.warn(`[api/youtube/download-audio] Requested audio format (itag ${itag}) not found or invalid for URL: ${videoURL}`);
        return NextResponse.json({ error: 'Requested audio format not found or invalid.' }, { status: 404 });
    }

    const container = format.container || 'mp3'; 
    const cleanTitle = title.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_');
    const filename = `${cleanTitle}.${container}`;
    console.log(`[api/youtube/download-audio] Determined filename: ${filename}, container: ${container}, mimeType: ${format.mimeType}`);
    
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', format.mimeType || 'audio/mpeg');
    
    console.log(`[api/youtube/download-audio] Starting download stream for itag ${itag}`);
    const stream = ytdl(videoURL, { 
        filter: f => f.itag.toString() === itag 
    });
    
    const webReadableStream = new ReadableStream({
        start(controller) {
            console.log('[api/youtube/download-audio] Stream: start');
            stream.on('data', (chunk) => {
                controller.enqueue(chunk);
            });
            stream.on('end', () => {
                console.log('[api/youtube/download-audio] Stream: end');
                controller.close();
            });
            stream.on('error', (err) => {
                console.error('[api/youtube/download-audio] Stream: error', err);
                controller.error(err);
            });
        },
        cancel() {
            console.log('[api/youtube/download-audio] Stream: cancel');
            stream.destroy();
        }
    });

    return new NextResponse(webReadableStream, { headers });

  } catch (err) {
    console.error(`[api/youtube/download-audio] Error during download process for URL ${videoURL}, itag ${itag}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to download audio';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
