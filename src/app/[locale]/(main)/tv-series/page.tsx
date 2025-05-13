// src/app/[locale]/(main)/tv-series/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { discoverTvSeries, getTvGenres, getFullImagePath } from "@/lib/tmdb";
import type { TMDBBaseTVSeries, TMDBGenre } from "@/types/tmdb";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2Icon, Tv2Icon, ListFilterIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary'; // To be created

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

const ORIGIN_COUNTRIES_BASE = [
  { value: "0", labelKey: "anyOrigin" }, 
  { value: "US", labelKey: "hollywood" },
  { value: "NG", labelKey: "nollywood" },
  { value: "IN", labelKey: "bollywood" },
  { value: "GB", labelKey: "unitedKingdom" },
  { value: "CA", labelKey: "canada" },
  { value: "AU", labelKey: "australia" },
  { value: "FR", labelKey: "france" },
  { value: "DE", labelKey: "germany" },
  { value: "JP", labelKey: "japan" },
  { value: "KR", labelKey: "southKorea" },
];


const SESSION_STORAGE_KEY_PREFIX = "chillymovies";
const TVSERIES_STATE_KEY = `${SESSION_STORAGE_KEY_PREFIX}-tvseries-discovery-state`;

interface DiscoveryPageState {
  filters: {
    genre: string;
    year: string;
    origin: string;
  };
  currentPage: number;
  scrollY: number;
  seriesList: TMDBBaseTVSeries[]; 
}

interface TvSeriesPageProps {
  params: { locale: Locale };
}

export default function TvSeriesPage({ params: { locale } }: TvSeriesPageProps) {
  const [seriesList, setSeriesList] = useState<TMDBBaseTVSeries[]>([]);
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const observer = useRef<IntersectionObserver>();
  const hasRestoredStateRef = useRef(false);
  const scrollYToRestoreRef = useRef<number | null>(null);

  const [dictionary, setDictionary] = useState<any>(null);
  const [localizedOriginCountries, setLocalizedOriginCountries] = useState(ORIGIN_COUNTRIES_BASE.map(oc => ({...oc, label: oc.labelKey })));

  useEffect(() => {
    const fetchDict = async () => {
      const dict = await getDictionary(locale);
      setDictionary(dict.tvSeriesPage); // Assuming structure tvSeriesPage for this page
      setLocalizedOriginCountries(ORIGIN_COUNTRIES_BASE.map(oc => ({...oc, label: dict.tvSeriesPage.originCountries[oc.labelKey] || oc.labelKey })));
    };
    fetchDict();
  }, [locale]);

  const lastSeriesElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoading || isLoadingInitial) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingInitial, currentPage, totalPages]);


  const fetchTvSeriesData = useCallback(async (page: number) => {
    if (page === 1) {
      setIsLoadingInitial(true);
      setError(null);
    } else {
      setIsLoading(true);
    }
    
    try {
      const apiFilters: Record<string, any> = {};
      if (selectedGenre) apiFilters.with_genres = selectedGenre;
      if (selectedYear) apiFilters.first_air_date_year = parseInt(selectedYear);
      if (selectedOrigin) apiFilters.with_origin_country = selectedOrigin;

      const data = await discoverTvSeries(page, apiFilters);
      
      setSeriesList(prevSeries => page === 1 ? data.results : [...prevSeries, ...data.results]);
      setTotalPages(data.total_pages);
      if (data.results.length === 0 && page === 1) setError(dictionary?.noTvSeriesFound || "No TV series found matching your criteria.");
      else setError(null);

    } catch (err) {
      console.error("Failed to fetch TV series:", err);
      const errorMessage = err instanceof Error ? err.message : (dictionary?.errorLoadingTvSeries || "Failed to load TV series.");
      setError(page === 1 ? errorMessage : (dictionary?.errorLoadingMoreTvSeries || "Failed to load more TV series."));
      if (page === 1) setSeriesList([]);
    } finally {
      setIsLoading(false);
      setIsLoadingInitial(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenre, selectedYear, selectedOrigin, dictionary]);

  useEffect(() => {
    const fetchInitialGenres = async () => {
      try {
        const genreData = await getTvGenres();
        setGenres([{ id: 0, name: dictionary?.allGenres || "All Genres" }, ...genreData.genres]);
      } catch (err) {
        console.error("Failed to fetch TV genres:", err);
      }
    };
    if(dictionary) fetchInitialGenres();
  }, [dictionary]);
  
  // Restore state on mount
  useEffect(() => {
    if (hasRestoredStateRef.current || typeof window === 'undefined' || !dictionary) return;

    const savedStateString = sessionStorage.getItem(TVSERIES_STATE_KEY);
    if (savedStateString) {
      try {
        const savedState: DiscoveryPageState = JSON.parse(savedStateString);
        setSelectedGenre(savedState.filters.genre);
        setSelectedYear(savedState.filters.year);
        setSelectedOrigin(savedState.filters.origin);
        setSeriesList(savedState.seriesList); 
        setCurrentPage(savedState.currentPage); 
        scrollYToRestoreRef.current = savedState.scrollY;
        setTotalPages(savedState.seriesList.length > 0 ? Math.ceil(savedState.seriesList.length / 20)+1 : 1); 

        hasRestoredStateRef.current = true;
        setIsLoadingInitial(false);

        setTimeout(() => {
          if (scrollYToRestoreRef.current !== null) {
            window.scrollTo({ top: scrollYToRestoreRef.current, behavior: 'auto' });
            scrollYToRestoreRef.current = null;
          }
        }, 100);
        return; 
      } catch (e) {
        console.error("[TvSeriesPage] Error parsing saved state:", e);
        sessionStorage.removeItem(TVSERIES_STATE_KEY);
      }
    }
    hasRestoredStateRef.current = true;
    fetchTvSeriesData(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictionary]);

  // Main data fetching useEffect for subsequent pages (infinite scroll)
  useEffect(() => {
    if (hasRestoredStateRef.current && currentPage > 1 && dictionary) {
      const isRestoringFurther = seriesList.length > 0 && currentPage > Math.ceil(seriesList.length / 20);
       if(isRestoringFurther || !sessionStorage.getItem(TVSERIES_STATE_KEY)){
            fetchTvSeriesData(currentPage);
        }
    }
  }, [currentPage, fetchTvSeriesData, seriesList.length, dictionary]);

  // Save state on unmount or before navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined' && seriesList.length > 0) {
        const stateToSave: DiscoveryPageState = {
          filters: {
            genre: selectedGenre,
            year: selectedYear,
            origin: selectedOrigin,
          },
          currentPage: currentPage,
          scrollY: window.scrollY,
          seriesList: seriesList, 
        };
        sessionStorage.setItem(TVSERIES_STATE_KEY, JSON.stringify(stateToSave));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [selectedGenre, selectedYear, selectedOrigin, currentPage, seriesList]);

  const handleFilterChange = () => {
    sessionStorage.removeItem(TVSERIES_STATE_KEY);
    hasRestoredStateRef.current = true; 
    setCurrentPage(1);
    fetchTvSeriesData(1);
  };
  
  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId === "0" ? "" : genreId);
    handleFilterChange();
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year === "0" ? "" : year);
    handleFilterChange();
  };

  const handleOriginChange = (originCode: string) => {
    setSelectedOrigin(originCode === "0" ? "" : originCode); 
    handleFilterChange();
  };
  
  const resetFilters = () => {
    setSelectedGenre('');
    setSelectedYear('');
    setSelectedOrigin('');
    handleFilterChange();
  };

  if (!dictionary) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  const activeFilterCount = [selectedGenre, selectedYear, selectedOrigin].filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{dictionary.mainTitle}</h1>
        {activeFilterCount > 0 && (
          <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs sm:text-sm">
            <XIcon className="mr-1.5 h-4 w-4" /> {dictionary.clearFiltersButton} ({activeFilterCount})
          </Button>
        )}
      </div>
      
      <Card className="p-4 sm:p-6 shadow-lg border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="genre-filter-tv" className="text-sm font-medium text-muted-foreground">{dictionary.genreLabel}</Label>
            <Select value={selectedGenre || "0"} onValueChange={handleGenreChange}>
              <SelectTrigger id="genre-filter-tv" className="h-10">
                <SelectValue placeholder={dictionary.selectGenrePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {genres.map(genre => (
                  <SelectItem key={genre.id} value={String(genre.id)}>{genre.id === 0 ? dictionary.allGenres : genre.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year-filter-tv" className="text-sm font-medium text-muted-foreground">{dictionary.yearLabel}</Label>
            <Select value={selectedYear || "0"} onValueChange={handleYearChange}>
              <SelectTrigger id="year-filter-tv" className="h-10">
                <SelectValue placeholder={dictionary.selectYearPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{dictionary.allYears}</SelectItem>
                {YEARS.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="origin-filter-tv" className="text-sm font-medium text-muted-foreground">{dictionary.originLabel}</Label>
            <Select value={selectedOrigin || "0"} onValueChange={handleOriginChange}>
              <SelectTrigger id="origin-filter-tv" className="h-10">
                <SelectValue placeholder={dictionary.selectOriginPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {localizedOriginCountries.map(country => (
                  <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <Button onClick={handleFilterChange} className="h-10 w-full sm:w-auto mt-auto" disabled={isLoadingInitial || isLoading}>
            <ListFilterIcon className="mr-2 h-4 w-4" /> {dictionary.refreshResultsButton}
          </Button>
        </div>
      </Card>

      {isLoadingInitial && seriesList.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8">
          {[...Array(12)].map((_, i) => (
             <Card key={i} className="overflow-hidden shadow-lg flex flex-col h-full bg-card">
              <Skeleton className="aspect-[2/3] w-full" />
              <CardContent className="p-3">
                <Skeleton className="h-5 w-3/4 mb-1.5" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoadingInitial && error && seriesList.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <Tv2Icon className="w-20 h-20 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-destructive">{dictionary.errorTitle}</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
           <Button variant="outline" onClick={() => fetchTvSeriesData(1)}>
            <RefreshCwIcon className="mr-2 h-4 w-4" /> {dictionary.retryButton}
          </Button>
        </div>
      )}
      
      {!isLoadingInitial && !error && seriesList.length === 0 && (
         <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <Tv2Icon className="w-20 h-20 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">{dictionary.noTvSeriesFoundTitle}</h2>
          <p className="text-muted-foreground max-w-sm">
            {dictionary.noTvSeriesFoundDescription}
          </p>
        </div>
      )}

      {seriesList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8">
          {seriesList.map((series, index) => {
            const isLastSeries = seriesList.length === index + 1;
            return (
              <Link href={`/${locale}/tv-series/${series.id}`} key={`${series.id}-${index}`} className="group" prefetch={false}>
                <Card 
                  ref={isLastSeries ? lastSeriesElementRef : null}
                  className="overflow-hidden shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out transform hover:-translate-y-1.5 flex flex-col h-full bg-card hover:bg-card/90"
                >
                  <div className="aspect-[2/3] relative w-full">
                    <Image
                      src={getFullImagePath(series.poster_path, "w500")}
                      alt={series.name || dictionary.tvSeriesPosterAlt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint="tv series poster"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                      priority={index < 6} 
                    />
                    {series.vote_average > 0 && (
                      <Badge variant="default" className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm text-xs">
                        {series.vote_average.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors" title={series.name}>
                        {series.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {series.first_air_date ? new Date(series.first_air_date).getFullYear() : dictionary.na}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {isLoading && !isLoadingInitial && (
         <div className="flex justify-center items-center py-8">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">{dictionary.loadingMore}</p>
        </div>
      )}
      {!isLoading && !isLoadingInitial && currentPage >= totalPages && seriesList.length > 0 && (
         <p className="text-center text-muted-foreground py-8">{dictionary.endOfList}</p>
       )}
    </div>
  );
}
