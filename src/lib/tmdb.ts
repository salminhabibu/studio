// src/lib/tmdb.ts
import type { TMDBMovie, TMDBPaginatedResponse, TMDBBaseMovie, TMDBTVSeries, TMDBBaseTVSeries, TMDBTvSeasonDetails, TMDBMultiPaginatedResponse, TMDBVideoResponse } from '@/types/tmdb';

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

// YTS API specific type
interface YTSMovieTorrent {
  url: string;
  hash: string;
  quality: string;
  type: string;
  seeds: number;
  peers: number;
  size: string;
  size_bytes: number;
  date_uploaded: string;
  date_uploaded_unix: number;
}

interface YTSMovieDetail { // Renamed to avoid conflict with TMDBMovie
  id: number;
  imdb_code: string;
  title: string;
  year: number;
  torrents: YTSMovieTorrent[];
}

interface YTSResponseData {
  movie_count: number;
  limit: number;
  page_number: number;
  movies?: YTSMovieDetail[];
}

interface YTSResponse {
  status: string;
  status_message: string;
  data: YTSResponseData;
}

async function fetchTMDB<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  if (!API_KEY) {
    console.error('NEXT_PUBLIC_TMDB_API_KEY is not defined in environment variables. Please add it to your .env file.');
    throw new Error('NEXT_PUBLIC_TMDB_API_KEY is not configured.');
  }

  const queryParams: Record<string, string> = {
    api_key: API_KEY,
    language: 'en-US',
  };

  for (const key in params) {
    queryParams[key] = String(params[key]);
  }

  const urlParams = new URLSearchParams(queryParams);
  const url = `${BASE_URL}/${endpoint}?${urlParams.toString()}`;

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Revalidate data every hour
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ status_message: 'Unknown error structure' }));
      console.error(`TMDB API Error (${response.status}) for URL ${url}: ${errorData.status_message || response.statusText}`);
      throw new Error(`Failed to fetch from TMDB: ${errorData.status_message || response.statusText}`);
    }
    return response.json() as Promise<T>;
  } catch (error) {
    console.error(`Error fetching TMDB data from ${url}:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}

export async function getPopularMovies(page: number = 1): Promise<TMDBPaginatedResponse<TMDBBaseMovie>> {
  console.log('[TMDB Fetch] Popular Movies, Page:', page);
  return fetchTMDB<TMDBPaginatedResponse<TMDBBaseMovie>>('movie/popular', { page });
}

export async function getMovieDetails(movieId: number | string): Promise<TMDBMovie & { magnetLink?: string }> {
  console.log(`[TMDB Fetch] Movie Details for ID: ${movieId}`);
  const movieDetails = await fetchTMDB<TMDBMovie>(`movie/${movieId}`, { append_to_response: 'videos,external_ids' });

  if (movieDetails.imdb_id) {
    console.log(`[TMDB Details - YTS Search] Attempting YTS search for IMDB ID: ${movieDetails.imdb_id} for movie: ${movieDetails.title}`);
    try {
      const ytsQueryUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${movieDetails.imdb_id}&limit=1&sort_by=seeds`;
      console.log(`[TMDB Details - YTS Search] YTS Query URL: ${ytsQueryUrl}`);
      const ytsResponse = await fetch(ytsQueryUrl);
      
      if (!ytsResponse.ok) {
        console.warn(`[TMDB Details - YTS Search] YTS API request failed for ${movieDetails.imdb_id}. Status: ${ytsResponse.status} ${ytsResponse.statusText}`);
        try {
            const errorBody = await ytsResponse.json();
            console.warn(`[TMDB Details - YTS Search] YTS Error Body:`, errorBody);
        } catch (e) {
            console.warn(`[TMDB Details - YTS Search] Could not parse YTS error body.`);
        }
      } else {
        const ytsData: YTSResponse = await ytsResponse.json();
        console.log(`[TMDB Details - YTS Search] YTS API Response for ${movieDetails.imdb_id}: Status: ${ytsData.status}, Movies found: ${ytsData.data?.movie_count}`);

        if (ytsData.status === 'ok' && ytsData.data && ytsData.data.movies && ytsData.data.movies.length > 0) {
          const movie = ytsData.data.movies[0];
          console.log(`[TMDB Details - YTS Search] Found YTS movie: ${movie.title}, Torrents available: ${movie.torrents?.length}`);
          
          if (movie.torrents && movie.torrents.length > 0) {
            let bestTorrent = movie.torrents.find(t => t.quality === '1080p' && t.seeds > 0);
            if (!bestTorrent) {
              bestTorrent = movie.torrents.find(t => t.quality === '720p' && t.seeds > 0);
            }
            if (!bestTorrent) {
              // Fallback to highest seed count if specific qualities not found or have 0 seeds
              bestTorrent = movie.torrents.filter(t => t.seeds > 0).sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0];
            }
            // Ensure a torrent was actually found after filtering
            if (!bestTorrent && movie.torrents.length > 0) {
                bestTorrent = movie.torrents.sort((a,b) => (b.seeds || 0) - (a.seeds || 0))[0]; // last resort, pick any with most seeds even if 0
            }


            if (bestTorrent) {
              const trackers = [
                'udp://tracker.openbittorrent.com:80/announce',
                'udp://tracker.opentrackr.org:1337/announce',
                'udp://tracker.torrent.eu.org:451/announce',
                'udp://tracker.dler.org:6969/announce',
                'udp://open.stealth.si:80/announce',
                'udp://exodus.desync.com:6969/announce',
                'udp://tracker.tiny-vps.com:6969/announce',
                'udp://tracker.internetwarriors.net:1337/announce',
                'udp://tracker.cyberia.is:6969/announce',
                'udp://tracker.ololosh.space:6969/announce',
              ].map(tr => `&tr=${encodeURIComponent(tr)}`).join('');

              const magnet = `magnet:?xt=urn:btih:${bestTorrent.hash}&dn=${encodeURIComponent(movie.title)}${trackers}`;
              console.log(`[TMDB Details - YTS Search] Magnet found for ${movieDetails.title} (Quality: ${bestTorrent.quality}, Seeds: ${bestTorrent.seeds}, Type: ${bestTorrent.type})`);
              return { ...movieDetails, magnetLink: magnet };
            } else {
                 console.warn(`[TMDB Details - YTS Search] No suitable torrent (with seeds or matching quality) found in YTS movie torrents list for ${movieDetails.title}`);
            }
          } else {
             console.warn(`[TMDB Details - YTS Search] YTS movie found but no torrents listed for ${movieDetails.title}`);
          }
        } else {
          console.warn(`[TMDB Details - YTS Search] No movies found on YTS for IMDB ID: ${movieDetails.imdb_id} (Movie: ${movieDetails.title}). YTS Status: ${ytsData.status_message}`);
        }
      }
    } catch (error) {
      console.error(`[TMDB Details - YTS Search] Error fetching or processing data from YTS API for ${movieDetails.imdb_id}:`, error);
    }
  } else {
    console.warn(`[TMDB Details - YTS Search] No IMDB ID found for movie: "${movieDetails.title}". Cannot search YTS.`);
  }
  return movieDetails; // Return movieDetails without magnetLink if YTS search fails or yields no result
}

export async function getMovieVideos(movieId: number | string): Promise<TMDBVideoResponse> {
  return fetchTMDB<TMDBVideoResponse>(`movie/${movieId}/videos`);
}

export async function getPopularTvSeries(page: number = 1): Promise<TMDBPaginatedResponse<TMDBBaseTVSeries>> {
  console.log('[TMDB Fetch] Popular TV Series, Page:', page);
  return fetchTMDB<TMDBPaginatedResponse<TMDBBaseTVSeries>>('tv/popular', { page });
}

export async function getTvSeriesDetails(tvId: number | string): Promise<TMDBTVSeries> {
  console.log(`[TMDB Fetch] TV Series Details for ID: ${tvId}`);
  return fetchTMDB<TMDBTVSeries>(`tv/${tvId}`, { append_to_response: 'videos,external_ids' });
}

export async function getTvSeasonDetails(tvId: number | string, seasonNumber: number | string): Promise<TMDBTvSeasonDetails> {
  console.log(`[TMDB Fetch] TV Season Details for TV ID: ${tvId}, Season: ${seasonNumber}`);
  return fetchTMDB<TMDBTvSeasonDetails>(`tv/${tvId}/season/${seasonNumber}`);
}

export async function getEpisodeMagnetLink(seriesTitle: string, seasonNumber: number, episodeNumber: number): Promise<string | null> {
  const query = `${seriesTitle} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
  const apiUrl = `/api/torrents/tv?title=${encodeURIComponent(seriesTitle)}&season=${seasonNumber}&episode=${episodeNumber}`;
  console.log(`[Client-side Torrent Search] Requesting magnet for: "${query}" via API: ${apiUrl}`);
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `API request failed with status: ${response.status}` }));
      console.warn(`[Client-side Magnet Search] API request for magnet link failed for "${query}". Status: ${response.status}. Message: ${errorData.error}`);
      return null;
    }
    const data = await response.json();
    if (data.magnet) {
      console.log(`[Client-side Magnet Search] Magnet found via API for "${query}".`);
      return data.magnet;
    } else {
      console.warn(`[Client-side Magnet Search] No magnet link in API response for "${query}". Message: ${data.error || 'No magnet field'}`);
      return null;
    }
  } catch (error) {
    console.error(`[Client-side Magnet Search] Error fetching episode magnet link for "${query}":`, error);
    return null;
  }
}

export async function searchMulti(query: string, page: number = 1): Promise<TMDBMultiPaginatedResponse> {
  if (!query.trim()) {
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    };
  }
  console.log(`[TMDB Fetch] Multi Search for Query: ${query}, Page: ${page}`);
  return fetchTMDB<TMDBMultiPaginatedResponse>('search/multi', { query, page });
}

export function getFullImagePath(filePath: string | null | undefined, size: string = "w500"): string {
  if (!filePath) {
    // Determine placeholder dimensions based on typical aspect ratios for posters vs backdrops
    let width = 300;
    let height = 450; // Poster-like aspect ratio
    if (size === "original" || size.startsWith("w") && parseInt(size.substring(1)) >= 780) { // typically backdrop sizes
        width = 600;
        height = 338; // Backdrop-like aspect ratio
    } else if (size === "w500" || size === "w342" || size === "w185" || size === "w154") { // poster sizes
        // width remains 300, height 450 for consistency
    }

    // Use a consistent seed based on a part of the size or a static string if filePath is truly absent
    // This helps in getting somewhat consistent placeholders if called multiple times for same non-existent image
    const seed = `placeholder_${size}`; 
    return `https://picsum.photos/seed/${seed}/${width}/${height}?grayscale&blur=2`;
  }
  return `${IMAGE_BASE_URL}${size}${filePath}`;
}

