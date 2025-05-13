// src/app/[locale]/(main)/home/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { FilmIcon, Tv2Icon, YoutubeIcon } from "lucide-react";

export default function HomeLoading() {
  return (
    <div className="space-y-12 animate-pulse">
      {/* Hero Section Skeleton */}
      <Skeleton className="h-[60vh] min-h-[400px] rounded-xl w-full" />

      {/* YouTube Downloader Card Skeleton */}
      <Card className="shadow-xl border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
                <Skeleton className="h-8 w-48 mb-1" /> {/* Title */}
                <Skeleton className="h-5 w-64" /> {/* Description */}
            </div>
            <Skeleton className="h-9 w-32" /> {/* Button */}
        </CardHeader>
      </Card>


      {/* Popular Movies Section Skeleton */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <FilmIcon className="h-7 w-7 text-primary/50" />
          <Skeleton className="h-8 w-1/3" /> {/* Section Title */}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
          {[...Array(6)].map((_, i) => (
            <Card key={`movie-skeleton-${i}`} className="overflow-hidden shadow-lg h-full flex flex-col bg-card/50">
              <Skeleton className="aspect-[2/3] w-full" />
              <CardContent className="p-3 flex-grow flex flex-col justify-between">
                <div>
                  <Skeleton className="h-5 w-3/4 mb-1.5" />
                  <Skeleton className="h-4 w-1/2 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      
      <Skeleton className="h-px w-full my-8 md:my-12" />


      {/* Popular TV Series Section Skeleton */}
      <section className="space-y-6">
         <div className="flex items-center gap-2">
          <Tv2Icon className="h-7 w-7 text-primary/50" />
          <Skeleton className="h-8 w-1/3" /> {/* Section Title */}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
          {[...Array(6)].map((_, i) => (
            <Card key={`tv-skeleton-${i}`} className="overflow-hidden shadow-lg h-full flex flex-col bg-card/50">
              <Skeleton className="aspect-[2/3] w-full" />
              <CardContent className="p-3 flex-grow flex flex-col justify-between">
                <div>
                  <Skeleton className="h-5 w-3/4 mb-1.5" />
                  <Skeleton className="h-4 w-1/2 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
