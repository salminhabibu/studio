// src/lib/tmdb.ts
import type { TMDBMovie, TMDBPaginatedResponse, TMDBBaseMovie, TMDBTVSeries, TMDBBaseTVSeries, TMDBTvSeasonDetails, TMDBMultiPaginatedResponse, TMDBVideoResponse, TMDBGenre, TMDBDiscoverFilters } from '@/types/tmdb';
import type { TVEpisodeTorrentResultItem } from '@/types/torrent'; // Import from shared types file

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

// YTS API specific type
interface YTSMovieTorrent {
  url: string;
  hash: string;
  quality: string; // e.g., "720p", "1080p", "2160p" (4K), "3D"
  type: string; // e.g., "web", "bluray"
  seeds: number;
  peers: number;
  size: string;
  size_bytes: number;
  date_uploaded: string;
  date_uploaded_unix: number;
}

interface YTSMovieDetail {
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

async function fetchTMDB<T>(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  if (!API_KEY) {
    console.error('NEXT_PUBLIC_TMDB_API_KEY is not defined. Please set it in .env or environment variables.');
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
    const response = await fetch(url, { next: { revalidate: 3600 } }); 
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

export async function getMovieGenres(): Promise<{ genres: TMDBGenre[] }> {
  return fetchTMDB<{ genres: TMDBGenre[] }>('genre/movie/list');
}

export async function getTvGenres(): Promise<{ genres: TMDBGenre[] }> {
  return fetchTMDB<{ genres: TMDBGenre[] }>('genre/tv/list');
}

export async function discoverMovies(page: number = 1, filters: TMDBDiscoverFilters = {}): Promise<TMDBPaginatedResponse<TMDBBaseMovie>> {
  const params: Record<string, string | number | boolean> = { page, sort_by: filters.sort_by || 'popularity.desc', ...filters };
  if (filters.with_genres && Array.isArray(filters.with_genres) && filters.with_genres.length > 0) {
    params.with_genres = filters.with_genres.join(',');
  } else if (typeof filters.with_genres === 'string' && filters.with_genres) {
     params.with_genres = filters.with_genres;
  } else {
    delete params.with_genres; 
  }
  return fetchTMDB<TMDBPaginatedResponse<TMDBBaseMovie>>('discover/movie', params);
}

export async function discoverTvSeries(page: number = 1, filters: TMDBDiscoverFilters = {}): Promise<TMDBPaginatedResponse<TMDBBaseTVSeries>> {
  const params: Record<string, string | number | boolean> = { page, sort_by: filters.sort_by || 'popularity.desc', ...filters };
   if (filters.with_genres && Array.isArray(filters.with_genres) && filters.with_genres.length > 0) {
    params.with_genres = filters.with_genres.join(',');
  } else if (typeof filters.with_genres === 'string' && filters.with_genres) {
     params.with_genres = filters.with_genres;
  } else {
    delete params.with_genres;
  }
  return fetchTMDB<TMDBPaginatedResponse<TMDBBaseTVSeries>>('discover/tv', params);
}


export async function getPopularMovies(page: number = 1): Promise<TMDBPaginatedResponse<TMDBBaseMovie>> {
  return discoverMovies(page);
}

export async function getMovieDetails(movieId: number | string): Promise<TMDBMovie & { magnetLink?: string, torrentQuality?: string }> {
  const movieDetails = await fetchTMDB<TMDBMovie>(`movie/${movieId}`, { append_to_response: 'videos,external_ids' });

  if (movieDetails.imdb_id) {
    try {
      // YTS API can be unreliable, use a proxy or direct if allowed.
      // const ytsQueryUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${movieDetails.imdb_id}&limit=1&sort_by=seeds&quality=1080p,720p`;
      // For stability, let's use a broader search if specific quality fails.
      // Prioritize 1080p, then 720p, then any with good seeds.
      const qualitiesToTry = ['1080p', '720p', 'all']; // 'all' as a fallback
      let bestTorrent: YTSMovieTorrent | undefined;
      let foundQuality: string | undefined;

      for (const quality of qualitiesToTry) {
        const ytsQueryUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${movieDetails.imdb_id}&limit=5&sort_by=seeds${quality !== 'all' ? `&quality=${quality}` : ''}`;
        const ytsResponse = await fetch(ytsQueryUrl, { cache: 'no-store' }); // Avoid caching YTS results aggressively here
        
        if (!ytsResponse.ok) {
          // console.warn removed
          continue; 
        }
        const ytsData: YTSResponse = await ytsResponse.json();
        if (ytsData.status === 'ok' && ytsData.data?.movies && ytsData.data.movies.length > 0) {
          const movie = ytsData.data.movies[0]; // Assuming first result for the IMDB ID is the correct one
          if (movie.torrents && movie.torrents.length > 0) {
            // Sort by seeds, then by quality preference (e.g. 1080p > 720p > etc.)
            const sortedTorrents = movie.torrents
                .filter(t => t.seeds > 0) // Only consider torrents with seeds
                .sort((a, b) => {
                    if (a.quality === '1080p' && b.quality !== '1080p') return -1;
                    if (b.quality === '1080p' && a.quality !== '1080p') return 1;
                    if (a.quality === '720p' && b.quality !== '720p') return -1;
                    if (b.quality === '720p' && a.quality !== '720p') return 1;
                    return (b.seeds || 0) - (a.seeds || 0); // Fallback to seeds
                });
            
            bestTorrent = sortedTorrents[0];
            if (bestTorrent) {
              foundQuality = bestTorrent.quality;
              break; // Found a good torrent
            }
          }
        }
      }


      if (bestTorrent) {
        const trackers = [
          'udp://tracker.openbittorrent.com:80/announce',
          'udp://tracker.opentrackr.org:1337/announce',
          'udp://tracker.torrent.eu.org:451/announce',
          'udp://tracker.dler.org:6969/announce',
          'udp://open.stealth.si:80/announce',
          'udp://p4p.arenabg.com:1337/announce',
          'udp://tracker.internetwarriors.net:1337/announce',
        ].map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
        const magnet = `magnet:?xt=urn:btih:${bestTorrent.hash}&dn=${encodeURIComponent(movieDetails.title)}${trackers}`;
        return { ...movieDetails, magnetLink: magnet, torrentQuality: foundQuality };
      } else {
        // console.log removed
      }
    } catch (error) {
      console.error(`[YTS Search] Error for ${movieDetails.imdb_id}:`, error);
    }
  }
  return movieDetails;
}

export async function getMovieVideos(movieId: number | string): Promise<TMDBVideoResponse> {
  return fetchTMDB<TMDBVideoResponse>(`movie/${movieId}/videos`);
}

export async function getPopularTvSeries(page: number = 1): Promise<TMDBPaginatedResponse<TMDBBaseTVSeries>> {
  return discoverTvSeries(page);
}

export async function getTvSeriesDetails(tvId: number | string): Promise<TMDBTVSeries> {
  return fetchTMDB<TMDBTVSeries>(`tv/${tvId}`, { append_to_response: 'videos,external_ids' });
}

export async function getTvSeasonDetails(tvId: number | string, seasonNumber: number | string): Promise<TMDBTvSeasonDetails> {
  // Torrent fetching logic and seriesName fetching for that purpose have been removed.
  // The page component tv-series/[id]/page.tsx is now responsible for fetching torrents.
  const seasonData = await fetchTMDB<TMDBTvSeasonDetails>(`tv/${tvId}/season/${seasonNumber}`);
  // Placeholders for magnetLink and torrentQuality have been removed.
  return seasonData;
}

// getEpisodeTorrentOptions function has been removed as it's no longer used.

export async function searchMulti(query: string, page: number = 1): Promise<TMDBMultiPaginatedResponse> {
  if (!query.trim()) {
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
  return fetchTMDB<TMDBMultiPaginatedResponse>('search/multi', { query, page });
}

export async function getMovieRecommendations(movieId: number | string, page: number = 1): Promise<TMDBPaginatedResponse<TMDBBaseMovie>> {
  console.log(`[TMDB Fetch] Movie Recommendations for ID: ${movieId}, Page: ${page}`);
  return fetchTMDB<TMDBPaginatedResponse<TMDBBaseMovie>>(`movie/${movieId}/recommendations`, { page });
}

export async function getTvSeriesRecommendations(tvId: number | string, page: number = 1): Promise<TMDBPaginatedResponse<TMDBBaseTVSeries>> {
  return fetchTMDB<TMDBPaginatedResponse<TMDBBaseTVSeries>>(`tv/${tvId}/recommendations`, { page });
}


export function getFullImagePath(filePath: string | null | undefined, size: string = "w500"): string {
  if (!filePath) {
    let width = 300;
    let height = 450; 
    if (size === "original" || (size.startsWith("w") && parseInt(size.substring(1)) >= 780)) {
        width = 600;
        height = 338; // Typical backdrop aspect ratio
    } else if (size === "w200" || size === "w154"){
        width = size === "w200" ? 200 : 154;
        height = Math.round(width * 1.5); 
    } else if (size === "w300") {
        width = 300;
        height = 450;
    }
    const seed = `placeholder_${filePath?.replace(/[\/\.]/g, '_') || 'default'}_${size.replace(/\//g, '_')}`;
    return `https://picsum.photos/seed/${seed}/${width}/${height}?grayscale&blur=1`;
  }
  return `${IMAGE_BASE_URL}${size}${filePath}`;
}

// Adding this type to tmdb.ts for MovieDownloadCard to use
export type { YTSMovieTorrent, YTSMovieDetail, YTSResponse, YTSResponseData };
