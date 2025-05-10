\
import { NextRequest, NextResponse } from 'next/server';
import TorrentSearchApi from 'torrent-search-api';

// Enable torrent providers
TorrentSearchApi.enableProvider('1337x');
TorrentSearchApi.enableProvider('ThePirateBay');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!title || !season || !episode) {
    return NextResponse.json({ error: 'Missing required query parameters: title, season, episode' }, { status: 400 });
  }

  const query = `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
  console.log(`[LOG] Searching for torrent: ${query}`);

  try {
    const results = await TorrentSearchApi.search(query, 'TV', 1);
    const magnetLink = results?.[0]?.magnet;

    if (magnetLink) {
      console.log(`[LOG] Magnet found for: ${query}`);
      return NextResponse.json({ magnet: magnetLink });
    } else {
      console.warn(`[WARN] No torrents found for: ${query}`);
      return NextResponse.json({ error: 'No torrents found' }, { status: 404 });
    }
  } catch (error) {
    console.error(`[ERROR] Error searching for torrents: ${error}`);
    return NextResponse.json({ error: 'Error searching for torrents' }, { status: 500 });
  }
}
