// src/lib/tmdb.ts
import type { TMDBMovie, TMDBPaginatedResponse, TMDBBaseMovie, TMDBTVSeries, TMDBBaseTVSeries, TMDBTvSeasonDetails, TMDBMultiPaginatedResponse } from '@/types/tmdb';

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!API_KEY) {
    console.error('NEXT_PUBLIC_TMDB_API_KEY is not defined in environment variables. Please add it to your .env file.');
    throw new Error('NEXT_PUBLIC_TMDB_API_KEY is not configured.');
  }
  const urlParams = new URLSearchParams({
    api_key: API_KEY,
    language: 'en-US',
    ...params,
  });
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
    // Ensure the error is an instance of Error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error)); 
  }
}

export async function getPopularMovies(page: number = 1): Promise<TMDBPaginatedResponse<TMDBBaseMovie>> {
  return fetchTMDB<TMDBPaginatedResponse<TMDBBaseMovie>>('movie/popular', { page: page.toString() });
}

export async function getMovieDetails(movieId: number | string): Promise<TMDBMovie> {
  return fetchTMDB<TMDBMovie>(`movie/${movieId}`);
}

export async function getPopularTvSeries(page: number = 1): Promise<TMDBPaginatedResponse<TMDBBaseTVSeries>> {
  return fetchTMDB<TMDBPaginatedResponse<TMDBBaseTVSeries>>('tv/popular', { page: page.toString() });
}

export async function getTvSeriesDetails(tvId: number | string): Promise<TMDBTVSeries> {
  return fetchTMDB<TMDBTVSeries>(`tv/${tvId}`);
}

export async function getTvSeasonDetails(tvId: number | string, seasonNumber: number | string): Promise<TMDBTvSeasonDetails> {
  return fetchTMDB<TMDBTvSeasonDetails>(`tv/${tvId}/season/${seasonNumber}`);
}

export async function searchMulti(query: string, page: number = 1): Promise<TMDBMultiPaginatedResponse> {
  if (!query.trim()) {
    // Return an empty response if query is empty to avoid unnecessary API calls
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    };
  }
  return fetchTMDB<TMDBMultiPaginatedResponse>('search/multi', { query, page: page.toString() });
}

export function getFullImagePath(filePath: string | null | undefined, size: string = "w500"): string {
  if (!filePath) {
    // Determine aspect ratio based on typical poster/backdrop for placeholder
    const width = size === "original" || size === "w1280" || size === "w780" ? 600 : 300;
    const height = size === "original" || size === "w1280" || size === "w780" ? 338 : 450; // approx 16:9 for backdrops, 2:3 for posters
    const seed = filePath || 'placeholder'; // Use filePath as seed if it was just empty string
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
  }
  return `${IMAGE_BASE_URL}${size}${filePath}`;
}

