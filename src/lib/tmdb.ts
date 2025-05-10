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

interface YTSMovie {
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
  movies?: YTSMovie[];
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
    console.log(`[Torrent Search] YTS for IMDB ID: ${movieDetails.imdb_id}`);
    try {
      const ytsResponse = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${movieDetails.imdb_id}`);
      if (!ytsResponse.ok) {
        console.warn(`[WARN] YTS API request failed for ${movieDetails.imdb_id} with status: ${ytsResponse.status}`);
      } else {
        const ytsData: YTSResponse = await ytsResponse.json();
        if (ytsData.data && ytsData.data.movies && ytsData.data.movies.length > 0) {
          const movie = ytsData.data.movies[0];
          if (movie.torrents && movie.torrents.length > 0) {
            let bestTorrent = movie.torrents.find(t => t.quality === '1080p');
            if (!bestTorrent) {
              bestTorrent = movie.torrents.find(t => t.quality === '720p');
            }
            if (!bestTorrent) {
              // Fallback to highest seed count if specific qualities not found
              bestTorrent = movie.torrents.reduce((prev, current) => (prev.seeds > current.seeds) ? prev : current);
            }
            if (bestTorrent) {
              const magnet = `magnet:?xt=urn:btih:${bestTorrent.hash}&dn=${encodeURIComponent(movie.title)}&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.opentrackr.org:1337/announce`;
              console.log(`[Magnet Found] For ${movieDetails.title}: ${magnet}`);
              return { ...movieDetails, magnetLink: magnet };
            }
          }
        }
        console.warn(`[WARN] No torrents found on YTS for: ${movieDetails.title} (IMDB: ${movieDetails.imdb_id})`);
      }
    } catch (error) {
      console.error(`[WARN] Error fetching from YTS API for ${movieDetails.imdb_id}:`, error);
    }
  } else {
    console.warn(`[WARN] No IMDB ID found for YTS search for movie: ${movieDetails.title}`);
  }
  return movieDetails;
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
  console.log(`[Client-side Torrent Search] Requesting magnet for: ${query}`);
  try {
    // Corrected query parameters to match API route expectations (title, season, episode)
    const response = await fetch(`/api/torrents/tv?title=${encodeURIComponent(seriesTitle)}&season=${seasonNumber}&episode=${episodeNumber}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch episode magnet link' }));
      console.warn(`[WARN] API request for magnet link failed for ${query} with status: ${response.status}. Message: ${errorData.error}`);
      return null;
    }
    const data = await response.json();
    // Corrected to access data.magnet as per the API route's response
    if (data.magnet) {
      console.log(`[Client-side Magnet Found] For ${query}: ${data.magnet}`);
      return data.magnet;
    } else {
      console.warn(`[Client-side WARN] No torrents found via API for: ${query}. Message: ${data.error || 'No magnet link in response'}`);
      return null;
    }
  } catch (error) {
    console.error(`[Client-side ERROR] Error fetching episode magnet link for ${query}:`, error);
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
    const width = size === "original" || size === "w1280" || size === "w780" ? 600 : 300;
    const height = size === "original" || size === "w1280" || size === "w780" ? 338 : 450;
    const seed = filePath || 'placeholder';
    // Using a more specific placeholder service if picsum.photos is too generic or causes issues.
    // For now, keeping picsum.photos as per original, but this could be a point of refinement.
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
  }
  return `${IMAGE_BASE_URL}${size}${filePath}`;
}
