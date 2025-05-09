// src/components/features/tv-series/SeasonAccordionItem.tsx
"use client"; 

import { getTvSeasonDetails, getFullImagePath } from "@/lib/tmdb";
import type { TMDBSeason, TMDBEpisode } from "@/types/tmdb";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ClapperboardIcon } from "lucide-react";
import { DownloadSeasonButton } from "@/components/features/tv-series/DownloadSeasonButton";
import { DownloadEpisodeButton } from "@/components/features/tv-series/DownloadEpisodeButton";
import { useEffect, useState } from "react";

export function SeasonAccordionItem({ seriesId, season, initialOpen }: { seriesId: number | string; season: TMDBSeason, initialOpen?: boolean }) {
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
