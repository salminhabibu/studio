// src/lib/tmdb.ts
import type { TMDBMovie, TMDBPaginatedResponse, TMDBBaseMovie, TMDBTVSeries, TMDBBaseTVSeries, TMDBTvSeasonDetails } from '@/types/tmdb';

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!API_KEY) {
    throw new Error('TMDB_API_KEY is not defined in environment variables.');
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
      const errorData = await response.json();
      console.error(`TMDB API Error (${response.status}): ${errorData.status_message || 'Unknown error'}`);
      throw new Error(`Failed to fetch from TMDB: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  } catch (error) {
    console.error('Error fetching TMDB data:', error);
    throw error; // Re-throw to be handled by the caller
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

export function getFullImagePath(filePath: string | null | undefined, size: string = "w500"): string {
  if (!filePath) {
    // Return a placeholder image if no path is available
    return `https://picsum.photos/seed/${size === "original" ? "backdrop" : "poster"}/${size === "w500" ? "400" : "1280"}/${size === "w500" ? "600" : "720"}`;
  }
  return `${IMAGE_BASE_URL}${size}${filePath}`;
}
