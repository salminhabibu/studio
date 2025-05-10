
import { NextRequest, NextResponse } from 'next/server';
import TorrentSearchApi from 'torrent-search-api';

// Enable torrent providers
TorrentSearchApi.enableProvider('1337x');
TorrentSearchApi.enableProvider('ThePirateBay');
// TorrentSearchApi.enableProvider('TorrentGalaxy'); // Consider adding more if needed and if reliable

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!title || !season || !episode) {
    console.warn('[API /torrents/tv] Missing required query parameters:', { title, season, episode });
    return NextResponse.json({ error: 'Missing required query parameters: title, season, episode' }, { status: 400 });
  }

  const query = `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
  console.log(`[API /torrents/tv] Searching for torrent: "${query}"`);

  try {
    // Search 'All' categories and get more results to pick the best one
    const results = await TorrentSearchApi.search(query, 'All', 10); // Category 'All', limit 10
    console.log(`[API /torrents/tv] Found ${results.length} raw results for "${query}". First 5:`, results.slice(0,5).map(r => ({ title: r.title, seeds: r.seeds, magnet: !!r.magnet, provider: r.provider })));

    if (results && results.length > 0) {
      // Filter out results without magnet links and sort by seeders (descending)
      const validResults = results
        .filter(torrent => torrent.magnet && torrent.seeds && torrent.seeds > 0) // Ensure magnet and some seeders
        .sort((a, b) => (b.seeds || 0) - (a.seeds || 0));

      if (validResults.length > 0) {
        const bestTorrent = validResults[0];
        console.log(`[API /torrents/tv] Best torrent selected for "${query}": ${bestTorrent.title} (Provider: ${bestTorrent.provider}, Seeders: ${bestTorrent.seeds})`);
        return NextResponse.json({ magnet: bestTorrent.magnet });
      } else {
        console.warn(`[API /torrents/tv] No valid torrents with magnet links and seeders found for: "${query}" after filtering.`);
        return NextResponse.json({ error: 'No suitable torrents found' }, { status: 404 });
      }
    } else {
      console.warn(`[API /torrents/tv] No torrents returned by search API for: "${query}".`);
      return NextResponse.json({ error: 'No torrents found' }, { status: 404 });
    }
  } catch (error) {
    console.error(`[API /torrents/tv] Error searching for torrents for query "${query}":`, error);
    // Check if error is an object and has a message property
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    return NextResponse.json({ error: `Error searching for torrents: ${errorMessage}` }, { status: 500 });
  }
}

