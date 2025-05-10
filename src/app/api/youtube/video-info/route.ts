// src/app/api/youtube/video-info/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoURL = searchParams.get('url');

  if (!videoURL) {
    return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
  }

  if (!ytdl.validateURL(videoURL)) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(videoURL);

    const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    return NextResponse.json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails.pop()?.url || '',
      duration: info.videoDetails.lengthSeconds,
      author: info.videoDetails.author.name,
      videoFormats: videoFormats
        .filter(f => f.qualityLabel && f.hasVideo && f.hasAudio) // Ensure basic requirements
        .map(f => ({
          quality: f.qualityLabel,
          itag: f.itag,
          mimeType: f.mimeType,
          container: f.container,
          fps: f.fps,
          hasAudio: f.hasAudio,
          hasVideo: f.hasVideo,
        })).sort((a, b) => parseInt(b.quality || '0') - parseInt(a.quality || '0')), // Sort by quality descending
      audioFormats: audioFormats
        .filter(f => f.audioBitrate && f.hasAudio && !f.hasVideo)
        .map(f => ({
          quality: `${f.audioBitrate}kbps`,
          itag: f.itag,
          mimeType: f.mimeType,
          container: f.container,
          audioBitrate: f.audioBitrate,
        })).sort((a,b) => (b.audioBitrate || 0) - (a.audioBitrate || 0)), // Sort by bitrate descending
    });
  } catch (err) {
    console.error('Error fetching video info:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch video information';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
