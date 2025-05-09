// src/app/(main)/movies/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilmIcon } from "lucide-react";
import Image from "next/image";

export default function MoviesPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Movies</h1>
      
      {/* Placeholder for filters and sorting */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Sorting (Coming Soon)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Advanced filtering and sorting options will be available here.</p>
        </CardContent>
      </Card>

      {/* Placeholder for movie grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(10)].map((_, index) => (
          <Card key={index} className="overflow-hidden shadow-md hover:shadow-primary/30 transition-shadow duration-300 group">
            <div className="aspect-[2/3] bg-muted overflow-hidden">
               <Image
                src={`https://picsum.photos/seed/movie${index}/400/600`}
                alt={`Movie Poster ${index + 1}`}
                width={400}
                height={600}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="movie poster"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">Movie Title {index + 1}</h3>
              <p className="text-sm text-muted-foreground">Genre - Year</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State Example - Kept commented as per original, design aligns with proposal */}
      {/* <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <FilmIcon className="w-24 h-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">No Movies Found</h2>
        <p className="text-muted-foreground max-w-md">
          It seems there are no movies available at the moment. Try adjusting your filters or check back later.
        </p>
      </div> */}
    </div>
  );
}

