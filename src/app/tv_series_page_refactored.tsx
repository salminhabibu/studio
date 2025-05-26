// src/app/[locale]/(main)/tv-series/page.tsx (Refactored)
"use client";

import React, { useState, useEffect, use } from 'react';
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary';
import { Loader2Icon } from "lucide-react";
import { MediaDiscoveryPage } from '@/components/features/discovery/MediaDiscoveryPage';
import { discoverTvSeries, getTvGenres } from "@/lib/tmdb";
import type { TMDBPaginatedResponse, TMDBDiscoverFilters } from '@/types/tmdb'; // For function prop types
import type { TMDBBaseMedia } from '@/types/discovery'; // For function prop types

const TV_SERIES_SESSION_STORAGE_KEY = "chillymovies-tvseries-discovery-state";

interface TvSeriesPageProps {
  params: Promise<{ locale: Locale }>;
}

export default function TvSeriesPage(props: TvSeriesPageProps) {
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

  // Type assertion for discoverTvSeries if its signature in tmdb.ts is specific to TMDBBaseTVSeries
  const typedDiscoverTvSeries = discoverTvSeries as unknown as (page: number, filters: TMDBDiscoverFilters) => Promise<TMDBPaginatedResponse<TMDBBaseMedia>>;

  return (
    <MediaDiscoveryPage
      mediaType="tv"
      discoverFunction={typedDiscoverTvSeries}
      getGenresFunction={getTvGenres}
      pageDictionary={dictionary.tvSeriesPage} 
      detailPageUrlPrefix="/tv-series"
      locale={locale}
      sessionStorageKey={TV_SERIES_SESSION_STORAGE_KEY}
    />
  );
}
