// src/app/(main)/movies/[id]/page.tsx
"use client";

import { getMovieDetails, getFullImagePath } from "@/lib/tmdb";
import type { TMDBMovie, TMDBVideo } from "@/types/tmdb";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CalendarDaysIcon, ClockIcon, DownloadIcon, FilmIcon, DollarSignIcon, GlobeIcon, InfoIcon, UsersIcon, ExternalLinkIcon, StarIcon, PlayCircleIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function MovieDetailsPage() {
  const params = useParams<{ id: string }>();
  const [movie, setMovie] = useState<TMDBMovie | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params.id) {
        setError("Movie ID not found.");
        setIsLoading(false);
        return;
    }

    async function fetchMovieData() {
      setIsLoading(true);
      try {
        const movieData = await getMovieDetails(params.id);
        setMovie(movieData);

        const videos: TMDBVideo[] = movieData.videos?.results || [];
        const officialTrailer = videos.find(
          (video) => video.site === "YouTube" && video.type === "Trailer" && video.official
        ) || videos.find( 
          (video) => video.site === "YouTube" && video.type === "Trailer"
        );
        setTrailerKey(officialTrailer?.key || null);

      } catch (e) {
        console.error(`Failed to fetch movie details for ID ${params.id}:`, e);
        setError("Could not load movie details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMovieData();
  }, [params.id]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
        <FilmIcon className="w-24 h-24 text-primary animate-pulse mb-6" />
        <h1 className="text-3xl font-bold mb-3">Loading Movie Details...</h1>
        <p className="text-muted-foreground max-w-md">Please wait while we fetch the information.</p>
      </div>
    );
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
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-10 z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
            {movie.title}
          </h1>
          {movie.tagline && (
            <p className="text-lg md:text-xl text-muted-foreground italic mt-1 shadow-black [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">
              {movie.tagline}
            </p>
          )}
          {trailerKey && (
            <Button
              size="lg"
              className="mt-4 h-12 px-6 sm:h-14 sm:px-8 text-base sm:text-lg group/button animate-fade-in-up"
              onClick={() => setIsTrailerModalOpen(true)}
            >
              <PlayCircleIcon className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover/button:scale-110" />
              Watch Trailer
            </Button>
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
                sizes="(max-width: 767px) 100vw, (max-width: 1023px) 33vw, 25vw"
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
      <Dialog open={isTrailerModalOpen} onOpenChange={setIsTrailerModalOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] p-0 border-0 bg-black/90 backdrop-blur-md aspect-video rounded-lg overflow-hidden">
          {trailerKey && (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          )}
        </DialogContent>
      </Dialog>
       <style jsx global>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0; /* Start hidden for animation */
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
