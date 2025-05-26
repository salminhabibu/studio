// src/components/features/discovery/MediaDiscoveryPage.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TMDBBaseMedia, MediaDiscoveryProps } from "@/types/discovery";
import type { TMDBGenre, TMDBDiscoverFilters } from "@/types/tmdb"; // TMDBDiscoverFilters might be needed
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2Icon, FilmIcon, ListFilterIcon, RefreshCwIcon, XIcon, TvIcon } from "lucide-react"; // Added TvIcon
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from "@/components/ui/label";
import { getFullImagePath } from "@/lib/tmdb"; // Keep this utility

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

interface DiscoveryPageState {
  filters: {
    genre: string;
    year: string;
    origin: string;
  };
  currentPage: number;
  scrollY: number;
  items: TMDBBaseMedia[];
}

export function MediaDiscoveryPage({
  mediaType,
  discoverFunction,
  getGenresFunction,
  pageDictionary,
  detailPageUrlPrefix,
  locale,
  sessionStorageKey,
}: MediaDiscoveryProps) {
  const [items, setItems] = useState<TMDBBaseMedia[]>([]);
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

  const [localizedOriginCountries, setLocalizedOriginCountries] = useState(
    ORIGIN_COUNTRIES_BASE.map(oc => ({...oc, label: pageDictionary.originCountries[oc.labelKey] || oc.labelKey }))
  );

  useEffect(() => {
    // Update localized countries if pageDictionary changes (e.g., on locale change if component is kept mounted)
    setLocalizedOriginCountries(
      ORIGIN_COUNTRIES_BASE.map(oc => ({...oc, label: pageDictionary.originCountries[oc.labelKey] || oc.labelKey }))
    );
  }, [pageDictionary]);

  const lastItemElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoading || isLoadingInitial) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingInitial, currentPage, totalPages]);

  const fetchMediaData = useCallback(async (page: number) => {
    if (page === 1) {
      setIsLoadingInitial(true);
      setError(null); 
    } else {
      setIsLoading(true);
    }
    
    try {
      const apiFilters: TMDBDiscoverFilters = {};
      if (selectedGenre) apiFilters.with_genres = selectedGenre;
      if (selectedYear) {
        if (mediaType === 'movie') apiFilters.primary_release_year = parseInt(selectedYear);
        else apiFilters.first_air_date_year = parseInt(selectedYear);
      }
      if (selectedOrigin) apiFilters.with_origin_country = selectedOrigin;

      const data = await discoverFunction(page, apiFilters);
      
      setItems(prevItems => page === 1 ? data.results : [...prevItems, ...data.results]);
      setTotalPages(data.total_pages);
      if (data.results.length === 0 && page === 1) setError(pageDictionary?.noMoviesFound || "No items found matching your criteria."); // Use generic key from dict
      else setError(null);

    } catch (err) {
      console.error(`Failed to fetch ${mediaType}:`, err);
      const errorMessage = err instanceof Error ? err.message : (pageDictionary?.errorLoadingMovies || `Failed to load ${mediaType}.`);
      setError(page === 1 ? errorMessage : (pageDictionary?.errorLoadingMoreMovies || `Failed to load more ${mediaType}.`));
      if (page === 1) setItems([]);
    } finally {
      setIsLoading(false);
      setIsLoadingInitial(false);
    }
  }, [selectedGenre, selectedYear, selectedOrigin, pageDictionary, discoverFunction, mediaType]); 

  useEffect(() => {
    const fetchInitialGenres = async () => {
      try {
        const genreData = await getGenresFunction();
        setGenres([{ id: 0, name: pageDictionary?.allGenres || "All Genres" }, ...genreData.genres]); 
      } catch (err) {
        console.error(`Failed to fetch ${mediaType} genres:`, err);
      }
    };
    if (pageDictionary) fetchInitialGenres();
  }, [pageDictionary, getGenresFunction, mediaType]);
  
  useEffect(() => {
    if (hasRestoredStateRef.current || typeof window === 'undefined' || !pageDictionary) return;

    const savedStateString = sessionStorage.getItem(sessionStorageKey);
    if (savedStateString) {
      try {
        const savedState: DiscoveryPageState = JSON.parse(savedStateString);
        setSelectedGenre(savedState.filters.genre);
        setSelectedYear(savedState.filters.year);
        setSelectedOrigin(savedState.filters.origin);
        setItems(savedState.items); 
        setCurrentPage(savedState.currentPage); 
        scrollYToRestoreRef.current = savedState.scrollY;
        setTotalPages(savedState.items.length > 0 ? Math.ceil(savedState.items.length / 20) + 1 : 1); 

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
        console.error(`[${mediaType} DiscoveryPage] Error parsing saved state:`, e);
        sessionStorage.removeItem(sessionStorageKey); 
      }
    }
    hasRestoredStateRef.current = true; 
    fetchMediaData(1); 
  }, [pageDictionary, fetchMediaData, sessionStorageKey, mediaType]); 

  useEffect(() => {
    if (hasRestoredStateRef.current && currentPage > 1 && pageDictionary) {
        const isRestoringFurther = items.length > 0 && currentPage > Math.ceil(items.length / 20); 
        if(isRestoringFurther || !sessionStorage.getItem(sessionStorageKey)){ 
            fetchMediaData(currentPage);
        }
    }
  }, [currentPage, fetchMediaData, items.length, pageDictionary, sessionStorageKey]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined' && items.length > 0) { 
        const stateToSave: DiscoveryPageState = {
          filters: {
            genre: selectedGenre,
            year: selectedYear,
            origin: selectedOrigin,
          },
          currentPage: currentPage,
          scrollY: window.scrollY,
          items: items, 
        };
        sessionStorage.setItem(sessionStorageKey, JSON.stringify(stateToSave));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); 
    };
  }, [selectedGenre, selectedYear, selectedOrigin, currentPage, items, sessionStorageKey]);

  const handleFilterChange = () => {
    sessionStorage.removeItem(sessionStorageKey); 
    hasRestoredStateRef.current = true; 
    setCurrentPage(1); 
    fetchMediaData(1); 
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

  if (!pageDictionary || !locale) { 
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  const activeFilterCount = [selectedGenre, selectedYear, selectedOrigin].filter(Boolean).length;
  const PageIcon = mediaType === 'tv' ? TvIcon : FilmIcon;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{pageDictionary.mainTitle}</h1>
        {activeFilterCount > 0 && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs sm:text-sm">
              <XIcon className="mr-1.5 h-4 w-4" /> {pageDictionary.clearFiltersButton} ({activeFilterCount})
            </Button>
          )}
      </div>
      
      <Card className="p-4 sm:p-6 shadow-lg border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="genre-filter" className="text-sm font-medium text-muted-foreground">{pageDictionary.genreLabel}</Label>
            <Select value={selectedGenre || "0"} onValueChange={handleGenreChange}>
              <SelectTrigger id="genre-filter" className="h-10">
                <SelectValue placeholder={pageDictionary.selectGenrePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {genres.map(genre => (
                  <SelectItem key={genre.id} value={String(genre.id)}>{genre.id === 0 ? pageDictionary.allGenres : genre.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year-filter" className="text-sm font-medium text-muted-foreground">{pageDictionary.yearLabel}</Label>
            <Select value={selectedYear || "0"} onValueChange={handleYearChange}>
              <SelectTrigger id="year-filter" className="h-10">
                <SelectValue placeholder={pageDictionary.selectYearPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{pageDictionary.allYears}</SelectItem>
                {YEARS.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="origin-filter" className="text-sm font-medium text-muted-foreground">{pageDictionary.originLabel}</Label>
            <Select value={selectedOrigin || "0"} onValueChange={handleOriginChange}>
              <SelectTrigger id="origin-filter" className="h-10">
                <SelectValue placeholder={pageDictionary.selectOriginPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {localizedOriginCountries.map(country => (
                  <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleFilterChange} className="h-10 w-full sm:w-auto mt-auto" disabled={isLoadingInitial || isLoading}>
            <ListFilterIcon className="mr-2 h-4 w-4" /> {pageDictionary.refreshResultsButton}
          </Button>
        </div>
      </Card>

      {isLoadingInitial && items.length === 0 && (
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

      {!isLoadingInitial && error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <PageIcon className="w-20 h-20 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-destructive">{pageDictionary.errorTitle}</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
          <Button variant="outline" onClick={() => fetchMediaData(1)}>
            <RefreshCwIcon className="mr-2 h-4 w-4" /> {pageDictionary.retryButton}
          </Button>
        </div>
      )}
      
      {!isLoadingInitial && !error && items.length === 0 && (
         <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <PageIcon className="w-20 h-20 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">{pageDictionary.noMoviesFoundTitle}</h2> {/* Use generic key */}
          <p className="text-muted-foreground max-w-sm">
            {pageDictionary.noMoviesFoundDescription} {/* Use generic key */}
          </p>
        </div>
      )}

      {items.length > 0 && ( 
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8">
          {items.map((item, index) => {
            const isLastItem = items.length === index + 1;
            const title = item.media_type === 'movie' ? item.title : item.name;
            const releaseDate = item.media_type === 'movie' ? item.release_date : item.first_air_date;
            const year = releaseDate ? new Date(releaseDate).getFullYear() : pageDictionary.na;

            return (
              <Link href={`/${locale}${detailPageUrlPrefix}/${item.id}`} key={`${item.id}-${index}`} className="group" prefetch={false}>
                <Card 
                  ref={isLastItem ? lastItemElementRef : null}
                  className="overflow-hidden shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out transform hover:-translate-y-1.5 flex flex-col h-full bg-card hover:bg-card/90"
                >
                  <div className="aspect-[2/3] relative w-full">
                    <Image
                      src={getFullImagePath(item.poster_path, "w500")}
                      alt={title || (mediaType === 'movie' ? pageDictionary.moviePosterAlt : pageDictionary.tvSeriesPosterAlt)}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={`${mediaType} poster`}
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                      priority={index < 6} 
                    />
                    {item.vote_average > 0 && (
                      <Badge variant="default" className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm text-xs">
                        {item.vote_average.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors" title={title}>
                        {title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {year}
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
          <p className="ml-3 text-muted-foreground">{pageDictionary.loadingMore}</p>
        </div>
      )}
       {!isLoading && !isLoadingInitial && currentPage >= totalPages && items.length > 0 && (
         <p className="text-center text-muted-foreground py-8">{pageDictionary.endOfList}</p>
       )}
    </div>
  );
}
