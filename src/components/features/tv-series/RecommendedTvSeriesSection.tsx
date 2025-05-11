// src/components/features/tv-series/RecommendedTvSeriesSection.tsx
import { getTvSeriesRecommendations } from "@/lib/tmdb";
import { RecommendedItemCard } from "@/components/features/common/RecommendedItemCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tv2Icon, SparklesIcon } from "lucide-react";

interface RecommendedTvSeriesSectionProps {
  tvId: number | string;
}

export async function RecommendedTvSeriesSection({ tvId }: RecommendedTvSeriesSectionProps) {
  try {
    const recommendationsData = await getTvSeriesRecommendations(tvId, 1);
    const recommendedTvSeries = recommendationsData.results.slice(0, 4);

    if (recommendedTvSeries.length === 0) {
      return null; // Don't render the section if no recommendations
    }

    return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <SparklesIcon className="h-6 w-6 text-primary" />
            You Might Also Like
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mb-2">
              {recommendedTvSeries.map((series) => (
                <RecommendedItemCard key={series.id} item={series} mediaType="tv" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error("Failed to fetch TV series recommendations:", error);
     return (
        <Card className="shadow-lg mt-8">
            <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Tv2Icon className="h-6 w-6 text-destructive" /> Error</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Could not load recommendations at this time.</p></CardContent>
        </Card>
    );
  }
}
