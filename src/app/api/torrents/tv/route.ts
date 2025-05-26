// src/app/api/torrents/tv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TorrentSearchApi from 'torrent-search-api';

// Ensure providers are enabled (as in existing file)
TorrentSearchApi.enableProvider('1337x');
TorrentSearchApi.enableProvider('ThePirateBay');
// TorrentSearchApi.enableProvider('TorrentGalaxy');

export interface TVEpisodeTorrentResultItem {
  magnetLink: string;
  title: string; // Torrent title from provider
  torrentQuality: string; // Inferred quality
  seeds?: number;
  peers?: number;
  size?: string;
  provider?: string;
  // detailsUrl?: string; // If available from TorrentSearchApi result
}

// Helper function to infer quality (can be moved to a shared util if used elsewhere)
function inferQualityFromTitle(title: string): string {
  if (!title) return "Unknown";
  title = title.toLowerCase(); // Normalize to lowercase for matching
  if (title.includes('1080p')) return "1080p";
  if (title.includes('720p')) return "720p";
  if (title.match(/2160p|4k|uhd/i)) return "2160p"; // Added uhd
  if (title.match(/bdrip|blu-ray|bluray/i)) return "BluRay";
  if (title.match(/web-dl|webdl|webrip|web/i)) return "WEBDL";
  if (title.match(/hdtv|hdrip/i)) return "HDTV";
  if (title.match(/dvdrip|dvd/i)) return "DVD";
  // Add more rules if needed
  return "Unknown";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!title || !season || !episode) {
    console.warn('[API /torrents/tv] Missing required query parameters:', { title, season, episode });
    return NextResponse.json({ results: [], error: 'Missing required query parameters: title, season, episode' }, { status: 400 });
  }

  const query = `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
  console.log(`[API /torrents/tv] Searching for torrent: "${query}"`);

  try {
    const rawResults = await TorrentSearchApi.search(query, 'All', 20); // Increased limit to get more options
    console.log(`[API /torrents/tv] Found ${rawResults.length} raw results for "${query}".`);

    if (rawResults && rawResults.length > 0) {
      const processedTorrents: TVEpisodeTorrentResultItem[] = rawResults
        .filter(torrent => torrent.magnet && torrent.title && torrent.seeds && torrent.seeds > 0)
        .map(torrent => ({
          magnetLink: torrent.magnet!,
          title: torrent.title!,
          torrentQuality: inferQualityFromTitle(torrent.title!),
          seeds: torrent.seeds,
          peers: torrent.peers,
          size: torrent.size,
          provider: torrent.provider,
          // detailsUrl: torrent.desc // Example, if 'desc' contains a URL. Note: TorrentSearchApi `desc` is often a link to details page.
        }))
        .sort((a, b) => (b.seeds ?? 0) - (a.seeds ?? 0)); // Sort by seeders

      if (processedTorrents.length > 0) {
        console.log(`[API /torrents/tv] Processed ${processedTorrents.length} valid torrents for "${query}". Best one: ${processedTorrents[0].title}`);
        return NextResponse.json({ results: processedTorrents.slice(0, 5) }); // Return top 5 results
      } else {
        console.warn(`[API /torrents/tv] No valid torrents with magnet links and seeders found for: "${query}" after filtering.`);
        return NextResponse.json({ results: [], error: 'No suitable torrents found for the episode.' }, { status: 404 });
      }
    } else {
      console.warn(`[API /torrents/tv] No torrents returned by search API for: "${query}".`);
      return NextResponse.json({ results: [], error: 'No torrents found for the episode.' }, { status: 404 });
    }
  } catch (error) {
    console.error(`[API /torrents/tv] Error searching for torrents for query "${query}":`, error);
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    return NextResponse.json({ results: [], error: `Error searching for torrents: ${errorMessage}` }, { status: 500 });
  }
}
