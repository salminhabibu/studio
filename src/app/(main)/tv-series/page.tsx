// src/app/(main)/tv-series/page.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Tv2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPopularTvSeries, getFullImagePath } from "@/lib/tmdb";
import type { TMDBBaseTVSeries } from "@/types/tmdb";
import { Badge } from "@/components/ui/badge";

export default async function TvSeriesPage() {
  let seriesList: TMDBBaseTVSeries[] = [];
  let error: string | null = null;

  try {
    const popularTvSeriesData = await getPopularTvSeries();
    seriesList = popularTvSeriesData.results;
  } catch (e) {
    console.error("Failed to fetch popular TV series:", e);
    error = "Could not load TV series. Please try again later.";
  }
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Popular TV Series</h1>

      {error && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <Tv2Icon className="w-20 h-20 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-destructive">Error Loading TV Series</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
        </div>
      )}

      {!error && seriesList.length === 0 && (
         <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <Tv2Icon className="w-20 h-20 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No TV Series Found</h2>
          <p className="text-muted-foreground max-w-sm">
            Popular TV series could not be loaded at this time.
          </p>
        </div>
      )}

      {!error && seriesList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8">
          {seriesList.map((series) => (
            <Link href={`/tv-series/${series.id}`} key={series.id} className="group">
              <Card className="overflow-hidden shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out transform hover:-translate-y-1.5 flex flex-col h-full bg-card hover:bg-card/90">
                <div className="aspect-[2/3] relative w-full">
                  <Image
                    src={getFullImagePath(series.poster_path, "w500")}
                    alt={series.name || "TV series poster"}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint="tv series poster"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
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
                      {series.first_air_date ? new Date(series.first_air_date).getFullYear() : 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
