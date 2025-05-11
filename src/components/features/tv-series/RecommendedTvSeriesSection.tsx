// src/components/features/tv-series/RecommendedTvSeriesSection.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getTvSeriesRecommendations } from "@/lib/tmdb";
import type { TMDBBaseTVSeries } from '@/types/tmdb';
import { RecommendedItemCard } from "@/components/features/common/RecommendedItemCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tv2Icon, ThumbsUpIcon, Loader2Icon } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';

interface RecommendedTvSeriesSectionProps {
  tvId: number | string;
}

export function RecommendedTvSeriesSection({ tvId }: RecommendedTvSeriesSectionProps) {
  const [recommendations, setRecommendations] = useState<TMDBBaseTVSeries[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false); // Changed from loading to isLoading for consistency
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
    if (!tvId) return;
    setIsLoading(true);
    if (pageToFetch === 1) setError(null);

    try {
      const recommendationsData = await getTvSeriesRecommendations(tvId, pageToFetch);
      setRecommendations(prev => pageToFetch === 1 ? recommendationsData.results : [...prev, ...recommendationsData.results]);
      setTotalPages(recommendationsData.total_pages);
      // No specific message if results are empty on first load
    } catch (err) {
      console.error("Failed to fetch TV series recommendations:", err);
      setError(err instanceof Error ? err.message : "Could not load recommendations.");
    } finally {
      setIsLoading(false);
    }
  }, [tvId]);

  useEffect(() => {
    fetchRecommendations(currentPage);
  }, [fetchRecommendations, currentPage]);
  
  // Reset when tvId changes
  useEffect(() => {
    setRecommendations([]);
    setCurrentPage(1);
    setTotalPages(1);
    setError(null);
  }, [tvId]);

  if (error && recommendations.length === 0) {
    return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Tv2Icon className="h-6 w-6 text-destructive" /> Error Loading Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!isLoading && recommendations.length === 0 && currentPage >= totalPages) {
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
          {recommendations.length === 0 && isLoading && (
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
              {recommendations.map((series) => (
                <RecommendedItemCard key={series.id} item={series} mediaType="tv" />
              ))}
              {currentPage < totalPages && !isLoading && (
                <div ref={loadMoreRef} className="w-1 h-1 flex-shrink-0"></div>
              )}
              {isLoading && currentPage > 1 && (
                 <div className="flex-shrink-0 w-40 md:w-48 flex items-center justify-center">
                    <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                 </div>
              )}
            </div>
          )}
          {!isLoading && currentPage >= totalPages && recommendations.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-3">No more recommendations.</p>
          )}
          {error && recommendations.length > 0 && (
             <p className="text-xs text-destructive text-center pt-3">{error}</p>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
