// src/app/[locale]/(main)/tv-series/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, use } from 'react';
import { getTvSeriesDetails, getFullImagePath, getTvSeasonDetails } from "@/lib/tmdb"; // Added getTvSeasonDetails
import type { TMDBTVSeries, TMDBSeason, TMDBVideo, TMDBEpisode } from "@/types/tmdb"; // Added TMDBEpisode
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion } from "@/components/ui/accordion";
import { CalendarDaysIcon, Tv2Icon, InfoIcon, UsersIcon, ExternalLinkIcon, StarIcon, HashIcon, ClapperboardIcon, Loader2Icon, AlertTriangleIcon } from "lucide-react"; // Added AlertTriangleIcon
import Link from "next/link";
import type { TorrentFindResultItem } from '@/types/torrent'; // Assuming this is the correct path and type

import { DownloadAllSeasonsWithOptionsButton } from "@/components/features/tv-series/DownloadAllSeasonsWithOptionsButton";
import { SeasonAccordionItem } from "@/components/features/tv-series/SeasonAccordionItem";
import { TVSeriesClientContent } from "@/components/features/tv-series/TVSeriesClientContent";
import { RecommendedTvSeriesSection } from "@/components/features/tv-series/RecommendedTvSeriesSection";
import { Separator } from "@/components/ui/separator";
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary';

// Augment TMDBEpisode to include torrentOptions
interface EpisodeWithTorrents extends TMDBEpisode {
  torrentOptions?: TorrentFindResultItem[];
}

interface SeasonWithEpisodesAndTorrents extends TMDBSeason {
  episodes: EpisodeWithTorrents[];
}

interface TvSeriesDetailsPageProps {
  params: Promise<{ id: string; locale: Locale }>;
}

export default function TvSeriesDetailsPage(props: TvSeriesDetailsPageProps) {
  const resolvedParams = use(props.params);
  const { id, locale } = resolvedParams;

  const [series, setSeries] = useState<TMDBTVSeries | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dictionary, setDictionary] = useState<any>(null);

  const [seasonPackResults, setSeasonPackResults] = useState<Map<number, TorrentFindResultItem[]>>(new Map());
  const [isLoadingTorrents, setIsLoadingTorrents] = useState(false);
  const [torrentError, setTorrentError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDict = async () => {
      if (locale) {
        const dict = await getDictionary(locale);
        setDictionary(dict.tvSeriesDetailsPage);
      }
    };
    fetchDict();
  }, [locale]);

  const fetchData = useCallback(async () => {
    if (!id) {
      setError(dictionary?.errorIdNotFound || "Series ID not found in URL.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setTorrentError(null);

    try {
      const seriesData = await getTvSeriesDetails(id);
      setSeries(seriesData); // Set initial series data

      const videos: TMDBVideo[] = seriesData.videos?.results || [];
      const officialTrailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official) || videos.find(v => v.site === "YouTube" && v.type === "Trailer");
      setTrailerKey(officialTrailer?.key || null);

      // Start fetching torrents
      if (seriesData && seriesData.seasons && seriesData.seasons.length > 0) {
        setIsLoadingTorrents(true);
        const newSeasonPackResults = new Map<number, TorrentFindResultItem[]>();

        const seasonsWithEpisodesAndTorrents = await Promise.all(
          seriesData.seasons
            .filter(s => s.season_number > 0 || (s.season_number === 0 && s.episode_count > 0)) // Filter out "Specials" unless they have episodes
            .map(async (seasonSummary) => {
              try {
                // Fetch season pack torrents
                const seasonPackResponse = await fetch('/api/torrents/find', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    query: seriesData.name,
                    type: 'tv',
                    season: seasonSummary.season_number,
                  }),
                });
                if (seasonPackResponse.ok) {
                  const seasonPackData = await seasonPackResponse.json();
                  newSeasonPackResults.set(seasonSummary.season_number, seasonPackData.results || []);
                } else {
                  console.warn(`Failed to fetch season pack for S${seasonSummary.season_number}: ${seasonPackResponse.status}`);
                  newSeasonPackResults.set(seasonSummary.season_number, []);
                }

                // Fetch detailed season data for episodes
                const detailedSeason = await getTvSeasonDetails(seriesData.id, seasonSummary.season_number);
                const episodesWithTorrents: EpisodeWithTorrents[] = await Promise.all(
                  detailedSeason.episodes.map(async (episode) => {
                    try {
                      const torrentResponse = await fetch('/api/torrents/find', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          query: seriesData.name,
                          type: 'tv',
                          season: episode.season_number,
                          episode: episode.episode_number,
                        }),
                      });
                      if (torrentResponse.ok) {
                        const torrentData = await torrentResponse.json();
                        return { ...episode, torrentOptions: torrentData.results || [] };
                      }
                       console.warn(`Failed to fetch torrents for S${episode.season_number}E${episode.episode_number}: ${torrentResponse.status}`);
                      return { ...episode, torrentOptions: [] };
                    } catch (epTorrentError) {
                      console.error(`Error fetching torrents for S${episode.season_number}E${episode.episode_number}:`, epTorrentError);
                      return { ...episode, torrentOptions: [] }; // Attach empty options on error
                    }
                  })
                );
                return { ...detailedSeason, episodes: episodesWithTorrents }; // Return the detailed season with augmented episodes
              } catch (seasonFetchError) {
                console.error(`Error fetching details or torrents for season ${seasonSummary.season_number}:`, seasonFetchError);
                // Return the summary season with empty episodes/torrents if detailed fetch fails
                return { ...seasonSummary, episodes: [] as EpisodeWithTorrents[] }; 
              }
            })
        );
        
        // Update series state with seasons that now include detailed episodes and their torrents
        setSeries(prevSeries => prevSeries ? { ...prevSeries, seasons: seasonsWithEpisodesAndTorrents as SeasonWithEpisodesAndTorrents[] } : null);
        setSeasonPackResults(newSeasonPackResults);
        setIsLoadingTorrents(false);
      } else {
        setIsLoadingTorrents(false); // No seasons to fetch torrents for
      }

    } catch (e) {
      console.error(`Failed to fetch TV series details for ID ${id}:`, e);
      setError(dictionary?.errorCouldNotLoad || "Could not load TV series details. Please try again or check if the series ID is correct.");
      setIsLoadingTorrents(false);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dictionary]); // dictionary dependency for error messages

  useEffect(() => {
    if (dictionary && id) {
      fetchData();
    }
  }, [fetchData, dictionary, id]);

  if (isLoading || !dictionary || !locale) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
        <Loader2Icon className="w-16 h-16 text-primary animate-spin mb-6" />
        <h1 className="text-2xl font-semibold text-muted-foreground">{dictionary?.loadingText || "Loading Series Details..."}</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
        <Tv2Icon className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-destructive mb-3">{dictionary?.errorLoadingTitle || "Error Loading Series Details"}</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button asChild variant="outline" className="mt-8 text-lg px-6 py-3">
          <Link href={`/${locale}/tv-series`}>{dictionary?.backToTvSeriesButton || "Back to TV Series"}</Link>
        </Button>
      </div>
    );
  }

  if (!series) {
    // This case might be hit briefly if series is null before error is set, or if fetchData fails silently on seriesData
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
        <Tv2Icon className="w-24 h-24 text-muted-foreground/70 mb-6" />
        <h1 className="text-3xl font-bold mb-3">{dictionary?.seriesNotFoundTitle || "TV Series Not Found"}</h1>
        <p className="text-muted-foreground max-w-md">{dictionary?.seriesNotFoundDescription || "The TV series you are looking for could not be found, or an error occurred."}</p>
         <Button asChild variant="outline" className="mt-8 text-lg px-6 py-3">
          <Link href={`/${locale}/tv-series`}>{dictionary?.backToTvSeriesButton || "Back to TV Series"}</Link>
        </Button>
      </div>
    );
  }
  
  // Ensure series.seasons is treated as SeasonWithEpisodesAndTorrents[] for type safety
  const typedSeasons: SeasonWithEpisodesAndTorrents[] = (series.seasons || []) as SeasonWithEpisodesAndTorrents[];
  
  const sortedSeasons = typedSeasons
    .filter(s => s.season_number > 0 || (s.season_number === 0 && s.episode_count > 0)) 
    .sort((a, b) => a.season_number - b.season_number);

  const firstAiringSeason = sortedSeasons.find(s => s.season_number > 0 && s.episode_count > 0);
  const defaultAccordionValue = firstAiringSeason 
    ? `season-${firstAiringSeason.season_number}` 
    : (sortedSeasons.length > 0 && sortedSeasons[0].episode_count > 0 ? `season-${sortedSeasons[0].season_number}` : undefined);

  return (
    <div className="container mx-auto py-6 sm:py-8 px-2 sm:px-4">
      {/* Pass new torrent-related states to TVSeriesClientContent */}
      <TVSeriesClientContent 
        series={series as TMDBTVSeries & { seasons: SeasonWithEpisodesAndTorrents[] }} // Cast for safety, series state is updated
        trailerKey={trailerKey} 
        dictionary={dictionary.clientContent} 
        seasonPackResults={seasonPackResults}
        isLoadingTorrents={isLoadingTorrents}
        torrentError={torrentError}
        locale={locale}
      >
        <div className="grid md:grid-cols-12 gap-6 sm:gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <Card className="overflow-hidden shadow-xl sticky top-20 sm:top-24">
              <div className="aspect-[2/3] relative w-full bg-muted">
                <Image
                  src={getFullImagePath(series.poster_path, "w500")}
                  alt={`${series.name} ${dictionary.posterAltText || "poster"}`}
                  fill
                  className="object-cover"
                  data-ai-hint="tv series poster"
                  sizes="(max-width: 767px) 100vw, (max-width: 1023px) 33vw, 25vw"
                  priority
                />
              </div>
               <CardContent className="p-3 sm:p-4 space-y-3">
                  <DownloadAllSeasonsWithOptionsButton
                    seriesId={series.id}
                    seriesName={series.name} // series.name is fine
                    seriesTitle={series.name} // series.name is fine
                    dictionary={dictionary.downloadAllSeasonsButton}
                    // torrentResults prop will be replaced/updated based on new data structure
                    // This component will need to be adapted to use seasonPackResults
                    allSeasonPackResults={seasonPackResults} // Pass the map
                  />
                  {series.homepage && (
                  <Button variant="outline" className="w-full h-11 text-sm" asChild>
                    <Link href={series.homepage} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon className="mr-2 h-4 w-4" /> {dictionary.visitHomepageButton}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-8 lg:col-span-9 space-y-6 sm:space-y-8">
            {/* Torrent Loading/Error Display Area */}
            {isLoadingTorrents && (
              <Card className="shadow-md border-border/40">
                <CardContent className="p-4 flex items-center justify-center">
                  <Loader2Icon className="w-6 h-6 text-primary animate-spin mr-3" />
                  <p className="text-muted-foreground">{dictionary?.loadingTorrentsText || "Loading torrent information..."}</p>
                </CardContent>
              </Card>
            )}
            {torrentError && !isLoadingTorrents && (
              <Card className="shadow-md border-destructive bg-destructive/10">
                <CardContent className="p-4 flex items-center text-destructive">
                  <AlertTriangleIcon className="w-6 h-6 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{dictionary?.errorTorrentsTitle || "Error Fetching Torrents"}</p>
                    <p className="text-sm">{torrentError}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="shadow-lg border-border/40">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl sm:text-2xl gap-2"><InfoIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary"/> {dictionary.overview.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 leading-relaxed text-sm sm:text-base">{series.overview || dictionary.overview.noOverview}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {series.genres.map(genre => (
                    <Badge key={genre.id} variant="secondary" className="text-xs sm:text-sm px-2.5 py-1">{genre.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-border/40">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl sm:text-2xl gap-2"><Tv2Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary"/> {dictionary.details.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5 text-sm sm:text-base">
                {[
                  { icon: CalendarDaysIcon, label: dictionary.details.firstAired, value: series.first_air_date ? new Date(series.first_air_date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : dictionary.na },
                  { icon: HashIcon, label: dictionary.details.seasons, value: series.number_of_seasons },
                  { icon: HashIcon, label: dictionary.details.totalEpisodes, value: series.number_of_episodes },
                  { icon: StarIcon, label: dictionary.details.rating, value: series.vote_average > 0 ? `${series.vote_average.toFixed(1)} / 10` : dictionary.na },
                  { icon: ClapperboardIcon, label: dictionary.details.status, value: series.status || dictionary.na },
                  ...(series.created_by && series.created_by.length > 0 ? [{ icon: UsersIcon, label: dictionary.details.createdBy, value: series.created_by.map(creator => creator.name).join(', ')}] : [])
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
                    {dictionary.seasonsEpisodes.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{dictionary.seasonsEpisodes.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                   <Accordion type="single" collapsible defaultValue={defaultAccordionValue} className="w-full">
                    {sortedSeasons.map(season => ( // season is now SeasonWithEpisodesAndTorrents
                      <SeasonAccordionItem
                          key={season.id}
                          seriesId={series!.id} // series is guaranteed to be non-null here
                          seriesTitle={series!.name}
                          season={season} // Pass the augmented season object
                          initialOpen={defaultAccordionValue === `season-${season.season_number}`}
                          dictionary={dictionary.seasonAccordionItem}
                          locale={locale}
                          // allSeriesTorrents prop will be replaced with specific season pack torrents
                          seasonPackTorrentOptions={seasonPackResults.get(season.season_number) || []}
                      />
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}
             
            {series.production_companies && series.production_companies.length > 0 && (
              <Card className="shadow-lg border-border/40">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl sm:text-2xl gap-2"><UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary"/> {dictionary.production.title}</CardTitle>
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
      </TVSeriesClientContent>
      <Separator className="my-6 sm:my-8 md:my-12" />
      <RecommendedTvSeriesSection tvId={series.id} locale={locale}/>
    </div>
  );
}