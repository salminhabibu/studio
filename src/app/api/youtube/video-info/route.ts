// src/app/api/youtube/video-info/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoURL = searchParams.get('url');

  if (!videoURL) {
    console.warn('[api/youtube/video-info] YouTube URL is required but not provided.');
    return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
  }

  if (!ytdl.validateURL(videoURL)) {
    console.warn(`[api/youtube/video-info] Invalid YouTube URL received: ${videoURL}`);
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    console.log(`[api/youtube/video-info] Attempting to fetch info for URL: ${videoURL}`);
    const info = await ytdl.getInfo(videoURL);
    console.log(`[api/youtube/video-info] Successfully fetched info for: ${info.videoDetails.title}`);

    const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio')
      .filter(f => f.qualityLabel && f.hasVideo && f.hasAudio && f.container && f.itag) 
      .map(f => ({
        quality: f.qualityLabel, // This is the display string like "720p"
        itag: f.itag,
        mimeType: f.mimeType,
        container: f.container,
        fps: f.fps,
      })).sort((a, b) => {
        const aRes = parseInt(a.quality);
        const bRes = parseInt(b.quality);
        if (aRes !== bRes) return bRes - aRes; // Higher resolution first
        return (b.fps || 0) - (a.fps || 0); // Higher FPS first for same resolution
      });

    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly')
      .filter(f => f.audioBitrate && f.hasAudio && !f.hasVideo && f.container && f.itag)
      .map(f => ({
        quality: `${f.audioBitrate}kbps`, // Display string like "128kbps"
        itag: f.itag,
        mimeType: f.mimeType,
        container: f.container,
        audioBitrate: f.audioBitrate,
      })).sort((a,b) => (b.audioBitrate || 0) - (a.audioBitrate || 0)); // Higher bitrate first

    if (videoFormats.length === 0 && audioFormats.length === 0) {
      console.warn(`[api/youtube/video-info] No suitable video or audio formats found after filtering for ${videoURL}`);
    } else {
      console.log(`[api/youtube/video-info] Found ${videoFormats.length} video formats and ${audioFormats.length} audio formats for ${videoURL}`);
    }
    
    const authorName = info.videoDetails.author?.name || info.videoDetails.ownerChannelName || 'Unknown Author';
    const thumbnailUrl = info.videoDetails.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || '';


    return NextResponse.json({
      title: info.videoDetails.title,
      thumbnail: thumbnailUrl,
      duration: info.videoDetails.lengthSeconds,
      author: authorName,
      videoFormats,
      audioFormats,
    });

  } catch (err) {
    console.error(`[api/youtube/video-info] Critical error fetching video info for URL ${videoURL}:`, err);
    let detailedError = 'Failed to fetch video information due to an unknown error.';
    if (err instanceof Error) {
        detailedError = err.message;
    } else if (typeof err === 'object' && err !== null && 'message' in err) {
        detailedError = String((err as {message: string}).message);
    } else if (typeof err === 'string') {
        detailedError = err;
    }
    
    // Specific check for common ytdl-core errors
    if (detailedError.includes("private") || detailedError.includes("unavailable")) {
        detailedError = "This video is private or unavailable.";
    } else if (detailedError.includes("Status code: 410")) {
        detailedError = "This video is no longer available (may have been deleted or restricted).";
    } else if (detailedError.toLowerCase().includes("could not extract functions")) {
        detailedError = "Could not process this video. It might be age-restricted, region-locked, require login, or YouTube's site structure may have changed. Please try a different video.";
    }
    
    return NextResponse.json({ error: `ytdl-core error: ${detailedError}` }, { status: 500 });
  }
}
