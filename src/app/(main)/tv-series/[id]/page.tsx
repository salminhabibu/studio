
'use client';
// src/app/(main)/tv-series/[id]/page.tsx
import { getTvSeriesDetails, getTvSeasonDetails, getFullImagePath } from "@/lib/tmdb";
import type { TMDBTVSeries, TMDBSeason, TMDBEpisode, TMDBVideo } from "@/types/tmdb";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CalendarDaysIcon, Tv2Icon, InfoIcon, UsersIcon, ExternalLinkIcon, StarIcon, HashIcon, ClapperboardIcon, PlayCircleIcon } from "lucide-react";
import Link from "next/link";
import { DownloadSeasonButton } from "@/components/features/tv-series/DownloadSeasonButton";
import { DownloadEpisodeButton } from "@/components/features/tv-series/DownloadEpisodeButton";
import { DownloadAllSeasonsWithOptionsButton } from "@/components/features/tv-series/DownloadAllSeasonsWithOptionsButton";
import { useEffect, useState } from "react";
import { useParams } from 'next/navigation';

// SeasonAccordionItem remains a client component to handle its own state and children client components
function SeasonAccordionItem({ seriesId, season, initialOpen }: { seriesId: number | string; season: TMDBSeason, initialOpen?: boolean }) {
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(initialOpen || false);

  useEffect(() => {
    async function fetchEpisodes() {
      if (isOpen && season.episode_count > 0 && episodes.length === 0 && !isLoading) {
        setIsLoading(true);
        setError(null);
        try {
          const seasonDetails = await getTvSeasonDetails(seriesId, season.season_number);
          setEpisodes(seasonDetails.episodes);
        } catch (e) {
          console.error(`Failed to fetch episodes for season ${season.season_number}:`, e);
          setError("Could not load episodes for this season.");
        } finally {
          setIsLoading(false);
        }
      }
    }
    fetchEpisodes();
  }, [isOpen, seriesId, season, episodes.length, isLoading]);

  return (
    <AccordionItem value={`season-${season.season_number}`} className="border-b border-border/30 last:border-b-0">
      <AccordionTrigger 
        className="py-4 px-3 sm:px-4 hover:bg-muted/30 transition-colors w-full text-left group data-[state=open]:bg-muted/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center w-full gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {season.poster_path ? (
              <div className="relative w-12 h-[72px] rounded overflow-hidden flex-shrink-0 shadow-md bg-muted">
                <Image src={getFullImagePath(season.poster_path, "w154")} alt={season.name} fill className="object-cover" data-ai-hint="season poster"/>
              </div>
            ) : (
              <div className="w-12 h-[72px] rounded bg-muted flex items-center justify-center flex-shrink-0 shadow-inner">
                <ClapperboardIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-md sm:text-lg font-semibold group-hover:text-primary transition-colors truncate" title={season.name}>{season.name}</h4>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {season.episode_count} Episode{season.episode_count !== 1 ? 's' : ''}
                {season.air_date && ` • Aired: ${new Date(season.air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}`}
              </p>
            </div>
          </div>
          <DownloadSeasonButton seriesId={seriesId} seasonNumber={season.season_number} seasonName={season.name} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="bg-card/50">
        <div className="p-2 sm:p-3 space-y-2">
          {isLoading && <p className="text-muted-foreground p-3 text-center text-sm">Loading episodes...</p>}
          {error && <p className="text-destructive p-4 text-center">{error}</p>}
          {!isLoading && !error && episodes.length === 0 && season.episode_count > 0 && (
            <p className="text-muted-foreground p-3 text-center text-sm">No episodes found for this season, or data is unavailable.</p>
          )}
          {!isLoading && !error && episodes.map((episode) => (
            <Card key={episode.id} className="overflow-hidden shadow-sm bg-card hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {episode.still_path && (
                  <div className="relative w-full sm:w-32 md:w-36 aspect-[16/9] rounded overflow-hidden flex-shrink-0 bg-muted shadow-inner">
                    <Image src={getFullImagePath(episode.still_path, "w300")} alt={`Still from ${episode.name}`} fill className="object-cover" data-ai-hint="episode still" />
                  </div>
                )}
                 {!episode.still_path && (
                  <div className="w-full sm:w-32 md:w-36 aspect-[16/9] rounded bg-muted flex items-center justify-center flex-shrink-0 shadow-inner">
                    <ClapperboardIcon className="w-8 h-8 text-muted-foreground/70" />
                  </div>
                )}
                <div className="flex-grow min-w-0">
                  <h5 className="font-semibold text-sm sm:text-base truncate" title={episode.name}>
                    S{String(episode.season_number).padStart(2, '0')}E{String(episode.episode_number).padStart(2, '0')}: {episode.name}
                  </h5>
                  {episode.air_date && <p className="text-xs text-muted-foreground mb-1">Aired: {new Date(episode.air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>}
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">{episode.overview || "No overview available."}</p>
                </div>
                <DownloadEpisodeButton
                  seriesId={seriesId}
                  seasonNumber={episode.season_number}
                  episodeNumber={episode.episode_number}
                  episodeName={episode.name}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}


export default function TvSeriesDetailsPage() {
  const routeParams = useParams<{ id: string }>();
  const id = routeParams.id;

  const [series, setSeries] = useState<TMDBTVSeries | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setIsLoading(false);
        setError("Series ID not found in URL.");
        return;
      }
      setIsLoading(true);
      try {
        const seriesData = await getTvSeriesDetails(id);
        setSeries(seriesData);

        const videos: TMDBVideo[] = seriesData.videos?.results || [];
        const officialTrailer = videos.find(
          (video) => video.site === "YouTube" && video.type === "Trailer" && video.official
        ) || videos.find( 
          (video) => video.site === "YouTube" && video.type === "Trailer"
        );
        setTrailerKey(officialTrailer?.key || null);

      } catch (e) {
        console.error(`Failed to fetch TV series details for ID ${id}:`, e);
        setError("Could not load TV series details. Please try again later or check if the series ID is correct.");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) {
      fetchData();
    }
  }, [id]);
  

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
        <Tv2Icon className="w-24 h-24 text-primary animate-pulse mb-6" />
        <h1 className="text-3xl font-bold mb-3">Loading Series Details...</h1>
        <p className="text-muted-foreground max-w-md">Please wait while we fetch the information.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
        <Tv2Icon className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-destructive mb-3">Error Loading Series Details</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button asChild variant="outline" className="mt-8 text-lg px-6 py-3">
          <Link href="/tv-series">Back to TV Series</Link>
        </Button>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
        <Tv2Icon className="w-24 h-24 text-muted-foreground/70 mb-6" />
        <h1 className="text-3xl font-bold mb-3">TV Series Not Found</h1>
        <p className="text-muted-foreground max-w-md">The TV series you are looking for could not be found.</p>
         <Button asChild variant="outline" className="mt-8 text-lg px-6 py-3">
          <Link href="/tv-series">Back to TV Series</Link>
        </Button>
      </div>
    );
  }
  
  const sortedSeasons = (series.seasons || [])
    .filter(s => s.season_number > 0 || (s.season_number === 0 && s.episode_count > 0)) 
    .sort((a, b) => a.season_number - b.season_number);

  const firstAiringSeason = sortedSeasons.find(s => s.season_number > 0 && s.episode_count > 0);
  const defaultAccordionValue = firstAiringSeason 
    ? `season-${firstAiringSeason.season_number}` 
    : (sortedSeasons.length > 0 && sortedSeasons[0].episode_count > 0 ? `season-${sortedSeasons[0].season_number}` : undefined);


  return (
    <div className="container mx-auto py-6 sm:py-8 px-2 sm:px-4">
      {/* Hero section */}
      <div className="relative h-[45vh] sm:h-[50vh] md:h-[60vh] min-h-[280px] sm:min-h-[350px] md:min-h-[400px] rounded-lg sm:rounded-xl overflow-hidden shadow-2xl group mb-6 sm:mb-8">
        <Image
          src={getFullImagePath(series.backdrop_path, "original")}
          alt={`${series.name} backdrop`}
          fill
          className="object-cover object-center sm:object-top transition-transform duration-500 ease-in-out group-hover:scale-105"
          priority
          data-ai-hint="tv series backdrop"
          sizes="(max-width: 768px) 100vw, 80vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-8 z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
            {series.name}
          </h1>
          {series.tagline && (
            <p className="text-md sm:text-lg md:text-xl text-muted-foreground italic mt-1 max-w-xl shadow-black [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">
              {series.tagline}
            </p>
          )}
           {trailerKey && (
            <Button
              size="lg"
              className="mt-2 sm:mt-3 h-11 px-5 sm:h-12 sm:px-7 text-base sm:text-lg group/button self-start animate-fade-in-up"
              onClick={() => setIsTrailerModalOpen(true)}
            >
              <PlayCircleIcon className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover/button:scale-110" />
              Watch Trailer
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6 sm:gap-8">
        {/* Left column - Poster and Download All button */}
        <div className="md:col-span-4 lg:col-span-3">
          <Card className="overflow-hidden shadow-xl sticky top-20 sm:top-24">
            <div className="aspect-[2/3] relative w-full bg-muted">
              <Image
                src={getFullImagePath(series.poster_path, "w500")}
                alt={`${series.name} poster`}
                fill
                className="object-cover"
                data-ai-hint="tv series poster"
                sizes="(max-width: 767px) 100vw, (max-width: 1023px) 33vw, 25vw"
              />
            </div>
             <CardContent className="p-3 sm:p-4 space-y-3">
                <DownloadAllSeasonsWithOptionsButton seriesId={series.id} seriesName={series.name} />
                {series.homepage && (
                <Button variant="outline" className="w-full h-11 text-sm" asChild>
                  <Link href={series.homepage} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon className="mr-2 h-4 w-4" /> Visit Homepage
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Details and Seasons */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6 sm:space-y-8">
          <Card className="shadow-lg border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl sm:text-2xl gap-2"><InfoIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary"/> Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80 leading-relaxed text-sm sm:text-base">{series.overview || "No overview available."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {series.genres.map(genre => (
                  <Badge key={genre.id} variant="secondary" className="text-xs sm:text-sm px-2.5 py-1">{genre.name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl sm:text-2xl gap-2"><Tv2Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary"/> Series Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5 text-sm sm:text-base">
              {[
                { icon: CalendarDaysIcon, label: "First Aired", value: series.first_air_date ? new Date(series.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
                { icon: HashIcon, label: "Seasons", value: series.number_of_seasons },
                { icon: HashIcon, label: "Total Episodes", value: series.number_of_episodes },
                { icon: StarIcon, label: "Rating", value: series.vote_average > 0 ? `${series.vote_average.toFixed(1)} / 10` : 'N/A' },
                { icon: ClapperboardIcon, label: "Status", value: series.status || 'N/A' },
                ...(series.created_by && series.created_by.length > 0 ? [{ icon: UsersIcon, label: "Created By", value: series.created_by.map(creator => creator.name).join(', ')}] : [])
              ].map(detail => (
                <div key={detail.label} className="flex items-start space-x-2.5">
                  <detail.icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{detail.label}</p>
                    <p className="text-muted-foreground">{String(detail.value)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {sortedSeasons && sortedSeasons.length > 0 && (
            <Card className="shadow-lg border-border/40 overflow-hidden">
              <CardHeader className="bg-card/30 border-b border-border/30">
                <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center">
                  <ClapperboardIcon className="mr-2.5 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Seasons & Episodes
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Browse and download episodes by season. Click a season to expand.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                 <Accordion type="single" collapsible defaultValue={defaultAccordionValue} className="w-full">
                  {sortedSeasons.map(season => (
                    <SeasonAccordionItem 
                        key={season.id} 
                        seriesId={series!.id} 
                        season={season} 
                        initialOpen={defaultAccordionValue === `season-${season.season_number}`}
                    />
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
           
          {series.production_companies && series.production_companies.length > 0 && (
            <Card className="shadow-lg border-border/40">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl sm:text-2xl gap-2"><UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary"/> Production Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {series.production_companies.filter(c => c.logo_path || c.name).map(company => (
                    company.logo_path ? (
                      <div key={company.id} className="flex flex-col items-center text-center p-2 bg-card-foreground/5 rounded-md aspect-[3/2] justify-center">
                         <div className="relative w-full h-12 sm:h-16 mb-1.5">
                           <Image 
                              src={getFullImagePath(company.logo_path, 'w200')} 
                              alt={company.name} 
                              fill
                              className="object-contain"
                              data-ai-hint="company logo"
                              sizes="80px"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{company.name}</p>
                      </div>
                    ) : (
                      <div key={company.id} className="flex flex-col items-center justify-center text-center p-2 bg-card-foreground/5 rounded-md aspect-[3/2] min-h-[5rem] sm:min-h-[6rem]">
                        <UsersIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/70 mb-1"/>
                        <p className="text-xs text-muted-foreground line-clamp-2">{company.name}</p>
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

