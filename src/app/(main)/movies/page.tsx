// src/app/(main)/movies/page.tsx
import { Card, CardContent } from "@/components/ui/card";
import { FilmIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPopularMovies, getFullImagePath } from "@/lib/tmdb";
import type { TMDBBaseMovie } from "@/types/tmdb";
import { Badge } from "@/components/ui/badge";

export default async function MoviesPage() {
  let movies: TMDBBaseMovie[] = [];
  let error: string | null = null;

  try {
    const popularMoviesData = await getPopularMovies();
    movies = popularMoviesData.results;
  } catch (e) {
    console.error("Failed to fetch popular movies:", e);
    error = "Could not load movies. Please try again later.";
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Popular Movies</h1>
      
      {error && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <FilmIcon className="w-20 h-20 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-destructive">Error Loading Movies</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
        </div>
      )}

      {!error && movies.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <FilmIcon className="w-20 h-20 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No Movies Found</h2>
          <p className="text-muted-foreground max-w-sm">
            Popular movies could not be loaded at this time.
          </p>
        </div>
      )}

      {!error && movies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8">
          {movies.map((movie) => (
            <Link href={`/movies/${movie.id}`} key={movie.id} className="group">
              <Card className="overflow-hidden shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out transform hover:-translate-y-1.5 flex flex-col h-full bg-card hover:bg-card/90">
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
          ))}
        </div>
      )}
    </div>
  );
}
