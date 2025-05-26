// src/types/discovery.ts
import type { Locale } from '@/config/i18n.config';
import type { TMDBPaginatedResponse, TMDBBaseMovie, TMDBBaseTVSeries, TMDBGenre, TMDBDiscoverFilters } from '@/types/tmdb';

// Base type that encompasses common fields for movies and TV series for discovery cards
export type TMDBBaseMedia = (TMDBBaseMovie | TMDBBaseTVSeries) & {
  // Explicitly define common accessors, even if they exist on TMDBBaseMovie/TVSeries
  // This helps the MediaDiscoveryPage component access them without type casting issues.
  // The actual object will be one of TMDBBaseMovie or TMDBBaseTVSeries.
  // TypeScript's union type handling should allow accessing specific fields like 'title' or 'name'
  // after a type guard (e.g., 'media_type === "movie"').
};

export interface MediaDiscoveryProps {
  mediaType: 'movie' | 'tv';
  discoverFunction: (page: number, filters: TMDBDiscoverFilters) => Promise<TMDBPaginatedResponse<TMDBBaseMedia>>;
  getGenresFunction: () => Promise<{ genres: TMDBGenre[] }>;
  pageDictionary: any; // Specific dictionary for 'moviesPage' or 'tvSeriesPage'
  detailPageUrlPrefix: string; // e.g., "/movies" or "/tv-series"
  locale: Locale;
  sessionStorageKey: string; // e.g., "chillymovies-movies-discovery-state"
}
