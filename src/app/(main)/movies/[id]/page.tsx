// src/app/(main)/movies/[id]/page.tsx
import { getMovieDetails, getFullImagePath } from "@/lib/tmdb";
import type { TMDBMovie } from "@/types/tmdb";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDaysIcon, ClockIcon, DownloadIcon, FilmIcon, DollarSignIcon, GlobeIcon, InfoIcon, UsersIcon, ExternalLinkIcon, StarIcon } from "lucide-react";
import Link from "next/link";

interface MovieDetailsPageProps {
  params: { id: string };
}

export default async function MovieDetailsPage({ params }: MovieDetailsPageProps) {
  let movie: TMDBMovie | null = null;
  let error: string | null = null;

  try {
    movie = await getMovieDetails(params.id);
  } catch (e) {
    console.error(`Failed to fetch movie details for ID ${params.id}:`, e);
    error = "Could not load movie details. Please try again later or check if the movie ID is correct.";
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
    // This case should ideally be caught by error handling, but as a fallback:
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

  const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "4K (UHD)", "2K (QHD)"];

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="relative h-[60vh] min-h-[300px] md:min-h-[400px] lg:min-h-[500px] rounded-xl overflow-hidden shadow-2xl group mb-8">
        <Image
          src={getFullImagePath(movie.backdrop_path, "original")}
          alt={`${movie.title} backdrop`}
          fill
          className="object-cover object-top transition-transform duration-500 ease-in-out group-hover:scale-105"
          priority
          data-ai-hint="movie backdrop"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-10">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
            {movie.title}
          </h1>
          {movie.tagline && (
            <p className="text-lg md:text-xl text-muted-foreground italic mt-1 shadow-black [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">
              {movie.tagline}
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        <div className="md:col-span-4 lg:col-span-3">
          <Card className="overflow-hidden shadow-xl sticky top-24">
            <div className="aspect-[2/3] relative w-full bg-muted">
              <Image
                src={getFullImagePath(movie.poster_path, "w500")}
                alt={`${movie.title} poster`}
                fill
                className="object-cover"
                data-ai-hint="movie poster"
              />
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-1">Download Movie</h3>
                <Select defaultValue={qualities[0]}>
                  <SelectTrigger className="w-full h-11 text-sm">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {qualities.map(quality => (
                      <SelectItem key={quality} value={quality} className="text-sm">{quality}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="lg" className="w-full mt-2 h-12">
                  <DownloadIcon className="mr-2 h-5 w-5" /> Download
                </Button>
              </div>
              {movie.homepage && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={movie.homepage} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon className="mr-2 h-4 w-4" /> Visit Homepage
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
}

