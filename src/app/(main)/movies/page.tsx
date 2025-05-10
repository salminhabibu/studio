// src/app/(main)/movies/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { discoverMovies, getMovieGenres, getFullImagePath } from "@/lib/tmdb";
import type { TMDBBaseMovie, TMDBGenre } from "@/types/tmdb";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2Icon, FilmIcon, ListFilterIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i); // Last 50 years

const ORIGIN_COUNTRIES = [
  { label: "Any Origin", value: "" },
  { label: "Hollywood (US)", value: "US" },
  { label: "Nollywood (NG)", value: "NG" },
  { label: "Bollywood (IN)", value: "IN" },
  { label: "United Kingdom", value: "GB" },
  { label: "Canada", value: "CA" },
  { label: "Australia", value: "AU" },
  { label: "France", value: "FR" },
  { label: "Germany", value: "DE" },
  { label: "Japan", value: "JP" },
  { label: "South Korea", value: "KR" },
];

export default function MoviesPage() {
  const [movies, setMovies] = useState<TMDBBaseMovie[]>([]);
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
  const lastMovieElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoading || isLoadingInitial) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingInitial, currentPage, totalPages]);

  const fetchMovieData = useCallback(async (page: number, filtersChanged: boolean = false) => {
    if (filtersChanged) {
       setMovies([]); // Clear existing movies if filters change
       setError(null);
       setIsLoadingInitial(true); // Show initial skeleton loader
    } else if (page > 1) {
       setIsLoading(true); // Show pagination loader
    } else {
       setIsLoadingInitial(true);
    }
    
    try {
      const apiFilters: Record<string, any> = {};
      if (selectedGenre) apiFilters.with_genres = selectedGenre;
      if (selectedYear) apiFilters.primary_release_year = parseInt(selectedYear);
      if (selectedOrigin) apiFilters.with_origin_country = selectedOrigin;

      const data = await discoverMovies(page, apiFilters);
      
      setMovies(prevMovies => filtersChanged ? data.results : [...prevMovies, ...data.results]);
      setTotalPages(data.total_pages);
      if (data.results.length === 0 && page === 1) setError("No movies found matching your criteria.");
      else setError(null);

    } catch (err) {
      console.error("Failed to fetch movies:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load movies.";
      setError(filtersChanged || page === 1 ? errorMessage : "Failed to load more movies.");
      if (filtersChanged || page === 1) setMovies([]);
    } finally {
      setIsLoading(false);
      setIsLoadingInitial(false);
    }
  }, [selectedGenre, selectedYear, selectedOrigin]);

  useEffect(() => {
    const fetchInitialGenres = async () => {
      try {
        const genreData = await getMovieGenres();
        setGenres([{ id: 0, name: "All Genres" }, ...genreData.genres]); // Add "All Genres" option
      } catch (err) {
        console.error("Failed to fetch genres:", err);
        // Silently fail or show small error for genres
      }
    };
    fetchInitialGenres();
  }, []);
  
  useEffect(() => {
    fetchMovieData(currentPage, currentPage === 1);
  }, [currentPage, fetchMovieData]);


  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to page 1 triggers the useEffect for fetchMovieData
    // The actual fetch will happen in the useEffect due to currentPage change
  };
  
  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId === "0" ? "" : genreId); // "0" for "All Genres"
    handleFilterChange();
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year === "0" ? "" : year); // "0" for "All Years"
    handleFilterChange();
  };

  const handleOriginChange = (originCode: string) => {
    setSelectedOrigin(originCode);
    handleFilterChange();
  };

  const resetFilters = () => {
    setSelectedGenre('');
    setSelectedYear('');
    setSelectedOrigin('');
    // This will trigger handleFilterChange via individual state setters if we want immediate refetch
    // or we can call handleFilterChange once after all states are set.
    // For simplicity and to ensure fetchMovieData is called with cleared state:
    if (currentPage === 1) { // If already on page 1, force refetch
        fetchMovieData(1, true);
    } else {
        setCurrentPage(1); // This will trigger refetch with new empty filters
    }
  };

  const activeFilterCount = [selectedGenre, selectedYear, selectedOrigin].filter(Boolean).length;


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Discover Movies</h1>
        {activeFilterCount > 0 && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs sm:text-sm">
              <XIcon className="mr-1.5 h-4 w-4" /> Clear Filters ({activeFilterCount})
            </Button>
          )}
      </div>
      
      <Card className="p-4 sm:p-6 shadow-lg border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 items-end">
          <div className="space-y-1.5">
            <label htmlFor="genre-filter" className="text-sm font-medium text-muted-foreground">Genre</label>
            <Select value={selectedGenre || "0"} onValueChange={handleGenreChange}>
              <SelectTrigger id="genre-filter" className="h-10">
                <SelectValue placeholder="Select Genre" />
              </SelectTrigger>
              <SelectContent>
                {genres.map(genre => (
                  <SelectItem key={genre.id} value={String(genre.id)}>{genre.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="year-filter" className="text-sm font-medium text-muted-foreground">Year</label>
            <Select value={selectedYear || "0"} onValueChange={handleYearChange}>
              <SelectTrigger id="year-filter" className="h-10">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Years</SelectItem>
                {YEARS.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="origin-filter" className="text-sm font-medium text-muted-foreground">Origin</label>
            <Select value={selectedOrigin} onValueChange={handleOriginChange}>
              <SelectTrigger id="origin-filter" className="h-10">
                <SelectValue placeholder="Select Origin" />
              </SelectTrigger>
              <SelectContent>
                {ORIGIN_COUNTRIES.map(country => (
                  <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleFilterChange} className="h-10 w-full sm:w-auto mt-auto" disabled={isLoadingInitial || isLoading}>
            <ListFilterIcon className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
        </div>
      </Card>

      {isLoadingInitial && (
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

      {!isLoadingInitial && error && movies.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <FilmIcon className="w-20 h-20 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-destructive">Error Loading Movies</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
          <Button variant="outline" onClick={() => fetchMovieData(1, true)}>
            <RefreshCwIcon className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      )}
      
      {!isLoadingInitial && !error && movies.length === 0 && (
         <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <FilmIcon className="w-20 h-20 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No Movies Found</h2>
          <p className="text-muted-foreground max-w-sm">
            No movies found matching your criteria. Try adjusting the filters.
          </p>
        </div>
      )}

      {!isLoadingInitial && movies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8">
          {movies.map((movie, index) => {
            const isLastMovie = movies.length === index + 1;
            return (
              <Link href={`/movies/${movie.id}`} key={`${movie.id}-${index}`} className="group" prefetch={false}>
                <Card 
                  ref={isLastMovie ? lastMovieElementRef : null}
                  className="overflow-hidden shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out transform hover:-translate-y-1.5 flex flex-col h-full bg-card hover:bg-card/90"
                >
                  <div className="aspect-[2/3] relative w-full">
                    <Image
                      src={getFullImagePath(movie.poster_path, "w500")}
                      alt={movie.title || "Movie poster"}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint="movie poster"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    />
                    {movie.vote_average > 0 && (
                      <Badge variant="default" className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm text-xs">
                        {movie.vote_average.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors" title={movie.title}>
                        {movie.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
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
          <p className="ml-3 text-muted-foreground">Loading more movies...</p>
        </div>
      )}
       {!isLoading && !isLoadingInitial && currentPage >= totalPages && movies.length > 0 && (
         <p className="text-center text-muted-foreground py-8">You&apos;ve reached the end of the list.</p>
       )}
    </div>
  );
}
