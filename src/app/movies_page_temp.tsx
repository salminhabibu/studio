// src/app/[locale]/(main)/movies/page.tsx
"use client";

import React, { useState, useEffect, use } from 'react';
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary';
import { Loader2Icon } from "lucide-react";
import { MediaDiscoveryPage } from '@/components/features/discovery/MediaDiscoveryPage';
import { discoverMovies, getMovieGenres } from "@/lib/tmdb";
import type { TMDBPaginatedResponse, TMDBDiscoverFilters } from '@/types/tmdb'; // For function prop types
import type { TMDBBaseMedia } from '@/types/discovery'; // For function prop types

const MOVIES_SESSION_STORAGE_KEY = "chillymovies-movies-discovery-state";

interface MoviesPageProps {
  params: Promise<{ locale: Locale }>;
}

export default function MoviesPage(props: MoviesPageProps) {
  const resolvedParams = use(props.params);
  const locale = resolvedParams.locale;
  const [dictionary, setDictionary] = useState<any>(null);

  useEffect(() => {
    const fetchDict = async () => {
      if (locale) {
        const dict = await getDictionary(locale);
        setDictionary(dict); 
      }
    };
    fetchDict();
  }, [locale]);

  if (!dictionary || !locale) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Type assertion for discoverMovies if its signature in tmdb.ts is specific to TMDBBaseMovie
  const typedDiscoverMovies = discoverMovies as unknown as (page: number, filters: TMDBDiscoverFilters) => Promise<TMDBPaginatedResponse<TMDBBaseMedia>>;

  return (
    <MediaDiscoveryPage
      mediaType="movie"
      discoverFunction={typedDiscoverMovies}
      getGenresFunction={getMovieGenres}
      pageDictionary={dictionary.moviesPage} 
      detailPageUrlPrefix="/movies"
      locale={locale}
      sessionStorageKey={MOVIES_SESSION_STORAGE_KEY}
    />
  );
}
