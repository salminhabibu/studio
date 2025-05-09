// src/app/(main)/tv-series/[id]/page.tsx
import { getTvSeriesDetails, getTvSeasonDetails, getFullImagePath } from "@/lib/tmdb";
import type { TMDBTVSeries, TMDBSeason, TMDBEpisode } from "@/types/tmdb";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CalendarDaysIcon, DownloadIcon, Tv2Icon, InfoIcon, UsersIcon, ExternalLinkIcon, StarIcon, HashIcon, ClapperboardIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { DownloadSeasonButton } from "@/components/features/tv-series/DownloadSeasonButton";
import { DownloadEpisodeButton } from "@/components/features/tv-series/DownloadEpisodeButton";

interface TvSeriesDetailsPageProps {
  params: { id: string };
}

async function SeasonAccordionItem({ seriesId, season }: { seriesId: number | string; season: TMDBSeason }) {
  let episodes: TMDBEpisode[] = [];
  let error: string | null = null;

  try {
    // Only fetch episodes if season number is greater than 0 (actual seasons, not specials)
    // or if it's season 0 (specials) and has episodes.
    if (season.season_number > 0 || (season.season_number === 0 && season.episode_count > 0)) {
      const seasonDetails = await getTvSeasonDetails(seriesId, season.season_number);
      episodes = seasonDetails.episodes;
    }
  } catch (e) {
    console.error(`Failed to fetch episodes for season ${season.season_number}:`, e);
    error = "Could not load episodes for this season.";
  }

  return (
    <AccordionItem value={`season-${season.season_number}`} className="border-b border-border/30">
      <AccordionTrigger className="py-4 px-6 hover:bg-muted/30 transition-colors w-full text-left group">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            {season.poster_path ? (
              <div className="relative w-12 h-18 rounded overflow-hidden flex-shrink-0">
                <Image src={getFullImagePath(season.poster_path, "w92")} alt={season.name} fill className="object-cover" data-ai-hint="season poster"/>
              </div>
            ) : (
              <div className="w-12 h-18 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <ClapperboardIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold group-hover:text-primary transition-colors">{season.name}</h4>
              <p className="text-sm text-muted-foreground">
                {season.episode_count} Episode{season.episode_count !== 1 ? 's' : ''}
                {season.air_date && ` • Aired: ${new Date(season.air_date).getFullYear()}`}
              </p>
            </div>
          </div>
          <DownloadSeasonButton seriesId={seriesId} seasonNumber={season.season_number} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="bg-background/30">
        <div className="p-2 sm:p-4 space-y-3">
          {error && <p className="text-destructive p-4 text-center">{error}</p>}
          {!error && episodes.length === 0 && (season.season_number > 0 || (season.season_number === 0 && season.episode_count > 0)) && (
            <p className="text-muted-foreground p-4 text-center">No episodes found for this season, or data is unavailable.</p>
          )}
          {!error && episodes.map((episode) => (
            <Card key={episode.id} className="overflow-hidden shadow-md bg-card hover:bg-card/90">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {episode.still_path && (
                  <div className="relative w-full sm:w-32 md:w-40 aspect-video rounded overflow-hidden flex-shrink-0">
                    <Image src={getFullImagePath(episode.still_path, "w300")} alt={`Still from ${episode.name}`} fill className="object-cover" data-ai-hint="episode still" />
                  </div>
                )}
                <div className="flex-grow">
                  <h5 className="font-semibold text-md">
                    S{String(episode.season_number).padStart(2, '0')}E{String(episode.episode_number).padStart(2, '0')}: {episode.name}
                  </h5>
                  {episode.air_date && <p className="text-xs text-muted-foreground mb-1">Aired: {new Date(episode.air_date).toLocaleDateString()}</p>}
                  <p className="text-sm text-muted-foreground line-clamp-2">{episode.overview}</p>
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


export default async function TvSeriesDetailsPage({ params }: TvSeriesDetailsPageProps) {
  let series: TMDBTVSeries | null = null;
  let error: string | null = null;

  try {
    series = await getTvSeriesDetails(params.id);
  } catch (e) {
    console.error(`Failed to fetch TV series details for ID ${params.id}:`, e);
    error = "Could not load TV series details. Please try again later or check if the series ID is correct.";
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <Tv2Icon className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-destructive mb-3">Error Loading Series Details</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/tv-series">Back to TV Series</Link>
        </Button>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <Tv2Icon className="w-24 h-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-3">TV Series Not Found</h1>
        <p className="text-muted-foreground max-w-md">The TV series you are looking for could not be found.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/tv-series">Back to TV Series</Link>
        </Button>
      </div>
    );
  }
  
  const sortedSeasons = series.seasons?.sort((a, b) => a.season_number - b.season_number) || [];
  const defaultAccordionValue = sortedSeasons.find(s => s.season_number > 0) ? `season-${sortedSeasons.find(s => s.season_number > 0)!.season_number}` : (sortedSeasons.length > 0 ? `season-${sortedSeasons[0].season_number}` : undefined);


  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="relative h-[60vh] min-h-[300px] md:min-h-[400px] lg:min-h-[500px] rounded-xl overflow-hidden shadow-2xl group mb-8">
        <Image
          src={getFullImagePath(series.backdrop_path, "original")}
          alt={`${series.name} backdrop`}
          fill
          className="object-cover object-top transition-transform duration-500 ease-in-out group-hover:scale-105"
          priority
          data-ai-hint="tv series backdrop"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-10">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
            {series.name}
          </h1>
          {series.tagline && (
            <p className="text-lg md:text-xl text-muted-foreground italic mt-1 shadow-black [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">
              {series.tagline}
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        <div className="md:col-span-4 lg:col-span-3">
          <Card className="overflow-hidden shadow-xl sticky top-24">
            <div className="aspect-[2/3] relative w-full">
              <Image
                src={getFullImagePath(series.poster_path, "w500")}
                alt={`${series.name} poster`}
                fill
                className="object-cover"
                data-ai-hint="tv series poster"
              />
            </div>
             <CardContent className="p-4">
                <Button size="lg" className="w-full mt-2">
                    <DownloadIcon className="mr-2 h-5 w-5" /> Download All Seasons
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">More download options coming soon.</p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8 lg:col-span-9 space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><InfoIcon className="h-6 w-6 text-primary"/> Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80 leading-relaxed">{series.overview}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {series.genres.map(genre => (
                  <Badge key={genre.id} variant="secondary" className="text-sm px-3 py-1">{genre.name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Tv2Icon className="h-6 w-6 text-primary"/> Series Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start space-x-3">
                <CalendarDaysIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">First Aired</p>
                  <p className="text-muted-foreground">{series.first_air_date ? new Date(series.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <HashIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Seasons</p>
                  <p className="text-muted-foreground">{series.number_of_seasons}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <HashIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Total Episodes</p>
                  <p className="text-muted-foreground">{series.number_of_episodes}</p>
                </div>
              </div>
               <div className="flex items-start space-x-3">
                <StarIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Rating</p>
                  <p className="text-muted-foreground">{series.vote_average > 0 ? `${series.vote_average.toFixed(1)} / 10` : 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <ClapperboardIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Status</p>
                  <p className="text-muted-foreground">{series.status || 'N/A'}</p>
                </div>
              </div>
               {series.created_by && series.created_by.length > 0 && (
                <div className="flex items-start space-x-3">
                    <UsersIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Created By</p>
                        <p className="text-muted-foreground">{series.created_by.map(creator => creator.name).join(', ')}</p>
                    </div>
                </div>
                )}
                 {series.homepage && (
                  <div className="flex items-start space-x-3 sm:col-span-2 lg:col-span-1">
                    <ExternalLinkIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Homepage</p>
                      <Link href={series.homepage} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                        {series.homepage}
                      </Link>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {sortedSeasons && sortedSeasons.length > 0 && (
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-card/50 border-b border-border/30">
                <CardTitle className="text-2xl font-semibold flex items-center">
                  <ClapperboardIcon className="mr-3 h-6 w-6 text-primary" />
                  Seasons & Episodes
                </CardTitle>
                <CardDescription>Browse and download episodes by season.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="single" collapsible defaultValue={defaultAccordionValue} className="w-full">
                  {sortedSeasons.map(season => (
                    <SeasonAccordionItem key={season.id} seriesId={series!.id} season={season} />
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
           
          {series.production_companies && series.production_companies.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UsersIcon className="h-6 w-6 text-primary"/> Production Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {series.production_companies.map(company => (
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
