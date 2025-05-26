// src/app/api/youtube/info/route.ts
import { NextRequest, NextResponse } from 'next/server';
import play from 'play-dl';
import { smartErrorMessages, SmartErrorMessagesOutput } from '@/ai/flows/smart-error-messages';

// Define interfaces for our response structure
interface VideoFormat {
  itag: number;
  qualityLabel: string | null; // e.g., "720p", "1080p" for video; "128kbps" for audio
  container: string | null; // e.g., "mp4", "webm", "m4a"
  fps?: number; // Frames per second, for video
  hasVideo: boolean;
  hasAudio: boolean;
  url?: string; // Direct download URL (optional, can be large and expire)
  contentLength?: string; // Content length in bytes as string
  bitrate?: number | null; // Total bitrate in kbps
  audioBitrate?: number | null; // Audio bitrate in kbps (especially for audio-only or audio track of muxed)
}

interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string | undefined; // URL of the highest quality thumbnail
  duration: number; // Duration in seconds
  author: {
    name: string; // Author's channel name
    url?: string; // URL to the author's channel
    channelID?: string; // Author's channel ID
  };
  formats: {
    video: VideoFormat[]; // Video formats (may include audio - muxed, or video-only)
    audio: VideoFormat[]; // Audio-only formats
  };
}

interface PlaylistVideoInfo { // Simplified info for videos within a playlist
  id: string;
  title: string;
  duration: number; // Duration in seconds
  authorName: string | undefined; // Name of the video's author/channel
}

interface PlaylistInfo {
  title: string | undefined; // Playlist title
  author: { // Playlist author/channel
    name: string | undefined;
    url?: string;
  };
  itemCount: number; // Total number of videos in the playlist
  videos: PlaylistVideoInfo[]; // Array of simplified video info objects
}

const COMMON_VIDEO_CONTAINERS = ['mp4', 'webm'];
const COMMON_AUDIO_CONTAINERS = ['m4a', 'opus', 'mp3']; // Added mp3 for broader compatibility

async function handleApiError(url: string, message: string, status: number): Promise<NextResponse> {
  try {
    const aiFeedback: SmartErrorMessagesOutput = await smartErrorMessages({ url });
    return NextResponse.json({ error: message, details: aiFeedback.feedback }, { status });
  } catch (aiError) {
    // console.error for smartErrorMessages removed as the fallback message is sufficient for server logs.
    // The user will see the main error message or "Error processing this URL."
    return NextResponse.json({ error: message, details: "Error processing this URL." }, { status });
  }
}

export async function POST(request: NextRequest) {
  let url: string;
  try {
    const body = await request.json();
    url = body.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required and must be a string.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  try {
    const validationResult = await play.validate(url);

    if (!validationResult) {
      return handleApiError(url, 'Invalid or unsupported YouTube URL.', 400);
    }

    if (validationResult === 'video') {
      const videoData = await play.video_info(url);
      if (!videoData || !videoData.video_details) {
        return handleApiError(url, 'Could not retrieve video information.', 404);
      }

      const details = videoData.video_details;
      const videoFormats: VideoFormat[] = [];
      const audioFormats: VideoFormat[] = [];

      videoData.format.forEach(fmt => {
        const container = fmt.mimeType?.split(';')[0].split('/')[1]?.toLowerCase();
        if (!container || !fmt.itag) return; // Essential info missing

        // Video formats (includes muxed video+audio and video-only)
        // play-dl provides `fmt.hasVideo` and `fmt.hasAudio`
        // We are interested in formats that are primarily video, identified by qualityLabel (e.g. "720p")
        if (fmt.hasVideo && fmt.qualityLabel && COMMON_VIDEO_CONTAINERS.includes(container)) {
            videoFormats.push({
              itag: fmt.itag,
              qualityLabel: fmt.qualityLabel, // e.g., "720p"
              container: container,
              fps: fmt.fps,
              hasVideo: true, // Explicitly true as per requirement
              hasAudio: !!fmt.hasAudio, // Use play-dl's determination if audio track exists
              url: fmt.url,
              contentLength: fmt.contentLength,
              bitrate: fmt.bitrate, // Overall bitrate
              audioBitrate: fmt.audioBitrate // Audio component bitrate, if present
            });
        }
        // Audio-only formats
        // These typically lack visual qualityLabel (like "720p") but have audioBitrate and no video track
        else if (fmt.hasAudio && !fmt.hasVideo && fmt.audioBitrate && COMMON_AUDIO_CONTAINERS.includes(container)) {
            audioFormats.push({
              itag: fmt.itag,
              qualityLabel: `${fmt.audioBitrate}kbps`, // e.g., "128kbps"
              container: container,
              hasVideo: false, // Explicitly false as per requirement
              hasAudio: true,  // Explicitly true
              url: fmt.url,
              contentLength: fmt.contentLength,
              audioBitrate: fmt.audioBitrate, // Specific audio bitrate
              bitrate: fmt.bitrate // This is often same as audioBitrate for audio-only
            });
        }
      });
      
      // Sort video formats: primarily by resolution (higher is better), secondarily by bitrate (higher is better)
      videoFormats.sort((a, b) => {
        const qualityA = parseInt(a.qualityLabel || "0"); // "720p" -> 720
        const qualityB = parseInt(b.qualityLabel || "0");
        if (qualityB !== qualityA) return qualityB - qualityA;
        return (b.bitrate || 0) - (a.bitrate || 0);
      });
      // Sort audio formats by audioBitrate (higher is better)
      audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

      const videoInfo: VideoInfo = {
        id: details.id!,
        title: details.title!,
        thumbnail: details.thumbnails?.sort((a,b) => b.width - a.width)[0]?.url, // Highest quality
        duration: details.durationInSec,
        author: {
          name: details.channel?.name || 'Unknown Author',
          url: details.channel?.url,
          channelID: details.channel?.id,
        },
        formats: {
          video: videoFormats,
          audio: audioFormats,
        },
      };
      return NextResponse.json({ type: 'video', videoInfo });

    } else if (validationResult === 'playlist') {
      // Fetch full playlist data, including all video entries.
      // { incomplete: false } is default, but being explicit for clarity.
      const playlistData = await play.playlist_info(url, { incomplete: false }); 
      if (!playlistData) {
        return handleApiError(url, 'Could not retrieve playlist information.', 404);
      }
      
      // `all_videos()` fetches details for each video in the playlist.
      const allVideosInPlaylist = await playlistData.all_videos();

      const playlistInfo: PlaylistInfo = {
        title: playlistData.title,
        author: { // Playlist author/channel
            name: playlistData.channel?.name,
            url: playlistData.channel?.url,
        },
        // Use total_videos from playlistData or length of allVideosInPlaylist for consistency
        itemCount: playlistData.total_videos || allVideosInPlaylist.length, 
        videos: allVideosInPlaylist.map(video => ({ // Simplified info for each video
          id: video.id!,
          title: video.title!,
          duration: video.durationInSec,
          authorName: video.channel?.name, // Author of the individual video
        })),
      };
      return NextResponse.json({ type: 'playlist', playlistInfo });

    } else {
      // This case should ideally be caught by play.validate() returning null earlier
      // but as a fallback:
      return handleApiError(url, 'Unsupported YouTube URL type.', 400);
    }

  } catch (error: any) {
    console.error(`Error processing URL ${url}:`, error);
    const errorMessage = (error.message || "").toLowerCase();

    if (errorMessage.includes("unavailable") || 
        errorMessage.includes("private") || 
        errorMessage.includes("deleted") ||
        errorMessage.includes("age restricted") || // Common restriction
        errorMessage.includes("geo restricted") || // Common restriction
        errorMessage.includes("requires purchase") || // For rentals/purchases
        errorMessage.includes("members only")) { // For member-only content
        return handleApiError(url, 'Video or playlist is unavailable (e.g., private, deleted, age/geo restricted, or requires login/purchase).', 404);
    }
    // play-dl might throw errors with messages like "Could not find ..." for invalid IDs or malformed URLs
    if (errorMessage.includes("could not find") || 
        errorMessage.includes("invalid url") ||
        errorMessage.includes("no result") || // Common for bad searches/IDs
        validationResult === null) { // Explicitly check if validation failed at the start
        return handleApiError(url, 'Invalid or non-existent YouTube URL.', 400);
    }
    // Generic fallback after specific checks
    return handleApiError(url, 'Failed to retrieve information from YouTube due to an unexpected error.', 500);
  }
}
