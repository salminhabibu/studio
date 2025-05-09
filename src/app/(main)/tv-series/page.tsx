// src/app/(main)/tv-series/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tv2Icon } from "lucide-react";
import Image from "next/image";

export default function TvSeriesPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">TV Series</h1>
      
      {/* Placeholder for filters and sorting */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Sorting (Coming Soon)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Advanced filtering and sorting options will be available here.</p>
        </CardContent>
      </Card>

      {/* Placeholder for TV series grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(10)].map((_, index) => (
          <Card key={index} className="overflow-hidden shadow-md hover:shadow-primary/30 transition-shadow duration-300 group">
            <div className="aspect-[2/3] bg-muted overflow-hidden">
              <Image
                src={`https://picsum.photos/seed/series${index}/400/600`}
                alt={`TV Series Poster ${index + 1}`}
                width={400}
                height={600}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="tv series"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">TV Series Title {index + 1}</h3>
              <p className="text-sm text-muted-foreground">Genre - Seasons</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Empty State Example - Kept commented as per original, design aligns with proposal */}
      {/* <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Tv2Icon className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">No TV Series Found</h2>
        <p className="text-muted-foreground max-w-md">
          It seems there are no TV series available at the moment. Try adjusting your filters or check back later.
        </p>
      </div> */}
    </div>
  );
}

