// src/app/(main)/movies/[id]/page.tsx
import { getMovieDetails, getFullImagePath } from "@/lib/tmdb";
import type { TMDBMovie, TMDBVideo } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDaysIcon, ClockIcon, FilmIcon, DollarSignIcon, GlobeIcon, InfoIcon, UsersIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { MovieClientContent } from "@/components/features/movies/MovieClientContent";
import { MovieDownloadCard } from "@/components/features/movies/MovieDownloadCard"; // Import the new component

interface MovieDetailsPageProps {
  params: { id: string };
}

export default async function MovieDetailsPage({ params }: MovieDetailsPageProps) {
  let movie: (TMDBMovie & { magnetLink?: string }) | null = null; // Ensure magnetLink is part of the type
  let trailerKey: string | null = null;
  let error: string | null = null;

  if (!params.id) {
    error = "Movie ID not found.";
  } else {
    try {
      // getMovieDetails should already include magnetLink if found
      const movieData = await getMovieDetails(params.id);
      movie = movieData;

      const videos: TMDBVideo[] = movieData.videos?.results || [];
      const officialTrailer = videos.find(
        (video) => video.site === "YouTube" && video.type === "Trailer" && video.official
      ) || videos.find( 
        (video) => video.site === "YouTube" && video.type === "Trailer"
      );
      trailerKey = officialTrailer?.key || null;

    } catch (e) {
      console.error(`Failed to fetch movie details for ID ${params.id}:`, e);
      error = "Could not load movie details. Please try again later.";
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <FilmIcon className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-destructive mb-3">Error Loading Movie Details</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/movies">Back to Movies</Link>
        </Button>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <FilmIcon className="w-24 h-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-3">Movie Not Found</h1>
        <p className="text-muted-foreground max-w-md">The movie you are looking for could not be found.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/movies">Back to Movies</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <MovieClientContent movie={movie} trailerKey={trailerKey}>
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            {/* Replace the old card content with the new Client Component */}
            <MovieDownloadCard movie={movie} />
          </div>

          <div className="md:col-span-8 lg:col-span-9 space-y-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><InfoIcon className="h-6 w-6 text-primary"/> Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 leading-relaxed">{movie.overview || "No overview available."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {movie.genres.map(genre => (
                    <Badge key={genre.id} variant="secondary" className="text-sm px-3 py-1">{genre.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
               <CardHeader>
                <CardTitle className="flex items-center gap-2"><FilmIcon className="h-6 w-6 text-primary"/> Movie Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start space-x-3">
                  <CalendarDaysIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Release Date</p>
                    <p className="text-muted-foreground">{movie.release_date ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Runtime</p>
                    <p className="text-muted-foreground">{movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'N/A'}</p>
                  </div>
                </div>
                 <div className="flex items-start space-x-3">
                  <StarIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Rating</p>
                    <p className="text-muted-foreground">{movie.vote_average > 0 ? `${movie.vote_average.toFixed(1)} / 10` : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <DollarSignIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Budget</p>
                    <p className="text-muted-foreground">{movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <DollarSignIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Revenue</p>
                    <p className="text-muted-foreground">{movie.revenue ? `$${movie.revenue.toLocaleString()}` : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <GlobeIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Status</p>
                    <p className="text-muted-foreground">{movie.status || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {movie.production_companies && movie.production_companies.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UsersIcon className="h-6 w-6 text-primary"/> Production Companies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {movie.production_companies.map(company => (
                      company.logo_path ? (
                        <div key={company.id} className="flex flex-col items-center text-center p-2 bg-card-foreground/5 rounded-md">
                          <div className="relative w-full h-16 mb-2">
                             <Image 
                                src={getFullImagePath(company.logo_path, 'w200')} 
                                alt={company.name} 
                                fill
                                className="object-contain"
                                data-ai-hint="company logo"
                                sizes="100px"
                              />
                          </div>
                          <p className="text-xs text-muted-foreground">{company.name}</p>
                        </div>
                      ) : (
                        <div key={company.id} className="flex flex-col items-center justify-center text-center p-2 bg-card-foreground/5 rounded-md min-h-[6rem]">
                          <UsersIcon className="h-8 w-8 text-muted-foreground mb-1"/>
                          <p className="text-xs text-muted-foreground">{company.name}</p>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </MovieClientContent>
    </div>
  );
}
