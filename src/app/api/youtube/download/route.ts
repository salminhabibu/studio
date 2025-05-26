// src/app/api/youtube/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import play, { YouTubeVideo } from 'play-dl';
import aria2Client from '@/lib/aria2Client'; // Assuming this path is correct

interface DownloadRequestBody {
  videoId: string;
  itag: number;
  fileName: string;
  title: string; // Original video title for metadata/display or other uses
}

export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequestBody = await request.json();
    const { videoId, itag, fileName, title } = body;

    // 1. Validate Input
    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'videoId is required and must be a string.' }, { status: 400 });
    }
    if (!itag || typeof itag !== 'number') {
      return NextResponse.json({ error: 'itag is required and must be a number.' }, { status: 400 });
    }
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'fileName is required and must be a string.' }, { status: 400 });
    }
    if (!title || typeof title !== 'string') { // title is also important
      return NextResponse.json({ error: 'title is required and must be a string.' }, { status: 400 });
    }

    // 2. Get Downloadable Stream/URL
    let videoData: YouTubeVideo;
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      videoData = await play.video_info(youtubeUrl);
      // play.video_info throws an error if video not found or other issues occur,
      // so a !videoData check is usually redundant if the call completes without throwing.
    } catch (err: any) {
      console.error(`Play-DL: Failed to fetch video info for ${videoId}. Error: ${err.message}`, err);
      const errMsg = err.message?.toLowerCase() || "";
      if (errMsg.includes('unavailable') || errMsg.includes('private') || errMsg.includes('deleted') || errMsg.includes('geo restricted')) {
        return NextResponse.json({ error: `Video ${videoId} is unavailable (private, deleted, restricted, etc.).` }, { status: 404 });
      }
      return NextResponse.json({ error: `Failed to retrieve video information for ${videoId}. Please check the video ID and try again.` }, { status: 500 });
    }

    const format = videoData.format.find(f => f.itag === itag);

    if (!format || !format.url) {
      return NextResponse.json({ error: `Requested format (itag ${itag}) for video ${videoId} is not available or does not have a direct download URL.` }, { status: 404 });
    }
    const downloadUrl = format.url;

    // 3. Interface with Aria2
    try {
      const aria2Options = {
        out: fileName,
        // Additional metadata can be passed if aria2c is configured for it, e.g.
        // header: [`Cookie: ...`],
        // 'user-agent': '...',
        // Refer to Aria2c documentation for --header, --user-agent, etc.
        // and how they translate to RPC options if `aria2Client` supports generic options.
        // The `title` could be part of `out` or a specific metadata option if supported.
      };

      const gid = await aria2Client.addUri(downloadUrl, aria2Options);
      
      if (!gid) { // Should ideally not happen if addUri throws on failure or always returns GID.
        console.error(`Aria2 client returned no GID for ${videoId}, itag ${itag}. URL: ${downloadUrl}`);
        return NextResponse.json({ error: 'Failed to add download to Aria2 queue: No GID returned from Aria2.' }, { status: 500 });
      }
      
      // 4. Format Response (Success)
      return NextResponse.json({ message: 'Download successfully added to Aria2 queue.', taskId: gid });

    } catch (err: any) {
      console.error(`Aria2 client error while adding URI for video ${videoId} (itag ${itag}). URL: ${downloadUrl}. Error: ${err.message}`, err);
      // Check if the error message from aria2Client is useful or use a generic one
      const aria2ErrorMessage = err.message || 'An unknown error occurred with the download manager.';
      return NextResponse.json({ error: `Download manager operation failed: ${aria2ErrorMessage}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`Unexpected error processing download request for videoId ${videoId}, itag ${itag}: ${error.message}`, error);
    if (error instanceof SyntaxError) { // JSON parsing error
        return NextResponse.json({ error: 'Invalid JSON payload. Please ensure the request body is correctly formatted.' }, { status: 400 });
    }
    // Generic catch-all for truly unexpected errors
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
