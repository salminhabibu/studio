// src/app/api/youtube/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import play, { type YouTubeVideo } from 'play-dl'; // Removed FormatInfo
import downloadManager from '@/services/downloadManager'; // Import downloadManager
import type { DownloadTaskCreationData } from '@/types/download'; // For type safety

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
    let videoDataTyped: any; // Use any for videoDataTyped initially
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      videoDataTyped = await play.video_info(youtubeUrl) as any; // TODO: Revisit play-dl types
      // play.video_info throws an error if video not found or other issues occur,
      // so a !videoDataTyped check is usually redundant if the call completes without throwing.
    } catch (err: any) {
      console.error(`Play-DL: Failed to fetch video info for ${videoId}. Error: ${err.message}`, err);
      const errMsg = err.message?.toLowerCase() || "";
      if (errMsg.includes('unavailable') || errMsg.includes('private') || errMsg.includes('deleted') || errMsg.includes('geo restricted')) {
        return NextResponse.json({ error: `Video ${videoId} is unavailable (private, deleted, restricted, etc.).` }, { status: 404 });
      }
      return NextResponse.json({ error: `Failed to retrieve video information for ${videoId}. Please check the video ID and try again.` }, { status: 500 });
    }

    // Ensure videoDataTyped is treated as YouTubeVideo which should have .formats
    // The 'formats' property should exist on the YouTubeVideo type from play-dl
    const format = (videoDataTyped as any).formats?.find((f: any) => f.itag === itag); // TODO: Revisit play-dl types for formats

    if (!format || !format.url) {
      return NextResponse.json({ error: `Requested format (itag ${itag}) for video ${videoId} is not available or does not have a direct download URL.` }, { status: 404 });
    }
    const downloadUrl = format.url;
    const qualityLabel = format.qualityLabel || format.audioBitrate?.toString()+"kbps" || "Unknown";

    // 3. Use DownloadManager to add the task
    try {
      const taskData: DownloadTaskCreationData = {
        title: title, // Use the original title passed from client, downloadManager will sanitize for path
        type: 'youtube',
        source: downloadUrl,
        metadata: {
          youtubeVideoId: videoId,
          originalTitle: title, // Keep original title for display if needed
          itag: itag,
          selectedQualityLabel: qualityLabel, // Store the quality label
          fileName: fileName, // downloadManager will use this for the 'out' option
        },
        // destinationPath is not set, downloadManager will handle it.
      };

      const newTask = await downloadManager.addTask(taskData);

      if (newTask && newTask.id) {
        // Consistent response with /api/aria2/add
        return NextResponse.json({ 
          taskId: newTask.id, 
          status: newTask.status, 
          message: 'YouTube download successfully added to queue via DownloadManager.' 
        }, { status: 201 });
      } else {
        console.error(`DownloadManager failed to create task for YouTube video ${videoId}, itag ${itag}.`);
        return NextResponse.json({ error: 'Failed to create download task via DownloadManager.' }, { status: 500 });
      }

    } catch (err: any) {
      console.error(`Error adding YouTube download via DownloadManager for video ${videoId} (itag ${itag}). URL: ${downloadUrl}. Error: ${err.message}`, err);
      const errorMessage = err.message || 'An unknown error occurred with the download manager.';
      return NextResponse.json({ error: `Download manager operation failed: ${errorMessage}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`Unexpected error processing download request: ${error.message}`, error); // Removed videoId and itag from log
    if (error instanceof SyntaxError) { // JSON parsing error
        return NextResponse.json({ error: 'Invalid JSON payload. Please ensure the request body is correctly formatted.' }, { status: 400 });
    }
    // Generic catch-all for truly unexpected errors
    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}
