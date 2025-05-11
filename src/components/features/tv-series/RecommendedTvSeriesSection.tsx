// src/components/features/tv-series/RecommendedTvSeriesSection.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getTvSeriesRecommendations } from "@/lib/tmdb";
import type { TMDBBaseTVSeries } from '@/types/tmdb';
import { RecommendedItemCard } from "@/components/features/common/RecommendedItemCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tv2Icon, ThumbsUpIcon, Loader2Icon } from "lucide-react"; // Changed SparklesIcon to ThumbsUpIcon
import { Skeleton } from '@/components/ui/skeleton';

interface RecommendedTvSeriesSectionProps {
  tvId: number | string;
}

export function RecommendedTvSeriesSection({ tvId }: RecommendedTvSeriesSectionProps) {
  const [recommendations, setRecommendations] = useState<TMDBBaseTVSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!tvId) return;
    setIsLoading(true);
    setError(null);
    try {
      const recommendationsData = await getTvSeriesRecommendations(tvId, 1);
      setRecommendations(recommendationsData.results.slice(0, 4)); // Take top 4
    } catch (err) {
      console.error("Failed to fetch TV series recommendations:", err);
      setError(err instanceof Error ? err.message : "Could not load recommendations.");
    } finally {
      setIsLoading(false);
    }
  }, [tvId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (isLoading) {
    return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ThumbsUpIcon className="h-6 w-6 text-primary" /> {/* Changed SparklesIcon to ThumbsUpIcon */}
            You Might Also Like
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mb-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="group flex-shrink-0 w-40 md:w-48">
                <Skeleton className="aspect-[2/3] w-full rounded-md" />
                <Skeleton className="h-4 w-3/4 mt-2 rounded-md" />
                <Skeleton className="h-3 w-1/2 mt-1 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
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

  if (recommendations.length === 0) {
    return null; // Don't render the section if no recommendations and not loading/error
  }

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ThumbsUpIcon className="h-6 w-6 text-primary" /> {/* Changed SparklesIcon to ThumbsUpIcon */}
          You Might Also Like
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mb-2">
            {recommendations.map((series) => (
              <RecommendedItemCard key={series.id} item={series} mediaType="tv" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
