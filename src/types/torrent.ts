// src/types/torrent.ts

/**
 * Represents an individual torrent search result item.
 * This type should ideally be shareable or kept in sync with the backend
 * definition in `/api/torrents/find/route.ts`.
 */
export interface TorrentFindResultItem {
  fileName: string;
  fileSize?: number; // Size in bytes
  size: string; // Human-readable size, e.g., "1.2 GB"
  seeds: number | null;
  peers?: number | null;
  torrentQuality: string | null; // e.g., "1080p", "720p", "BRRip"
  source: string; // The name of the torrent provider/indexer
  url: string; // URL to the torrent file or magnet link page
  magnetLink: string;
  // Optional fields from some providers
  quality?: string; // Can be redundant with torrentQuality but sometimes present
  type?: string; // e.g. "movie", "tv" - useful if results are mixed
  language?: string; // e.g. "English"
  resolution?: string; // e.g. "1080p"
  infoHash?: string;
  provider?: string; // Can be redundant with source
}

/**
 * Represents an individual torrent search result item for a TV episode.
 * This type is used by the /api/torrents/tv route and consumed by the frontend.
 */
export interface TVEpisodeTorrentResultItem {
  magnetLink: string;
  title: string; // Torrent title from provider
  torrentQuality: string; // Inferred quality
  seeds?: number;
  peers?: number;
  size?: string;
  provider?: string;
  // detailsUrl?: string; // Optional: if available from TorrentSearchApi result (e.g. torrent.desc)
}
