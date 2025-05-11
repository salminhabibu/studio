// src/app/api/youtube/download-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoURL = searchParams.get('url');
  const itag = searchParams.get('itag'); 
  const title = searchParams.get('title') || 'youtube_audio';
  const preferredAudioFormat = searchParams.get('audioFormat') as 'aac' | 'opus' | null;


  console.log(`[api/youtube/download-audio] Request. URL: ${videoURL}, itag: ${itag}, title: ${title}, preferredFormat: ${preferredAudioFormat}`);

  if (!videoURL || !itag) {
    return NextResponse.json({ error: 'URL and itag are required' }, { status: 400 });
  }
  if (!ytdl.validateURL(videoURL)) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(videoURL);
    // Find the specific format by ITAG first
    let format = info.formats.find(f => f.itag.toString() === itag && f.hasAudio && !f.hasVideo);
    
    if (!format) {
        // Fallback if specific itag wasn't pure audio, or try to respect preferredAudioFormat
        const audioOnlyFormats = info.formats.filter(f => f.hasAudio && !f.hasVideo);
        if (preferredAudioFormat === 'aac') {
            format = audioOnlyFormats.find(f => f.mimeType?.includes('mp4a')) || // M4A container usually means AAC
                     audioOnlyFormats.find(f => f.itag.toString() === itag); // fallback to original itag if it was audio
        } else if (preferredAudioFormat === 'opus') {
            format = audioOnlyFormats.find(f => f.mimeType?.includes('opus')) || // Opus in webm or ogg
                     audioOnlyFormats.find(f => f.itag.toString() === itag);
        }
        if (!format) format = audioOnlyFormats.sort((a,b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0]; // Best available if no match
    }
    
    if (!format) {
        return NextResponse.json({ error: 'Requested audio format not found or invalid.' }, { status: 404 });
    }

    // Determine file extension based on mimeType or container
    let container = format.container || 'm4a'; // Default to m4a for AAC
    if (format.mimeType?.includes('opus') || format.mimeType?.includes('webm')) {
        container = 'webm';
    } else if (format.mimeType?.includes('mp4a')) {
        container = 'm4a';
    } else if (format.mimeType?.includes('mpeg') && format.container === 'mp3') { // Check if it's actually mp3
        container = 'mp3';
    }
    // ytdl-core usually does not provide MP3 directly, mostly M4A (AAC) or WebM (Opus)

    const cleanTitle = title.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_');
    const filename = `${cleanTitle}.${container}`;
        
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', format.mimeType || 'audio/mpeg'); // Default MIME for safety
    
    const stream = ytdl(videoURL, { 
        filter: f => f.itag === format!.itag // Ensure we use the resolved format's itag
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
    console.error(`[api/youtube/download-audio] Error for URL ${videoURL}, itag ${itag}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to download audio';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
