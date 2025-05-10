// src/types/tmdb.ts

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface TMDBBaseMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string; // "YYYY-MM-DD"
  vote_average: number;
  genre_ids?: number[]; // Present in list views
  overview: string;
  media_type?: 'movie'; // Added for multi-search
}

export interface TMDBMovie extends TMDBBaseMovie {
  genres: TMDBGenre[];
  runtime: number | null; // in minutes
  tagline: string | null;
  production_companies: TMDBProductionCompany[];
  revenue?: number;
  budget?: number;
  status?: string;
  videos?: {
    results: TMDBVideo[];
  };
  imdb_id?: string; // Often available, useful for other APIs
}

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBBaseTVSeries {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string; // "YYYY-MM-DD"
  vote_average: number;
  genre_ids?: number[]; // Present in list views
  overview: string;
  media_type?: 'tv'; // Added for multi-search
}

export interface TMDBEpisode {
  id: number;
  air_date: string | null;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  vote_average: number;
  season_number: number;
  runtime: number | null;
}

export interface TMDBSeason {
  air_date: string | null; // Usually the air date of the first episode
  episode_count: number; 
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
}

export interface TMDBTVSeries extends TMDBBaseTVSeries {
  genres: TMDBGenre[];
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TMDBSeason[];
  last_episode_to_air: TMDBEpisode | null;
  next_episode_to_air: TMDBEpisode | null;
  tagline: string | null;
  production_companies: TMDBProductionCompany[];
  created_by?: { id: number; name: string; profile_path: string | null }[];
  status?: string;
  videos?: {
    results: TMDBVideo[];
  };
}

export interface TMDBTvSeasonDetails extends TMDBSeason {
  _id: string; 
  episodes: TMDBEpisode[];
}

interface TMDBPersonResult {
  id: number;
  name: string;
  profile_path: string | null;
  media_type: 'person';
  adult: boolean;
  popularity: number;
  known_for_department?: string;
  known_for?: Array<Partial<TMDBBaseMovie & TMDBBaseTVSeries>>; 
}

export type TMDBMultiSearchResultItem = 
  | (TMDBBaseMovie & { media_type: 'movie' }) 
  | (TMDBBaseTVSeries & { media_type: 'tv' }) 
  | TMDBPersonResult;

export type ClientTMDBMultiSearchResultItem = 
  | (TMDBBaseMovie & { media_type: 'movie' }) 
  | (TMDBBaseTVSeries & { media_type: 'tv' });


export interface TMDBMultiPaginatedResponse extends TMDBPaginatedResponse<TMDBMultiSearchResultItem> {}


export interface TMDBVideo {
  iso_639_1: string;
  iso_3166_1: string;
  name: string;
  key: string; 
  site: "YouTube" | string; 
  size: 1080 | 720 | 480 | 2160 | 1440; 
  type: "Trailer" | "Teaser" | "Clip" | "Featurette" | "Behind the Scenes" | "Bloopers";
  official: boolean;
  published_at: string; 
  id: string; 
}

export interface TMDBVideoResponse {
  id: number; 
  results: TMDBVideo[];
}

export interface TMDBDiscoverFilters {
  with_genres?: string | string[]; // Comma-separated string of genre IDs or array
  primary_release_year?: number;   // For movies
  first_air_date_year?: number;    // For TV series
  with_origin_country?: string;    // ISO 3166-1 code
  sort_by?: string;                // e.g., 'popularity.desc', 'release_date.desc'
  // Add other relevant filters as needed from TMDB discover docs
}
