// src/app/api/youtube/download-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoURL = searchParams.get('url');
  const itag = searchParams.get('itag');
  const title = searchParams.get('title') || 'youtube_video';

  console.log(`[api/youtube/download-video] Request received. URL: ${videoURL}, itag: ${itag}, title: ${title}`);

  if (!videoURL || !itag) {
    console.warn('[api/youtube/download-video] Missing URL or itag.');
    return NextResponse.json({ error: 'URL and itag are required' }, { status: 400 });
  }

  if (!ytdl.validateURL(videoURL)) {
    console.warn(`[api/youtube/download-video] Invalid YouTube URL: ${videoURL}`);
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    console.log(`[api/youtube/download-video] Fetching info to confirm format for itag ${itag}`);
    const info = await ytdl.getInfo(videoURL);
    const format = info.formats.find(f => f.itag.toString() === itag);
    
    if (!format) {
        console.warn(`[api/youtube/download-video] Requested format (itag ${itag}) not found for URL: ${videoURL}`);
        return NextResponse.json({ error: 'Requested video format not found.' }, { status: 404 });
    }
    
    const container = format.container || 'mp4';
    const cleanTitle = title.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_');
    const filename = `${cleanTitle}.${container}`;
    console.log(`[api/youtube/download-video] Determined filename: ${filename}, container: ${container}, mimeType: ${format.mimeType}`);

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', format.mimeType || 'video/mp4');
    
    console.log(`[api/youtube/download-video] Starting download stream for itag ${itag}`);
    const stream = ytdl(videoURL, { 
        filter: f => f.itag.toString() === itag,
    });

    const webReadableStream = new ReadableStream({
        start(controller) {
            console.log('[api/youtube/download-video] Stream: start');
            stream.on('data', (chunk) => {
                controller.enqueue(chunk);
            });
            stream.on('end', () => {
                console.log('[api/youtube/download-video] Stream: end');
                controller.close();
            });
            stream.on('error', (err) => {
                console.error('[api/youtube/download-video] Stream: error', err);
                controller.error(err);
            });
        },
        cancel() {
            console.log('[api/youtube/download-video] Stream: cancel');
            stream.destroy();
        }
    });

    return new NextResponse(webReadableStream, { headers });

  } catch (err) {
    console.error(`[api/youtube/download-video] Error during download process for URL ${videoURL}, itag ${itag}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to download video';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
