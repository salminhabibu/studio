// src/app/[locale]/(main)/movies/[id]/page.tsx
import { getMovieDetails, getFullImagePath } from "@/lib/tmdb";
import type { TMDBMovie, TMDBVideo } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDaysIcon, ClockIcon, FilmIcon, DollarSignIcon, GlobeIcon, InfoIcon, UsersIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { MovieClientContent } from "@/components/features/movies/MovieClientContent";
import { MovieDownloadCard } from "@/components/features/movies/MovieDownloadCard";
import { RecommendedMoviesSection } from "@/components/features/movies/RecommendedMoviesSection";
import { Separator } from "@/components/ui/separator";
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary';
import { Suspense, useState } from "react"; // Added useState
import type { TorrentFindResultItem } from '@/types/torrent'; // Added TorrentFindResultItem
import { Skeleton } from "@/components/ui/skeleton";

interface MovieDetailsPageProps {
  params: { id: string; locale: Locale };
}

async function MovieDetailsContent({ id, locale }: { id: string; locale: Locale }) {
  const dictionary = await getDictionary(locale);
  const t = dictionary.movieDetailsPage;

  // Use a local state for movieTorrentOptions within the async component.
  // This will be passed down. For client-side interactions, state is managed in client components.
  let movieTorrentOptions: TorrentFindResultItem[] = [];

  let movie: TMDBMovie | null = null; // Removed magnetLink and torrentQuality from here
  let trailerKey: string | null = null;
  let error: string | null = null;

  if (!id) {
    error = t.errorIdNotFound;
  } else {
    try {
      const movieData = await getMovieDetails(id);
      movie = movieData;

      const videos: TMDBVideo[] = movieData.videos?.results || [];
      const officialTrailer = videos.find(
        (video) => video.site === "YouTube" && video.type === "Trailer" && video.official
      ) || videos.find(
        (video) => video.site === "YouTube" && video.type === "Trailer"
      );
      trailerKey = officialTrailer?.key || null;

      // --- Fetch Torrent Data ---
      if (movie) { // Ensure movie data was fetched successfully
        try {
          const torrentResponse = await fetch('/api/torrents/find', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: movie.title,
              imdbId: movie.imdb_id,
              tmdbId: movie.id.toString(),
              type: 'movie',
            }),
          });

          if (torrentResponse.ok) {
            const torrentData = await torrentResponse.json();
            if (torrentData.results && torrentData.results.length > 0) {
              movieTorrentOptions = torrentData.results; // Store all results
            } else {
              console.log(`No torrents found for movie: ${movie.title}`);
              movieTorrentOptions = []; // Ensure it's an empty array
            }
          } else {
            const errorText = await torrentResponse.text();
            console.error(`Failed to fetch torrents for ${movie.title}: ${torrentResponse.status} - ${errorText}`);
          }
        } catch (torrentError) {
          console.error(`Error fetching or processing torrents for ${movie.title}:`, torrentError);
          // Do not set page-level 'error', as torrents are secondary.
        }
      }
      // --- End Fetch Torrent Data ---

    } catch (e) {
      console.error(`Failed to fetch movie details for ID ${id}:`, e);
      error = t.errorCouldNotLoad;
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <FilmIcon className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-destructive mb-3">{t.errorLoadingTitle}</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={`/${locale}/movies`}>{t.backToMoviesButton}</Link>
        </Button>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <FilmIcon className="w-24 h-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-3">{t.movieNotFoundTitle}</h1>
        <p className="text-muted-foreground max-w-md">{t.movieNotFoundDescription}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={`/${locale}/movies`}>{t.backToMoviesButton}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <MovieClientContent movie={movie} trailerKey={trailerKey} dictionary={t.clientContent}>
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <MovieDownloadCard 
              movieId={movie.id.toString()} // Added movieId prop
              movieTitle={movie.title}
              moviePosterPath={movie.poster_path}
              movieHomepage={movie.homepage}
              torrentOptions={movieTorrentOptions} 
              dictionary={t.downloadCard} 
              locale={locale} 
            />
          </div>

          <div className="md:col-span-8 lg:col-span-9 space-y-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><InfoIcon className="h-6 w-6 text-primary"/> {t.overview.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 leading-relaxed">{movie.overview || t.overview.noOverview}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {movie.genres.map(genre => (
                    <Badge key={genre.id} variant="secondary" className="text-sm px-3 py-1">{genre.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
               <CardHeader>
                <CardTitle className="flex items-center gap-2"><FilmIcon className="h-6 w-6 text-primary"/> {t.details.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start space-x-3">
                  <CalendarDaysIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{t.details.releaseDate}</p>
                    <p className="text-muted-foreground">{movie.release_date ? new Date(movie.release_date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : t.na}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{t.details.runtime}</p>
                    <p className="text-muted-foreground">{movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : t.na}</p>
                  </div>
                </div>
                 <div className="flex items-start space-x-3">
                  <StarIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{t.details.rating}</p>
                    <p className="text-muted-foreground">{movie.vote_average > 0 ? `${movie.vote_average.toFixed(1)} / 10` : t.na}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <DollarSignIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{t.details.budget}</p>
                    <p className="text-muted-foreground">{movie.budget ? `$${movie.budget.toLocaleString()}` : t.na}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <DollarSignIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{t.details.revenue}</p>
                    <p className="text-muted-foreground">{movie.revenue ? `$${movie.revenue.toLocaleString()}` : t.na}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <GlobeIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{t.details.status}</p>
                    <p className="text-muted-foreground">{movie.status || t.na}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {movie.production_companies && movie.production_companies.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UsersIcon className="h-6 w-6 text-primary"/> {t.production.title}</CardTitle>
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
      <Separator className="my-8 md:my-12" />
      <RecommendedMoviesSection movieId={movie.id} locale={locale}/>
    </div>
  );
}

function MovieDetailsPageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-0 animate-pulse">
      {/* Hero Skeleton */}
      <Skeleton className="h-[60vh] min-h-[300px] md:min-h-[400px] lg:min-h-[500px] rounded-xl mb-8" />
      <div className="grid md:grid-cols-12 gap-8">
        {/* Download Card Skeleton */}
        <div className="md:col-span-4 lg:col-span-3">
          <Card className="overflow-hidden shadow-xl">
            <Skeleton className="aspect-[2/3] w-full" />
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-6 w-1/2 mb-1" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-px w-full my-2" />
              <Skeleton className="h-5 w-1/3 mb-1" />
              <Skeleton className="h-10 w-full mb-1" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-10 w-full mt-2" />
            </CardContent>
          </Card>
        </div>
        {/* Main Content Skeletons */}
        <div className="md:col-span-8 lg:col-span-9 space-y-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-lg">
              <CardHeader>
                <Skeleton className="h-8 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Separator className="my-8 md:my-12" />
      {/* Recommended Section Skeleton */}
      <Card className="shadow-lg mt-8">
        <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
        <CardContent>
          <div className="flex space-x-4 overflow-x-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-40 md:w-48">
                <Skeleton className="aspect-[2/3] w-full rounded-md" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <Skeleton className="h-3 w-1/2 mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default async function MovieDetailsPage({ params }: MovieDetailsPageProps) {
  return (
    <Suspense fallback={<MovieDetailsPageSkeleton />}>
      <MovieDetailsContent id={params.id} locale={params.locale} />
    </Suspense>
  )
}