// src/app/api/youtube/video-info/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

interface FormatDetail {
  quality: string;
  itag: number;
  mimeType?: string;
  container?: string;
  fps?: number;
  audioBitrate?: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
}

interface VideoInfoResponse {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  videoFormats: FormatDetail[];
  audioFormats: FormatDetail[];
}

interface PlaylistItemResponse extends VideoInfoResponse {}

interface PlaylistInfoResponse {
  title: string;
  author?: string;
  itemCount: number;
  items: PlaylistItemResponse[];
}


async function getVideoDetails(videoURL: string): Promise<VideoInfoResponse | { error: string }> {
  if (!ytdl.validateURL(videoURL)) {
    console.warn(`[api/youtube/video-info] Invalid YouTube URL for individual fetch: ${videoURL}`);
    return { error: 'Invalid YouTube video URL' };
  }
  try {
    const info = await ytdl.getInfo(videoURL);
    const videoId = info.videoDetails.videoId;

    const allFormats = info.formats.map(f => ({
        quality: f.qualityLabel || (f.audioBitrate ? `${f.audioBitrate}kbps` : 'Unknown'),
        itag: f.itag,
        mimeType: f.mimeType,
        container: f.container,
        fps: f.fps,
        audioBitrate: f.audioBitrate,
        hasAudio: !!f.hasAudio,
        hasVideo: !!f.hasVideo,
    }));
    
    const videoFormats = allFormats
        .filter(f => f.hasVideo)
        .sort((a,b) => (parseInt(b.quality) - parseInt(a.quality)) || (b.fps || 0) - (a.fps || 0));

    const audioFormats = allFormats
        .filter(f => f.hasAudio && !f.hasVideo) // Pure audio
        .sort((a,b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

    const authorName = info.videoDetails.author?.name || info.videoDetails.ownerChannelName || 'Unknown Author';
    const thumbnailUrl = info.videoDetails.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url || '';

    return {
      id: videoId,
      title: info.videoDetails.title,
      thumbnail: thumbnailUrl,
      duration: info.videoDetails.lengthSeconds,
      author: authorName,
      videoFormats,
      audioFormats,
    };
  } catch (err) {
    console.error(`[api/youtube/video-info] Error fetching single video info for URL ${videoURL}:`, err);
    let detailedError = err instanceof Error ? err.message : 'Failed to fetch video information';
    if (detailedError.includes("private") || detailedError.includes("unavailable")) detailedError = "This video is private or unavailable.";
    else if (detailedError.includes("Status code: 410")) detailedError = "This video is no longer available.";
    else if (detailedError.toLowerCase().includes("could not extract functions")) detailedError = "Could not process this video (age/region/login restricted or YouTube changed).";
    return { error: `ytdl-core error: ${detailedError}` };
  }
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoURL = searchParams.get('url');
  const playlistURL = searchParams.get('playlistUrl');

  if (playlistURL) {
    if (!ytdl.validateID(playlistURL) && !ytdl.validateURL(playlistURL)) { // ytdl.validateID can be used for playlist IDs from URL string
        try {
            const playlistIdFromUrl = new URL(playlistURL).searchParams.get('list');
            if (!playlistIdFromUrl || !ytdl.validateID(playlistIdFromUrl)) {
                 console.warn(`[api/youtube/video-info] Invalid YouTube playlist URL or ID: ${playlistURL}`);
                 return NextResponse.json({ error: 'Invalid YouTube playlist URL or ID' }, { status: 400 });
            }
        } catch {
            console.warn(`[api/youtube/video-info] Invalid YouTube playlist URL format: ${playlistURL}`);
            return NextResponse.json({ error: 'Invalid YouTube playlist URL format' }, { status: 400 });
        }
    }
    try {
      console.log(`[api/youtube/video-info] Attempting to fetch playlist info for URL: ${playlistURL}`);
      // Note: ytdl.getPlaylistInfo might be deprecated or less reliable.
      // The common approach is to extract video IDs and fetch info for each.
      // However, ytdl-core itself does not have a direct getPlaylistInfo.
      // This part would typically require a library like `youtube-dl-exec` or parsing the playlist page.
      // For simplicity with ytdl-core, we'll simulate this for a limited number of items if it were available or
      // instruct the user that playlist download means processing video by video.
      // For now, ytdl-core does not directly support playlist fetching in a simple call.
      // This API endpoint will return an error for playlists for now or a mock.
      // A more robust solution would involve youtube-dl or a similar tool.
      
      // Placeholder: In a real scenario, you'd iterate through playlist items.
      // This example will simulate fetching info for the first video if the playlist URL also contains a video ID.
      const { videoId: videoIdFromPlaylistUrl } = new URL(playlistURL).searchParams.get('v') ? { videoId: new URL(playlistURL).searchParams.get('v') } : {videoId: null};

      if (videoIdFromPlaylistUrl) {
           const firstVideoDetails = await getVideoDetails(`https://www.youtube.com/watch?v=${videoIdFromPlaylistUrl}`);
            if ('error' in firstVideoDetails) {
                return NextResponse.json(firstVideoDetails, { status: 500 });
            }
            // This is a mock playlist response based on the first video.
            const mockPlaylist: PlaylistInfoResponse = {
                title: `Playlist (Example: ${firstVideoDetails.title})`,
                author: firstVideoDetails.author,
                itemCount: 1, // Simulating one item for now
                items: [firstVideoDetails as PlaylistItemResponse]
            };
            console.warn(`[api/youtube/video-info] Playlist fetching is simplified. Returning info for the first video in playlist URL if available.`);
            //return NextResponse.json(mockPlaylist);
             // For now, let's return an error because full playlist fetching is complex with ytdl-core alone
            return NextResponse.json({ error: "Full playlist fetching is not supported with ytdl-core directly in this simplified API. Try a single video URL from the playlist." }, { status: 501 });
      }

      return NextResponse.json({ error: "Playlist URL detected, but could not extract a video to fetch. Full playlist info fetching is complex with ytdl-core alone." }, { status: 400 });

    } catch (err) {
      console.error(`[api/youtube/video-info] Error processing playlist URL ${playlistURL}:`, err);
      return NextResponse.json({ error: "Failed to process playlist URL." }, { status: 500 });
    }

  } else if (videoURL) {
    const videoDetails = await getVideoDetails(videoURL);
    if ('error' in videoDetails) {
        return NextResponse.json(videoDetails, { status: ('Invalid YouTube video URL'.includes(videoDetails.error)) ? 400 : 500 });
    }
    return NextResponse.json(videoDetails);
  } else {
    console.warn('[api/youtube/video-info] URL (video or playlist) is required.');
    return NextResponse.json({ error: 'YouTube video or playlist URL is required' }, { status: 400 });
  }
}
