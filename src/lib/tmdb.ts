// src/lib/tmdb.ts
import type { TMDBMovie, TMDBPaginatedResponse, TMDBBaseMovie, TMDBTVSeries, TMDBBaseTVSeries, TMDBTvSeasonDetails, TMDBMultiPaginatedResponse, TMDBVideoResponse, TMDBGenre, TMDBDiscoverFilters } from '@/types/tmdb';

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

export async function getMovieGenres(): Promise<{ genres: TMDBGenre[] }> {
  console.log('[TMDB Fetch] Movie Genres');
  return fetchTMDB<{ genres: TMDBGenre[] }>('genre/movie/list');
}

export async function getTvGenres(): Promise<{ genres: TMDBGenre[] }> {
  console.log('[TMDB Fetch] TV Genres');
  return fetchTMDB<{ genres: TMDBGenre[] }>('genre/tv/list');
}

export async function discoverMovies(page: number = 1, filters: TMDBDiscoverFilters = {}): Promise<TMDBPaginatedResponse<TMDBBaseMovie>> {
  console.log('[TMDB Fetch] Discover Movies, Page:', page, 'Filters:', filters);
  const params: Record<string, string | number | boolean> = { page, sort_by: filters.sort_by || 'popularity.desc', ...filters };
  if (filters.with_genres && Array.isArray(filters.with_genres) && filters.with_genres.length > 0) {
    params.with_genres = filters.with_genres.join(',');
  } else if (typeof filters.with_genres === 'string' && filters.with_genres) {
     params.with_genres = filters.with_genres;
  } else {
    delete params.with_genres; // Ensure it's not sent if empty or invalid
  }
  return fetchTMDB<TMDBPaginatedResponse<TMDBBaseMovie>>('discover/movie', params);
}

export async function discoverTvSeries(page: number = 1, filters: TMDBDiscoverFilters = {}): Promise<TMDBPaginatedResponse<TMDBBaseTVSeries>> {
  console.log('[TMDB Fetch] Discover TV Series, Page:', page, 'Filters:', filters);
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
  console.log('[TMDB Fetch] Popular Movies, Page:', page);
  // Using discoverMovies with default popularity sort to align with filtering capabilities
  return discoverMovies(page);
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
      } else {
        const ytsData: YTSResponse = await ytsResponse.json();
        if (ytsData.status === 'ok' && ytsData.data && ytsData.data.movies && ytsData.data.movies.length > 0) {
          const movie = ytsData.data.movies[0];
          if (movie.torrents && movie.torrents.length > 0) {
            let bestTorrent = movie.torrents.find(t => t.quality === '1080p' && t.seeds > 0);
            if (!bestTorrent) bestTorrent = movie.torrents.find(t => t.quality === '720p' && t.seeds > 0);
            if (!bestTorrent) bestTorrent = movie.torrents.filter(t => t.seeds > 0).sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0];
            if (!bestTorrent && movie.torrents.length > 0) bestTorrent = movie.torrents.sort((a,b) => (b.seeds || 0) - (a.seeds || 0))[0];

            if (bestTorrent) {
              const trackers = [
                'udp://tracker.openbittorrent.com:80/announce',
                'udp://tracker.opentrackr.org:1337/announce',
              ].map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
              const magnet = `magnet:?xt=urn:btih:${bestTorrent.hash}&dn=${encodeURIComponent(movie.title)}${trackers}`;
              return { ...movieDetails, magnetLink: magnet };
            }
          }
        }
      }
    } catch (error) {
      console.error(`[TMDB Details - YTS Search] Error fetching or processing data from YTS API for ${movieDetails.imdb_id}:`, error);
    }
  }
  return movieDetails;
}

export async function getMovieVideos(movieId: number | string): Promise<TMDBVideoResponse> {
  return fetchTMDB<TMDBVideoResponse>(`movie/${movieId}/videos`);
}

export async function getPopularTvSeries(page: number = 1): Promise<TMDBPaginatedResponse<TMDBBaseTVSeries>> {
  console.log('[TMDB Fetch] Popular TV Series, Page:', page);
  // Using discoverTvSeries with default popularity sort
  return discoverTvSeries(page);
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
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) return null;
    const data = await response.json();
    return data.magnet || null;
  } catch (error) {
    return null;
  }
}

export async function searchMulti(query: string, page: number = 1): Promise<TMDBMultiPaginatedResponse> {
  if (!query.trim()) {
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
  return fetchTMDB<TMDBMultiPaginatedResponse>('search/multi', { query, page });
}

export function getFullImagePath(filePath: string | null | undefined, size: string = "w500"): string {
  if (!filePath) {
    let width = 300;
    let height = 450; 
    if (size === "original" || (size.startsWith("w") && parseInt(size.substring(1)) >= 780)) {
        width = 600;
        height = 338;
    }
    const seed = `placeholder_${size.replace(/\//g, '_')}_${width}x${height}`;
    return `https://picsum.photos/seed/${seed}/${width}/${height}?grayscale&blur=1`;
  }
  return `${IMAGE_BASE_URL}${size}${filePath}`;
}
