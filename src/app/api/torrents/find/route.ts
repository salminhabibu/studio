// src/app/api/torrents/find/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import fetch from 'node-fetch'; // For making HTTP requests
import cheerio from 'cheerio'; // For parsing HTML

const NYAA_BASE_URL = process.env.NYAA_BASE_URL || 'https://nyaa.si';

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

    if (params.type === 'movie') {
      const searchQuery = params.imdbId || params.query;
      if (!searchQuery) {
        return NextResponse.json({ results: [], error: "A query or IMDb ID is required for movie torrent search." }, { status: 400 });
      }

      try {
        // Nyaa.si uses category c=1_2 for English-translated Live Action, c=1_4 for Raw Live Action.
        // c=1_0 is "Live Action (All)". Using this for broader movie search.
        const nyaaSearchUrl = `${NYAA_BASE_URL}/?f=0&c=1_0&q=${encodeURIComponent(searchQuery)}&s=seeders&o=desc`;
        const response = await fetch(nyaaSearchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) {
          console.error(`Nyaa.si request failed: ${response.status} ${response.statusText}`);
          return NextResponse.json({ results: [], error: `Failed to fetch data from Nyaa.si: ${response.statusText}` }, { status: response.status });
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const torrents: TorrentFindResultItem[] = [];

        $('table.torrent-list tbody tr').each((index, element) => {
          if (torrents.length >= 10) return false; // Limit to 10 results

          const $row = $(element);
          // Skip rows that are for comments or other non-torrent data if any
          if ($row.find('td[colspan="2"] a').length === 0) return;


          const titleAnchor = $row.find('td[colspan="2"] a:not(.comments)');
          let fileName = titleAnchor.attr('title');
          if (!fileName) {
             fileName = titleAnchor.text().trim();
          }
          
          const detailsUrlPath = titleAnchor.attr('href');
          const detailsUrl = detailsUrlPath ? `${NYAA_BASE_URL}${detailsUrlPath}` : undefined;

          const magnetLink = $row.find('td.text-center a[href^="magnet:?"]').attr('href');
          const size = $row.find('td.text-center').eq(1).text().trim(); // Size is usually in the 2nd text-center td
          const seeds = parseInt($row.find('td.text-center').eq(3).text().trim(), 10); // Seeds
          const peers = parseInt($row.find('td.text-center').eq(4).text().trim(), 10); // Leechers (Peers)
          
          // Infer quality from title
          let torrentQuality = "Unknown";
          if (fileName) {
            if (fileName.match(/1080p/i)) torrentQuality = "1080p";
            else if (fileName.match(/720p/i)) torrentQuality = "720p";
            else if (fileName.match(/2160p|4k/i)) torrentQuality = "2160p";
            else if (fileName.match(/bdrip|blu-ray|bluray/i)) torrentQuality = "BluRay";
            else if (fileName.match(/dvdrip/i)) torrentQuality = "DVDRip";
            else if (fileName.match(/web-dl|webdl|webrip/i)) torrentQuality = "WEBDL";
            else if (fileName.match(/hdrip/i)) torrentQuality = "HDRip";
            else if (fileName.match(/cam|camrip/i)) torrentQuality = "CAM";
            else if (fileName.match(/ts|telesync/i)) torrentQuality = "TS";
          }

          // Basic filter: ensure magnet link and filename are present
          if (magnetLink && fileName) {
            torrents.push({
              magnetLink,
              torrentQuality,
              source: "Nyaa.si",
              fileName,
              size,
              seeds: isNaN(seeds) ? 0 : seeds,
              peers: isNaN(peers) ? 0 : peers,
              detailsUrl
            });
          }
        });
        
        // Nyaa searches by seeders desc by default with &s=seeders&o=desc
        // If not, sort here: torrents.sort((a, b) => (b.seeds ?? 0) - (a.seeds ?? 0));

        return NextResponse.json({ results: torrents }, { status: 200 });

      } catch (err) {
        console.error("[NYAA_SCRAPE_ERROR]", err);
        const message = err instanceof Error ? err.message : "An unknown error occurred during Nyaa.si scraping.";
        return NextResponse.json({ results: [], error: `Error scraping Nyaa.si: ${message}` }, { status: 500 });
      }
    } else if (params.type === 'tv') {
      let tvSearchQuery = params.query;
      if (!tvSearchQuery) {
        return NextResponse.json({ results: [], error: "A query is required for TV series torrent search." }, { status: 400 });
      }
      if (params.season) {
        // Pad season number: S01, S02 etc.
        const seasonString = `S${params.season.toString().padStart(2, '0')}`;
        // Try common season pack terms
        tvSearchQuery = `${tvSearchQuery} ${seasonString}`; // More specific, e.g., "Series Title S02"
      }
      // If no season specified, search for "Series Title Season" or "Series Title Batch" to try and get season packs
      // This is a heuristic and might need refinement.
      // else {
      //    tvSearchQuery = `${tvSearchQuery} Season OR Batch`;
      // }


      try {
        // Nyaa.si category 1_0 (Live Action - All) is used.
        // Consider 1_2 (Eng-translated) or 1_3 (Non-Eng) if more specific results are needed.
        // For TV, sorting by seeders is crucial.
        const nyaaSearchUrl = `${NYAA_BASE_URL}/?f=0&c=1_0&q=${encodeURIComponent(tvSearchQuery)}&s=seeders&o=desc`;
        const response = await fetch(nyaaSearchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) {
          console.error(`Nyaa.si request failed for TV: ${response.status} ${response.statusText}`);
          return NextResponse.json({ results: [], error: `Failed to fetch TV data from Nyaa.si: ${response.statusText}` }, { status: response.status });
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        let torrents: TorrentFindResultItem[] = [];

        $('table.torrent-list tbody tr').each((index, element) => {
          const $row = $(element);
          if ($row.find('td[colspan="2"] a').length === 0) return; // Skip comment rows

          const titleAnchor = $row.find('td[colspan="2"] a:not(.comments)');
          let fileName = titleAnchor.attr('title') || titleAnchor.text().trim();
          
          const detailsUrlPath = titleAnchor.attr('href');
          const detailsUrl = detailsUrlPath ? `${NYAA_BASE_URL}${detailsUrlPath}` : undefined;
          const magnetLink = $row.find('td.text-center a[href^="magnet:?"]').attr('href');
          const size = $row.find('td.text-center').eq(1).text().trim();
          const seeds = parseInt($row.find('td.text-center').eq(3).text().trim(), 10);
          const peers = parseInt($row.find('td.text-center').eq(4).text().trim(), 10);

          if (!magnetLink || !fileName) return; // Skip if essential data is missing

          // Infer quality
          let torrentQuality = "Unknown";
          if (fileName.match(/1080p/i)) torrentQuality = "1080p";
          else if (fileName.match(/720p/i)) torrentQuality = "720p";
          else if (fileName.match(/2160p|4k/i)) torrentQuality = "2160p";
          else if (fileName.match(/bdrip|blu-ray|bluray/i)) torrentQuality = "BluRay";
          else if (fileName.match(/web-dl|webdl|webrip/i)) torrentQuality = "WEBDL";
          else if (fileName.match(/hdtv|hdrip/i)) torrentQuality = "HDTV"; // HDTV is common for TV

          // Season specific filtering and identification
          let matchesRequestedSeason = !params.season; // If no season requested, all are initially considered matching
          
          // Try to extract season from filename, e.g., S01, Season 1
          const seasonMatch = fileName.match(/S(\d{1,2})|Season\s*(\d{1,2})/i);
          const fileSeason = seasonMatch ? (parseInt(seasonMatch[1] || seasonMatch[2], 10)) : null;

          if (params.season) {
            if (fileSeason === params.season) {
              matchesRequestedSeason = true;
            } else if (fileName.toLowerCase().includes(`season ${params.season}`) || fileName.toLowerCase().includes(`s${params.season.toString().padStart(2, '0')}`)) {
              // Check for explicit "Season X" or "S0X" in title if regex fails
              matchesRequestedSeason = true;
            } else {
              matchesRequestedSeason = false;
            }
          }
          
          // Heuristic to prefer season packs: look for "batch", "complete", "season", "S01-S0X" etc.
          // This is basic and might need more sophisticated logic.
          const isLikelySeasonPack = /batch|complete|season|S\d{2}(?:-S?\d{2})?/i.test(fileName) || (fileSeason && !fileName.match(/E\d{2,3}|EP\d{2,3}/i));


          if (matchesRequestedSeason) {
            torrents.push({
              magnetLink,
              torrentQuality: fileSeason ? `${torrentQuality} S${fileSeason.toString().padStart(2, '0')}` : torrentQuality,
              source: "Nyaa.si",
              fileName,
              size,
              seeds: isNaN(seeds) ? 0 : seeds,
              peers: isNaN(peers) ? 0 : peers,
              detailsUrl,
              isLikelySeasonPack: !!isLikelySeasonPack, // Add this for potential sorting/filtering later
              fileSeason: fileSeason // Store detected season for sorting
            });
          }
        });

        // Prioritize likely season packs if a specific season was requested
        if (params.season) {
            torrents.sort((a: any, b: any) => {
                // Prioritize items marked as likely season packs
                if (a.isLikelySeasonPack && !b.isLikelySeasonPack) return -1;
                if (!a.isLikelySeasonPack && b.isLikelySeasonPack) return 1;
                // Then sort by seeds (already done by Nyaa query, but good for stability)
                return (b.seeds ?? 0) - (a.seeds ?? 0);
            });
        }
        // If no specific season was requested, all are considered, Nyaa sorts by seeders.
        // We might still want to prefer season packs in general if no season specified.
        else {
             torrents.sort((a: any, b: any) => {
                if (a.isLikelySeasonPack && !b.isLikelySeasonPack) return -1;
                if (!a.isLikelySeasonPack && b.isLikelySeasonPack) return 1;
                return (b.seeds ?? 0) - (a.seeds ?? 0);
            });
        }


        return NextResponse.json({ results: torrents.slice(0, 5).map(t => { delete (t as any).isLikelySeasonPack; delete (t as any).fileSeason; return t; }) }, { status: 200 });

      } catch (err) {
        console.error("[NYAA_SCRAPE_TV_ERROR]", err);
        const message = err instanceof Error ? err.message : "An unknown error occurred during Nyaa.si TV scraping.";
        return NextResponse.json({ results: [], error: `Error scraping Nyaa.si for TV: ${message}` }, { status: 500 });
      }
    }

    // Fallback for other types or if logic doesn't hit movie/tv type specifically
    return NextResponse.json({ results: [], error: "Unsupported search type or parameters." }, { status: 400 });

  } catch (error) {
    console.error("[TORRENT_FIND_API_ERROR_GENERAL]", error);
    let errorMessage = "An unexpected error occurred in the API.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    if (error instanceof SyntaxError && 'bodyText' in error && typeof error.bodyText === 'string' && error.message.includes("JSON")) {
        errorMessage = "Invalid JSON payload provided to the API.";
    }
    
    return NextResponse.json({
      results: [],
      error: errorMessage,
    }, { status: 500 });
  }
}
