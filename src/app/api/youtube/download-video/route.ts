// src/app/api/youtube/download-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import play from 'play-dl';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, itag } = body;

    if (!url || !itag) {
      return NextResponse.json({ error: 'Missing URL or itag' }, { status: 400 });
    }

    if (play.is_expired()) {
      await play.refreshToken();
    }

    const videoInfo = await play.video_info(url);
    if (!videoInfo) {
      return NextResponse.json({ error: 'Could not fetch video info' }, { status: 500 });
    }

    const selectedFormat = videoInfo.format.find(format => format.itag === parseInt(itag, 10));

    if (!selectedFormat || !selectedFormat.url) {
      return NextResponse.json({ error: 'Selected format not available or direct URL missing' }, { status: 404 });
    }

    // Use play.stream_from_info for potentially better handling if direct selectedFormat.url is problematic
    // However, if selectedFormat.url is already a direct stream URL from video_info, we can try fetching it.
    // For robust streaming, play.stream() or play.stream_from_info() is preferred.
    
    const stream = await play.stream_from_info(videoInfo, { format: selectedFormat });
    
    if (!stream || !stream.stream) {
         return NextResponse.json({ error: 'Failed to create stream for the selected format' }, { status: 500 });
    }

    const title = videoInfo.video_details.title || 'youtube_video';
    // Sanitize filename
    const safeFilename = title.replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, '_');
    const extension = selectedFormat.container || selectedFormat.mime_type?.split('/')[1]?.split(';')[0] || 'mp4';
    const filename = `${safeFilename}.${extension}`;

    // Transform Node.js Readable stream to Web ReadableStream
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
        'Content-Type': selectedFormat.mime_type || 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('[API YouTube Download Video] Error:', error);
    let errorMessage = 'An unknown error occurred during video download.';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    
    if (errorMessage.includes("confirm your age")) {
        errorMessage = "Age-restricted video: Cannot download without authentication.";
    } else if (errorMessage.includes("private video")) {
        errorMessage = "Private video: Cannot be accessed.";
    } else if (errorMessage.includes("premiere") || errorMessage.includes("live stream")) {
        errorMessage = "Live streams or premieres are not supported for direct download.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
