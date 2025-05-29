// src/app/api/torrents/find/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import TorrentSearchApi, { type Torrent } from 'torrent-search-api'; // Import Torrent type

// Enable providers
TorrentSearchApi.enableProvider('1337x');
TorrentSearchApi.enableProvider('ThePirateBay');
TorrentSearchApi.enableProvider('Yts');
TorrentSearchApi.enableProvider('Eztv');
TorrentSearchApi.enableProvider('Limetorrents');

const MIN_SEEDERS = 3; // Minimum seeders to consider a torrent valid
const MAX_RESULTS = 10; // Max number of results to return to the client
const SEARCH_RESULT_LIMIT = 20; // Number of results to fetch from the API

// Helper function to infer quality (copied from tv/route.ts and adapted)
function inferQualityFromTitle(title?: string): string {
  if (!title) return "Unknown";
  title = title.toLowerCase(); // Normalize to lowercase for matching
  if (title.includes('1080p')) return "1080p";
  if (title.includes('720p')) return "720p";
  if (title.match(/2160p|4k|uhd/i)) return "2160p";
  if (title.match(/bdrip|blu-ray|bluray/i)) return "BluRay";
  if (title.match(/web-dl|webdl|webrip|web/i)) return "WEBDL"; // Added "web"
  if (title.match(/hdtv|hdrip/i)) return "HDTV";
  if (title.match(/dvdrip|dvd/i)) return "DVD";
  if (title.match(/cam|camrip/i)) return "CAM";
  if (title.match(/ts|telesync/i)) return "TS";
  // Add more rules if needed
  return "Unknown";
}

/**
 * Interface for the request parameters to find torrents.
 */
export interface TorrentFindRequestParams {
  query?: string; // General search query (e.g., movie title, series title)
  tmdbId?: string; // The Movie Database ID
  imdbId?: string; // IMDb ID
  type: 'movie' | 'tv'; // To distinguish between movie and TV series searches
  season?: number; // For TV series, the season number
  episode?: number; // For TV series, the episode number
}

// Zod schema for request validation
const TorrentFindRequestSchema = z.object({
  query: z.string().optional(),
  tmdbId: z.string().optional(),
  imdbId: z.string().optional(),
  type: z.enum(['movie', 'tv']),
  season: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
}).refine(data => data.query || data.tmdbId || data.imdbId, {
  message: "Either 'query', 'tmdbId', or 'imdbId' must be provided.",
  path: ["query"], // Path to associate the error with, can be any of the fields
});

/**
 * Interface for a single torrent result item.
 */
export interface TorrentFindResultItem {
  magnetLink: string; // The magnet URI
  torrentQuality: string; // e.g., "1080p", "720p", "HDRip"
  source: string; // The name or URL of the torrent site
  fileName?: string; // Torrent file name
  size?: string; // Torrent size (e.g., "1.2 GB")
  seeds?: number; // Number of seeders
  peers?: number; // Number of peers
  detailsUrl?: string; // URL to the torrent details page on the source site
}

/**
 * Interface for the API response.
 */
export interface TorrentFindResponse {
  results: TorrentFindResultItem[];
  error?: string; // Error message if the search fails
}

// Define an extended interface for torrents to include optional seeds and peers
interface ExtendedTorrent extends Torrent { // Torrent type is imported from 'torrent-search-api'
  seeds?: number;
  peers?: number;
  // Other properties from the Torrent type like title, magnet, provider, size, desc are implicitly included
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = TorrentFindRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        results: [],
        error: "Invalid request parameters: " + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      }, { status: 400 });
    }

    const params: TorrentFindRequestParams = validationResult.data;
    let searchQuery: string | undefined;
    let category: 'Movies' | 'TV' | 'All' = 'All'; // Default to 'All', will be refined

    if (params.type === 'movie') {
      searchQuery = params.imdbId || params.query; // Prioritize IMDb ID for query
      if (!searchQuery) {
        return NextResponse.json({ results: [], error: "A query or IMDb ID is required for movie torrent search." }, { status: 400 });
      }
      category = 'Movies';
    } else if (params.type === 'tv') {
      if (!params.query) {
        return NextResponse.json({ results: [], error: "A query is required for TV series torrent search." }, { status: 400 });
      }
      if (params.season && params.episode) {
        searchQuery = `${params.query} S${String(params.season).padStart(2, '0')}E${String(params.episode).padStart(2, '0')}`;
      } else if (params.season) {
        searchQuery = `${params.query} Season ${params.season}`; // Or S${String(params.season).padStart(2, '0')}
        // Consider adding variations like "Complete Season" or allowing TorrentSearchApi to handle broader query
      } else {
        searchQuery = params.query;
      }
      category = 'TV';
    } else {
      // Should not happen due to Zod schema, but as a fallback
      return NextResponse.json({ results: [], error: "Unsupported search type specified." }, { status: 400 });
    }

    if (!searchQuery) { // Should be caught by specific type checks, but as a safeguard
        return NextResponse.json({ results: [], error: "Search query could not be determined." }, { status: 400 });
    }
    
    try {
      const rawResults = await TorrentSearchApi.search(searchQuery, category, SEARCH_RESULT_LIMIT);

      if (rawResults && rawResults.length > 0) {
        const processedTorrents: TorrentFindResultItem[] = rawResults
          .filter(torrentRaw => {
            const torrent = torrentRaw as ExtendedTorrent; // Cast to access potential seeds/peers
            return torrent.magnet && torrent.title && torrent.seeds && torrent.seeds >= MIN_SEEDERS;
          })
          .map(torrentRaw => {
            const torrent = torrentRaw as ExtendedTorrent; // Cast to access potential seeds/peers
            return {
              magnetLink: torrent.magnet!,
              torrentQuality: inferQualityFromTitle(torrent.title),
              source: torrent.provider!,
              fileName: torrent.title!,
              size: torrent.size,
              seeds: torrent.seeds,
              peers: torrent.peers,
              // Ensure desc is a string and looks like a URL. Some providers might not give a valid URL.
              detailsUrl: (typeof torrent.desc === 'string' && torrent.desc.startsWith('http')) ? torrent.desc : undefined,
            };
          })
          .sort((a, b) => (b.seeds ?? 0) - (a.seeds ?? 0)); // Assumes seeds is part of TorrentFindResultItem

        const finalResults = processedTorrents.slice(0, MAX_RESULTS);
        return NextResponse.json({ results: finalResults }, { status: 200 });

      } else {
        return NextResponse.json({ results: [], error: 'No torrents found matching your criteria.' }, { status: 404 });
      }
    } catch (err) {
      console.error(`[TORRENT_FIND_API_SEARCH_ERROR] for query "${searchQuery}":`, err);
      const message = err instanceof Error ? err.message : "An unknown error occurred during torrent search.";
      return NextResponse.json({ results: [], error: `Error searching torrents: ${message}` }, { status: 500 });
    }

  } catch (error) {
    console.error("[TORRENT_FIND_API_GENERAL_ERROR]", error);
    let errorMessage = "An unexpected error occurred in the API.";
    // Broader error check for JSON parsing, if it's a SyntaxError and seems related to JSON
    if (error instanceof SyntaxError && error.message.toLowerCase().includes("json")) {
        errorMessage = "Invalid JSON payload provided to the API. Please check the request body.";
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return NextResponse.json({
      results: [],
      error: errorMessage,
    }, { status: 500 });
  }
}
