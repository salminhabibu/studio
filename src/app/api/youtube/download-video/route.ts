// src/app/api/youtube/download-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoURL = searchParams.get('url');
  const itag = searchParams.get('itag');
  const title = searchParams.get('title') || 'youtube_video';

  if (!videoURL || !itag) {
    return NextResponse.json({ error: 'URL and itag are required' }, { status: 400 });
  }

  if (!ytdl.validateURL(videoURL)) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(videoURL);
    const format = info.formats.find(f => f.itag.toString() === itag);
    
    if (!format) {
        return NextResponse.json({ error: 'Requested format not found.' }, { status: 404 });
    }
    
    const container = format.container || 'mp4'; // Default to mp4 if not specified
    const cleanTitle = title.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_');
    const filename = `${cleanTitle}.${container}`;

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', format.mimeType || 'video/mp4');
    
    // ytdl returns a Node.js ReadableStream
    const stream = ytdl(videoURL, { 
        filter: f => f.itag.toString() === itag,
        // quality: 'highestvideo' // can be specified but filter by itag is more precise
    });

    // Convert Node.js Readable to Web ReadableStream for NextResponse
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
    console.error('Error downloading video:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to download video';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
