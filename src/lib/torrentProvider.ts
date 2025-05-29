// src/lib/torrentProvider.ts
import TorrentSearchApi from 'torrent-search-api';

// Enable providers - you might want to make this configurable or enable more/different ones.
// Note: Using public providers directly might be subject to their availability and terms of use.
// Consider rate limiting or error handling for provider-specific issues.
try {
  TorrentSearchApi.enableProvider('ThePirateBay');
  TorrentSearchApi.enableProvider('1337x');
  // TorrentSearchApi.enablePublicProviders(); // Alternatively, enable all public ones
  console.log('[TorrentProvider] Enabled providers:', TorrentSearchApi.getEnabledProviders().map(p => p.name));
} catch (error) {
  console.error('[TorrentProvider] Error enabling providers:', error);
  // Fallback or further error handling might be needed if providers cannot be enabled.
}


/**
 * Finds a magnet link for TV series episodes or full seasons using torrent-search-api.
 *
 * @param seriesTitle The title of the TV series.
 * @param seasonNumber The season number.
 * @param episodeNumber Optional. The episode number. If undefined, a season pack is assumed.
 * @param quality Optional. Preferred quality (e.g., "1080p", "720p", "4K").
 * @returns A promise that resolves to a magnet link (string) or null if not found.
 */
export async function getTvSeriesMagnet(
  seriesTitle: string,
  seasonNumber: number,
  episodeNumber?: number,
  quality?: string // e.g., "720p", "1080p", "4K", "HD"
): Promise<string | null> {
  let searchQuery: string;
  const seasonString = `S${String(seasonNumber).padStart(2, '0')}`;

  if (episodeNumber) {
    // Search for a specific episode
    const episodeString = `E${String(episodeNumber).padStart(2, '0')}`;
    searchQuery = `${seriesTitle} ${seasonString}${episodeString}`;
  } else {
    // Search for a season pack
    // Common queries: "Series Title Season 1", "Series Title S01 Complete", "Series Title S01 Pack"
    // We'll try a couple of variations if the first doesn't yield results.
    searchQuery = `${seriesTitle} ${seasonString} Complete`; 
    // Alternative: `${seriesTitle} Season ${seasonNumber}`;
  }

  if (quality) {
    searchQuery += ` ${quality}`;
  }

  console.log(`[TorrentProvider] Searching for: "${searchQuery}"`);

  try {
    // Category 'TV' or 'Video' is often appropriate. Some APIs might also use 'Series' or 'Television'.
    // Let's try 'TV shows' or 'Video' as category, limit to 20 results to get a good selection.
    const torrents = await TorrentSearchApi.search(searchQuery, 'Video', 30); // Increased limit

    if (!torrents || torrents.length === 0) {
      if (!episodeNumber) { // If it was a season pack search, try a simpler query
        const simplerQuery = `${seriesTitle} Season ${seasonNumber}${quality ? ` ${quality}` : ''}`;
        console.log(`[TorrentProvider] No results for "${searchQuery}", trying simpler query: "${simplerQuery}"`);
        const simplerTorrents = await TorrentSearchApi.search(simplerQuery, 'Video', 20);
        if (simplerTorrents && simplerTorrents.length > 0) {
          return filterAndSelectTorrent(simplerTorrents, quality, !!episodeNumber);
        }
      }
      console.log(`[TorrentProvider] No torrents found for "${searchQuery}".`);
      return null;
    }

    return filterAndSelectTorrent(torrents, quality, !!episodeNumber);

  } catch (error: any) {
    console.error(`[TorrentProvider] Error searching for torrents for "${searchQuery}":`, error.message || error);
    // Check if the error is due to no active providers
    if (TorrentSearchApi.getActiveProviders().length === 0) {
        console.error("[TorrentProvider] No active torrent providers are enabled or working. Please check provider configuration and network access.");
    }
    return null;
  }
}

function filterAndSelectTorrent(
  torrents: TorrentSearchApi.Torrent[],
  quality?: string,
  isEpisodeSearch?: boolean
): string | null {
  
  let filteredTorrents = [...torrents];

  // 1. Filter by quality if specified (basic title check)
  if (quality) {
    const qualityLower = quality.toLowerCase();
    filteredTorrents = filteredTorrents.filter(torrent => 
      torrent.title.toLowerCase().includes(qualityLower)
    );
  }
  
  if (filteredTorrents.length === 0 && quality) {
    // If quality filter removed all results, try without it but log a warning
    console.warn(`[TorrentProvider] No torrents found matching quality "${quality}". Trying without quality filter.`);
    filteredTorrents = [...torrents]; // Reset to original list before quality filter
  }


  // 2. For episode searches, try to ensure the title contains the E## string if it was a specific episode search.
  //    This is a heuristic, as season packs might also contain E## in their file list but not title.
  //    The initial search query is more important for this.

  // 3. Prioritize by seeders (more seeders usually means faster and more reliable download)
  //    Also, give a slight preference to torrents with a decent number of leechers if seeders are comparable,
  //    as it indicates active interest.
  filteredTorrents.sort((a, b) => {
    const seedA = a.seeds || 0;
    const seedB = b.seeds || 0;
    const leechA = a.leechs || 0; // torrent-search-api uses 'leechs'
    const leechB = b.leechs || 0;

    if (seedA > seedB) return -1;
    if (seedB > seedA) return 1;
    
    // If seeders are equal, compare leechers
    if (leechA > leechB) return -1;
    if (leechB > leechA) return 1;
    
    return 0;
  });

  if (filteredTorrents.length === 0) {
    console.log('[TorrentProvider] No suitable torrents found after filtering.');
    return null;
  }

  const bestTorrent = filteredTorrents[0];

  // Additional check: if it's an episode search, and the best torrent title looks like a season pack,
  // try to find a more specific one if available. This is tricky without parsing file lists.
  // For now, we'll rely on the sort order and the initial query.
  // A very basic check:
  if (isEpisodeSearch && bestTorrent.title.match(/season|pack|complete/i) && filteredTorrents.length > 1) {
      const moreSpecific = filteredTorrents.find(t => !t.title.match(/season|pack|complete/i));
      if (moreSpecific) {
          console.log(`[TorrentProvider] Found a season pack for an episode search, but a more specific title exists: "${moreSpecific.title}"`);
          // This logic could be refined. For now, if a more specific one is found, we'll log, but still might return the one with most seeders.
          // To actually use it: return moreSpecific.magnet || null;
      }
  }


  if (bestTorrent && bestTorrent.magnet) {
    console.log(`[TorrentProvider] Selected torrent: "${bestTorrent.title}" (Seeds: ${bestTorrent.seeds}, Leechs: ${bestTorrent.leechs}, Size: ${bestTorrent.size})`);
    return bestTorrent.magnet;
  } else if (bestTorrent) {
    console.warn(`[TorrentProvider] Best torrent found ("${bestTorrent.title}") but it has no magnet link.`);
  }
  
  console.log('[TorrentProvider] No magnet link found for the best suitable torrent.');
  return null;
}

// Example usage (for testing purposes, can be removed)
/*
async function testGetMagnet() {
  console.log("Testing TV Series Magnet Search...");

  // Test 1: Specific episode with quality
  let magnet = await getTvSeriesMagnet("Loki", 1, 1, "1080p");
  console.log("Loki S01E01 1080p Magnet:", magnet ? "Found" : "Not Found", magnet ? "" : "");

  // Test 2: Season pack
  magnet = await getTvSeriesMagnet("The Mandalorian", 2, undefined, "1080p");
  console.log("The Mandalorian Season 2 1080p Magnet:", magnet ? "Found" : "Not Found", magnet ? "" : "");
  
  // Test 3: Specific episode without quality
  magnet = await getTvSeriesMagnet("Game of Thrones", 1, 1);
  console.log("Game of Thrones S01E01 Magnet:", magnet ? "Found" : "Not Found", magnet ? "" : "");

  // Test 4: Season pack without quality
  magnet = await getTvSeriesMagnet("Breaking Bad", 5);
  console.log("Breaking Bad Season 5 Magnet:", magnet ? "Found" : "Not Found", magnet ? "" : "");
  
  // Test 5: Non-existent show
  magnet = await getTvSeriesMagnet("NonExistentShowXYZ", 1, 1, "720p");
  console.log("NonExistentShowXYZ S01E01 720p Magnet:", magnet ? "Found" : "Not Found", magnet ? "" : "");
}

// Uncomment to run test when this file is executed directly (e.g. node src/lib/torrentProvider.js)
// if (require.main === module) {
//   testGetMagnet().catch(console.error);
// }
*/

[end of src/lib/torrentProvider.ts]
