// src/app/(main)/home/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function HomeLoading() {
  return (
    <div className="space-y-12 animate-pulse">
      {/* Hero Section Skeleton */}
      <Skeleton className="h-[60vh] min-h-[400px] rounded-xl w-full" />

      {/* Add Video Link Section Skeleton */}
      <Card className="shadow-xl border-border/50">
        <CardHeader>
          <Skeleton className="h-7 w-3/4 mb-2" /> {/* Title */}
          <Skeleton className="h-4 w-full mt-1" /> {/* Description */}
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-grow" /> {/* Input */}
            <Skeleton className="h-12 w-24 md:w-28" /> {/* Button */}
          </div>
        </CardContent>
      </Card>
      
      {/* Search Section Skeleton */}
      <Card className="shadow-xl border-border/50">
        <CardHeader>
          <Skeleton className="h-7 w-3/4 mb-2" /> {/* Title */}
          <Skeleton className="h-4 w-full mt-1" /> {/* Description */}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-14 w-full" /> {/* Search Input */}
        </CardContent>
      </Card>

      {/* Featured Content Section Skeleton */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-7 w-1/3" /> {/* Section Title */}
          <Skeleton className="h-6 w-24" /> {/* View All Button */}
        </div>
        <div className="relative">
          <div className="flex space-x-6 overflow-x-hidden pb-4 -mb-4"> {/* Use overflow-x-hidden for skeleton */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="group flex-shrink-0 w-52 md:w-60">
                <Card className="overflow-hidden shadow-lg h-full flex flex-col">
                  <Skeleton className="aspect-[2/3] w-full" />
                  <CardContent className="p-3 flex-grow flex flex-col justify-between">
                    <div>
                      <Skeleton className="h-5 w-3/4 mb-1.5" />
                      <Skeleton className="h-4 w-1/2 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
