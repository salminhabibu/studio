// src/components/features/movies/RecommendedMoviesSection.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getMovieRecommendations } from "@/lib/tmdb";
import type { TMDBBaseMovie } from '@/types/tmdb';
import { RecommendedItemCard } from "@/components/features/common/RecommendedItemCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FilmIcon, ThumbsUpIcon, Loader2Icon } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/config/i18n.config'; // Import Locale

interface RecommendedMoviesSectionProps {
  movieId: number | string;
  locale: Locale; // Add locale prop
}

export function RecommendedMoviesSection({ movieId, locale }: RecommendedMoviesSectionProps) {
  const [recommendations, setRecommendations] = useState<TMDBBaseMovie[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observer = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages && !isLoading) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, currentPage, totalPages]);

  const fetchRecommendations = useCallback(async (pageToFetch: number) => {
    if (!movieId) return;
    setIsLoading(true);
    if (pageToFetch === 1) setError(null); // Clear previous errors on initial fetch

    try {
      const recommendationsData = await getMovieRecommendations(movieId, pageToFetch);
      setRecommendations(prev => pageToFetch === 1 ? recommendationsData.results : [...prev, ...recommendationsData.results]);
      setTotalPages(recommendationsData.total_pages);
      if (recommendationsData.results.length === 0 && pageToFetch === 1) {
        // No specific message here, it will just render empty if total pages is also 0/1
      }
    } catch (err) {
      console.error("Failed to fetch movie recommendations:", err);
      setError(err instanceof Error ? err.message : "Could not load recommendations.");
    } finally {
      setIsLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    fetchRecommendations(currentPage);
  }, [fetchRecommendations, currentPage]);
  
  // Reset when movieId changes
  useEffect(() => {
    setRecommendations([]);
    setCurrentPage(1);
    setTotalPages(1);
    setError(null);
    // Fetch will be triggered by currentPage change in the above useEffect
  }, [movieId]);


  if (error && recommendations.length === 0) { // Only show big error if initial load failed
    return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FilmIcon className="h-6 w-6 text-destructive" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!isLoading && recommendations.length === 0 && currentPage >= totalPages) {
      // Don't render the section if no recommendations were found at all
      return null;
  }


  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ThumbsUpIcon className="h-6 w-6 text-primary" />
          You Might Also Like
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {recommendations.length === 0 && isLoading && ( // Skeleton for initial load
             <div className="flex space-x-4 overflow-x-hidden pb-2 -mb-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="group flex-shrink-0 w-40 md:w-48">
                    <Skeleton className="aspect-[2/3] w-full rounded-md" />
                    <Skeleton className="h-4 w-3/4 mt-2 rounded-md" />
                    <Skeleton className="h-3 w-1/2 mt-1 rounded-md" />
                  </div>
                ))}
              </div>
          )}
          {recommendations.length > 0 && (
            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mb-2">
              {recommendations.map((movie) => (
                <RecommendedItemCard key={movie.id} item={movie} mediaType="movie" locale={locale} />
              ))}
              {/* Invisible div to trigger loading more */}
              {currentPage < totalPages && !isLoading && (
                <div ref={loadMoreRef} className="w-1 h-1 flex-shrink-0"></div>
              )}
              {isLoading && currentPage > 1 && ( // Loading indicator for subsequent loads
                 <div className="flex-shrink-0 w-40 md:w-48 flex items-center justify-center">
                    <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                 </div>
              )}
            </div>
          )}
          {!isLoading && currentPage >= totalPages && recommendations.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-3">No more recommendations.</p>
          )}
           {error && recommendations.length > 0 && ( // Small error for subsequent load failures
             <p className="text-xs text-destructive text-center pt-3">{error}</p>
           )}
        </div>
      </CardContent>
    </Card>
  );
}