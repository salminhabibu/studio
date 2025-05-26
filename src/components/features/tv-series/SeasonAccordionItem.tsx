// src/components/features/tv-series/SeasonAccordionItem.tsx
"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, ClapperboardIcon, Loader2Icon, PlayIcon, DownloadIcon } from "lucide-react"; // Added PlayIcon, DownloadIcon
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getFullImagePath, getTvSeasonDetails } from "@/lib/tmdb";
import type { TMDBEpisode, TMDBSeason } from "@/types/tmdb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Added Button
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select
import { useToast } from "@/hooks/use-toast"; // Added useToast
import { useEffect, useState } from "react";
import type { Locale } from "@/config/i18n.config";
import { useDownload } from "@/contexts/DownloadContext"; // Added
import { DownloadTaskCreationData } from "@/types/download"; // Added

const QUALITIES = ["1080p (FHD)", "720p (HD)", "480p (SD)", "Any Available"]; // Moved from Download buttons

export function SeasonAccordionItem({ 
    seriesId, 
    seriesTitle,
import { useDownload } from "@/contexts/DownloadContext"; // Added
import { DownloadTaskCreationData, ConceptualAria2Task } from "@/types/download"; // Added

// Placeholder for TorrentFindResultItem if not globally defined/imported
interface TorrentFindResultItem {
  magnetLink: string;
  torrentQuality: string;
  fileName?: string;
  source?: string;
  seeds?: number; // Optional: useful for sorting if available
}

const QUALITIES = ["1080p", "720p", "480p", "Any Available"]; // Simplified, display text can be mapped from dictionary

export function SeasonAccordionItem({
    seriesId,
    seriesTitle,
    season,
    initialOpen,
    dictionary, // Pass dictionary for localization
    locale, // Pass locale
    allSeriesTorrents // New prop
}: {
    seriesId: number | string;
    seriesTitle: string;
    season: TMDBSeason,
    initialOpen?: boolean,
    dictionary: any,
    locale: Locale,
    allSeriesTorrents: TorrentFindResultItem[]
}) {
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For fetching episodes
  const [isSeasonDownloadLoading, setIsSeasonDownloadLoading] = useState(false); // For season download button
  const [isInternallyOpen, setIsInternallyOpen] = useState(initialOpen || false);
  const [selectedQuality, setSelectedQuality] = useState(QUALITIES[0]); // For the "Play Season" / "Download Season" quality selector
  const { toast } = useToast();
  const { addDownloadTask: addWebTorrentTask } = useDownload(); // Renamed to avoid confusion

  useEffect(() => {
    async function fetchEpisodes() {
      if (isInternallyOpen && season.episode_count > 0 && episodes.length === 0 && !isLoading) {
        setIsLoading(true);
        setError(null);
        try {
          const seasonDetails = await getTvSeasonDetails(seriesId, season.season_number);
          setEpisodes(seasonDetails.episodes);
        } catch (e) {
          console.error(`Failed to fetch episodes for season ${season.season_number}:`, e);
          setError(dictionary?.errorLoadingEpisodes || "Could not load episodes for this season.");
        } finally {
          setIsLoading(false);
        }
      }
    }
    fetchEpisodes();
  }, [isInternallyOpen, seriesId, season, episodes.length, isLoading, dictionary]);

  const handlePlaySeason = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`[SeasonAccordionItem] "Play Season" S${season.season_number} (${selectedQuality}) for "${seriesTitle}" clicked. Backend call stubbed.`);
    toast({
      title: dictionary?.toastPlaybackStubTitle || "Playback (Stubbed)",
      description: `${dictionary?.toastPlayingSeasonStubDesc || "Playing season"} ${season.season_number} (${selectedQuality}) ${dictionary?.of || "of"} "${seriesTitle}". ${dictionary?.featureToImplement || "Feature to be fully implemented."}`,
    });
  };
  
  const handlePlayEpisode = (episode: TMDBEpisode, e: React.MouseEvent) => {
    e.stopPropagation();
    // Stubbed
     toast({
      title: dictionary?.toastPlaybackStubTitle || "Playback (Stubbed)",
      description: `${dictionary?.toastPlayingEpisodeStubDesc || "Playing episode"} S${episode.season_number}E${episode.episode_number} - "${episode.name}" (${selectedQuality}). ${dictionary?.featureToImplement || "Feature to be fully implemented."}`,
    });
  };

  const handleDownloadEpisode = async (episode: TMDBEpisode, e: React.MouseEvent) => {
    e.stopPropagation();
    // This remains largely non-functional as episode.magnetLink is not expected to be populated
    if (!episode.magnetLink || !episode.id) {
      toast({
        title: dictionary?.downloadNotAvailableTitle || "Download Not Available",
        description: dictionary?.downloadNotAvailableDescEpisode || "No download source found for this episode.",
        variant: "default"
      });
      return;
    }
    // Existing WebTorrent logic (if applicable)
    const taskData: DownloadTaskCreationData = { /* ... as before ... */ };
    await addWebTorrentTask(taskData);
  };

  const findBestTorrentForSeason = (targetQuality?: string): TorrentFindResultItem | null => {
    const currentSeasonNum = season.season_number;
    const seasonTorrents = allSeriesTorrents.filter(torrent => {
      const qualityLower = torrent.torrentQuality.toLowerCase();
      const fileNameLower = torrent.fileName?.toLowerCase() || "";
      // Regex to find "S01", "Season 1", etc., ensuring it's not part of an episode number like S01E05
      const seasonPattern = new RegExp(`s0*${currentSeasonNum}(?!e\\d+)|season\\s*0*${currentSeasonNum}`, 'i');
      return seasonPattern.test(qualityLower) || seasonPattern.test(fileNameLower);
    });

    if (!seasonTorrents.length) return null;

    // Sort by seeds if available, otherwise keep current order (which is already by seeds from API)
    seasonTorrents.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
    
    if (targetQuality && targetQuality !== "Any Available") {
      const qualityFiltered = seasonTorrents.filter(t => 
        t.torrentQuality.toLowerCase().includes(targetQuality.toLowerCase().split(" ")[0]) // Match "1080p" from "1080p (FHD)"
      );
      if (qualityFiltered.length > 0) return qualityFiltered[0];
    }
    
    return seasonTorrents[0]; // Return the best-seeded torrent for this season
  };


  const handleDownloadSeason = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSeasonDownloadLoading(true);

    const torrentToDownload = findBestTorrentForSeason(selectedQuality);

    if (!torrentToDownload) {
      toast({
        title: dictionary?.noTorrentForSeasonTitle || "No Torrent Found",
        description: `${dictionary?.noTorrentForSeasonDesc || "No suitable torrent found for season"} ${season.season_number} ${dictionary?.withQuality || "with quality"} ${selectedQuality}. ${dictionary?.tryOtherQuality || "Try selecting 'Any Available'."}`,
        variant: "destructive",
      });
      setIsSeasonDownloadLoading(false);
      return;
    }
    
    const taskDisplayName = torrentToDownload.fileName || `${seriesTitle} - ${season.name} (${torrentToDownload.torrentQuality})`;

    try {
      const response = await fetch('/api/aria2/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: torrentToDownload.magnetLink,
          type: 'magnet',
          name: taskDisplayName,
        }),
      });
      const result = await response.json();

      if (response.ok && result.taskId) {
        toast({
          title: dictionary?.downloadSeasonStartTitle || "Download Started",
          description: `${taskDisplayName} ${dictionary?.downloadSeasonStartDesc || "sent to server. Task ID:"} ${result.taskId}.`,
        });
        
        const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
        const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
        const newTask: ConceptualAria2Task = {
            taskId: result.taskId,
            name: result.taskName || taskDisplayName,
            quality: torrentToDownload.torrentQuality,
            addedTime: Date.now(),
            sourceUrlOrIdentifier: torrentToDownload.magnetLink,
            type: 'tv_season_pack', 
            seriesTmdbId: seriesId.toString(),
            seasonNumber: season.season_number,
        };
        if (!conceptualTasks.find(task => task.taskId === result.taskId)) {
            conceptualTasks.push(newTask);
            localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));
        }

      } else {
        toast({ title: dictionary?.errorServerTitle || "Server Error", description: result.error || (dictionary?.errorServerDescSeason || "Failed to start season download."), variant: "destructive" });
      }
    } catch (error) {
      console.error("Error downloading season:", error);
      toast({ title: dictionary?.errorApiTitle || "API Error", description: dictionary?.errorApiDescSeason || "Could not communicate with server for season download.", variant: "destructive" });
    } finally {
      setIsSeasonDownloadLoading(false);
    }
  };
  
  const isDownloadPossible = !!findBestTorrentForSeason(selectedQuality);


  return (
    <AccordionPrimitive.Item
      value={`season-${season.season_number}`}
      className="border-b border-border/30 last:border-b-0"
    >
      <AccordionPrimitive.Header className="flex items-center justify-between w-full group data-[state=open]:bg-muted/20 hover:bg-muted/30 transition-colors">
        <AccordionPrimitive.Trigger
          className="flex-grow flex items-center text-left py-4 px-3 sm:px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-l-md"
          onClick={() => setIsInternallyOpen(prev => !prev)}
        >
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
                {season.episode_count} {season.episode_count !== 1 ? (dictionary?.episodesSuffix || "Episodes") : (dictionary?.episodeSuffix || "Episode")}
                {season.air_date && ` • ${dictionary?.airedPrefix || "Aired:"} ${new Date(season.air_date).toLocaleDateString(locale, { year: 'numeric', month: 'short' })}`}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 ml-auto group-data-[state=open]:rotate-180" />
        </AccordionPrimitive.Trigger>

        <div className="py-2 pr-3 sm:pr-2 pl-1 flex-shrink-0 rounded-r-md" onClick={(e) => e.stopPropagation()}>
           <div className="flex items-center gap-2 ml-auto">
            <Select
              value={selectedQuality}
              onValueChange={setSelectedQuality}
              disabled={isLoading || isSeasonDownloadLoading} // Disable if loading episodes or season download
            >
              <SelectTrigger
                asChild
                className="w-[150px] h-9 text-xs"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();}}
                disabled={isLoading || isSeasonDownloadLoading}
              >
                <div>
                  <SelectValue placeholder={dictionary?.selectQualityPlaceholder || "Select quality"} />
                </div>
              </SelectTrigger>
              <SelectContent onClick={(e) => e.stopPropagation()}>
                {QUALITIES.map((quality) => (
                  <SelectItem key={quality} value={quality} className="text-xs">
                    {dictionary?.qualities?.[quality.split(" ")[0]] || quality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button // Play Season Button (stubbed)
              size="sm"
              variant="outline"
              className="h-9"
              onClick={handlePlaySeason}
              disabled={isLoading || isSeasonDownloadLoading}
              aria-label={`${dictionary?.playSeasonButton || "Play Season"} ${season.season_number}: ${season.name} ${dictionary?.inQuality || "in"} ${selectedQuality}`}
            >
              {(isLoading && !isInternallyOpen) ? <Loader2Icon className="animate-spin h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">{dictionary?.playSeasonButton || "Play Season"}</span>
            </Button>
            <Button // Download Season Button
              size="sm"
              variant="default"
              className="h-9"
              onClick={handleDownloadSeason}
              disabled={isSeasonDownloadLoading || !isDownloadPossible}
              aria-label={`${dictionary?.downloadSeasonButton || "Download Season"} ${season.season_number}: ${season.name}`}
            >
              {isSeasonDownloadLoading ? <Loader2Icon className="animate-spin h-4 w-4" /> : <DownloadIcon className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">{dictionary?.downloadSeasonButton || "Download Season"}</span>
            </Button>
          </div>
        </div>
      </AccordionPrimitive.Header>

      <AccordionPrimitive.Content className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className={cn("pb-4 pt-0", "bg-card/50 p-2 sm:p-3 space-y-2")}>
          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">{dictionary?.loadingEpisodes || "Loading episodes..."}</p>
            </div>
          )}
          {error && <p className="text-destructive p-4 text-center">{error}</p>}
          {!isLoading && !error && episodes.length === 0 && season.episode_count > 0 && isInternallyOpen && (
            <p className="text-muted-foreground p-3 text-center text-sm">{dictionary?.noEpisodesFound || "No episodes found for this season, or data is unavailable."}</p>
          )}
          {!isLoading && !error && episodes.map((episode) => (
            <Card key={episode.id} className="overflow-hidden shadow-sm bg-card hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {episode.still_path && (
                  <div className="relative w-full sm:w-32 md:w-36 aspect-[16/9] rounded overflow-hidden flex-shrink-0 bg-muted shadow-inner">
                    <Image src={getFullImagePath(episode.still_path, "w300")} alt={`${dictionary?.stillFrom || "Still from"} ${episode.name}`} fill className="object-cover" data-ai-hint="episode still" />
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
                  {episode.air_date && <p className="text-xs text-muted-foreground mb-1">{dictionary?.airedPrefix || "Aired:"} {new Date(episode.air_date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}</p>}
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">{episode.overview || (dictionary?.noOverview || "No overview available.")}</p>
                </div>
                {/* Stubbed "Play Episode" area - formerly DownloadEpisodeButton */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0 self-start sm:self-center">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0 text-primary hover:text-primary/80 h-9"
                        onClick={(e) => handlePlayEpisode(episode, e)}
                        aria-label={`${dictionary?.playEpisodeButton || "Play Episode"} S${episode.season_number}E${episode.episode_number}: ${episode.name}`}
                    >
                        <PlayIcon className="h-4 w-4" />
                        <span className="ml-1.5 hidden sm:inline">{dictionary?.playEpisodeButton || "Play"}</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0 text-primary hover:text-primary/80 h-9"
                        onClick={(e) => handleDownloadEpisode(episode, e)}
                        disabled={!episode.magnetLink} 
                        aria-label={`${dictionary?.downloadEpisodeButton || "Download Episode"} S${episode.season_number}E${episode.episode_number}: ${episode.name}`}
                    >
                        <DownloadIcon className="h-4 w-4" />
                        <span className="ml-1.5 hidden sm:inline">{dictionary?.downloadButtonShort || "Download"}</span>
                    </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
