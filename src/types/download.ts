// src/types/download.ts

// ConceptualAria2Task represents a task before it's added to Aria2.
// It's used to hold information needed to initiate a download with Aria2.
export interface ConceptualAria2Task {
  taskId: string; // This might be a preliminary ID, or Aria2 GID if already known.
  name: string; // Name of the download.
  quality: string; // Quality of the video (e.g., 1080p, 720p).
  addedTime: number; // Timestamp when the task was conceptualized.
  sourceUrlOrIdentifier: string; // Magnet link, IMDB ID, etc.
  type: 'magnet' | 'imdb_id' | 'tv_episode' | 'tv_season_pack' | 'tv_season_pack_all'; // Type of source.
  seriesTmdbId?: string; // Optional TMDB ID for series context
  seasonNumber?: number; // Optional season number
  episodeNumber?: number; // Optional episode number
}

// Aria2DownloadItemDisplay matches the structure returned by an Aria2 API (e.g., /api/aria2/status/[taskId])
// It includes fields specific to Aria2's representation of a download, plus some local fields.
// This type is useful when directly interacting with an Aria2 backend. Data from this type
// would typically be mapped to the more generic `DownloadTask` for use in the broader application.
export interface Aria2DownloadItemDisplay {
  taskId: string; // Aria2 GID.
  name: string; // Name of the download.
  status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed' | 'connecting'; // Aria2 status.
  progress: number; // Percentage (0-100).
  downloadSpeed: number; // Bytes/s.
  uploadSpeed: number; // Bytes/s.
  totalLength?: number; // Total size in bytes.
  completedLength?: number; // Downloaded size in bytes.
  connections?: number; // Number of active connections.
  downloadUrl?: string; // The primary URL for the download if applicable.
  errorCode?: string; // Aria2 error code.
  errorMessage?: string; // Aria2 error message.
  quality?: string; // Added from ConceptualAria2Task, for display consistency.
  addedTime?: number; // Added from ConceptualAria2Task, for display consistency.
}

// DownloadTask is the primary, generic interface for download tasks used by the DownloadManager service
// and DownloadContext. It abstracts away backend-specific details (like Aria2 GID).
export interface DownloadTask {
  id: string; // Unique identifier for the task (e.g., UUID).
  title: string; // Name of the download (e.g., movie title, episode name).
  type: 'movie' | 'tvEpisode' | 'tvSeason' | 'youtube'; // Type of content being downloaded.
  source: string; // URL, magnet link, or other identifier for the download source.
  progress: number; // Percentage from 0 to 100.
  status: 'queued' | 'initializing' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled'; // Current state of the download.
  destinationPath: string; // Local file system path where the download is stored.
  fileSize: number | null; // Total size of the download in bytes, null if unknown.
  downloadedSize: number; // Currently downloaded size in bytes.
  speed: number | null; // Download speed in bytes per second, null if not applicable or unknown.
  eta: number | null; // Estimated time remaining in seconds, null if not applicable or unknown.
  createdAt: Date; // Timestamp when the task was created.
  updatedAt: Date; // Timestamp when the task was last updated.
  error: string | null; // Error message if the download failed.
  metadata: Record<string, any>; // For additional information (e.g., tmdbId, imdbId, seasonNumber, episodeNumber, youtubeVideoId, selectedQuality).
}

// DownloadTaskCreationData is used for creating new download tasks.
// It omits fields that are typically set by the DownloadManager upon task creation or during its lifecycle.
export interface DownloadTaskCreationData {
  title: string;
  type: DownloadTask['type'];
  source: string;
  destinationPath?: string; // Optional: DownloadManager might have default logic to set this.
  metadata: Record<string, any>;
}
