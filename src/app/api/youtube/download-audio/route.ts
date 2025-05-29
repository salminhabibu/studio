// src/app/api/youtube/download-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import play from 'play-dl';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, itag: requestedItag } = body; // itag might not be provided by client for audio

    if (!url) {
      return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    if (play.is_expired()) {
      await play.refreshToken();
    }

    const videoInfo = await play.video_info(url);
    if (!videoInfo) {
      return NextResponse.json({ error: 'Could not fetch audio info' }, { status: 500 });
    }
    
    let selectedFormat;

    if (requestedItag) {
      selectedFormat = videoInfo.format.find(format => format.itag === parseInt(requestedItag, 10) && format.type?.startsWith('audio/'));
    } else {
      // If no itag is provided, select the "best" audio format
      // Prefer opus or m4a (aac) with highest bitrate
      const audioFormats = videoInfo.format.filter(f => f.type?.startsWith('audio/') && f.itag && f.bitrate);
      if (audioFormats.length === 0) {
        return NextResponse.json({ error: 'No audio formats available' }, { status: 404 });
      }

      // Sort by bitrate (higher is better), prefer m4a/opus
      audioFormats.sort((a, b) => {
        const aIsPreferred = a.mime_type?.includes('mp4') || a.mime_type?.includes('webm'); // m4a is audio/mp4, opus is audio/webm
        const bIsPreferred = b.mime_type?.includes('mp4') || b.mime_type?.includes('webm');
        if (aIsPreferred && !bIsPreferred) return -1;
        if (!aIsPreferred && bIsPreferred) return 1;
        return (b.bitrate || 0) - (a.bitrate || 0);
      });
      selectedFormat = audioFormats[0];
    }

    if (!selectedFormat || !selectedFormat.url) {
      return NextResponse.json({ error: 'Selected audio format not available or direct URL missing' }, { status: 404 });
    }

    const stream = await play.stream_from_info(videoInfo, { format: selectedFormat });

    if (!stream || !stream.stream) {
         return NextResponse.json({ error: 'Failed to create stream for the selected audio format' }, { status: 500 });
    }

    const title = videoInfo.video_details.title || 'youtube_audio';
    const safeFilename = title.replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, '_');
    // Determine extension. Common audio is m4a (AAC) or webm (Opus). Frontend expects mp3, but true mp3 might not be available.
    // For simplicity, we'll use 'm4a' or the container type. Conversion to MP3 would require ffmpeg.
    let extension = selectedFormat.container || selectedFormat.mime_type?.split('/')[1]?.split(';')[0] || 'm4a';
    if (extension === 'mp4') extension = 'm4a'; // audio/mp4 is typically m4a

    const filename = `${safeFilename}.${extension}`;
    
    const webReadableStream = new ReadableStream({
      async start(controller) {
        stream.stream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        stream.stream.on('end', () => {
          controller.close();
        });
        stream.stream.on('error', (err) => {
          controller.error(err);
        });
      },
    });

    return new NextResponse(webReadableStream, {
      headers: {
        'Content-Type': selectedFormat.mime_type || 'audio/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('[API YouTube Download Audio] Error:', error);
    let errorMessage = 'An unknown error occurred during audio download.';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    if (errorMessage.includes("confirm your age")) {
        errorMessage = "Age-restricted video: Cannot download audio without authentication.";
    } else if (errorMessage.includes("private video")) {
        errorMessage = "Private video: Cannot be accessed.";
    } else if (errorMessage.includes("premiere") || errorMessage.includes("live stream")) {
        errorMessage = "Live streams or premieres are not supported for direct download.";
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
