// src/components/features/tv-series/SeasonAccordionItem.tsx
"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, ClapperboardIcon, Loader2Icon, PlayIcon, DownloadIcon as DownloadIconLucide, DownloadCloudIcon } from "lucide-react"; // Renamed DownloadIcon to avoid conflict
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getFullImagePath, getTvSeasonDetails } from "@/lib/tmdb";
import type { TMDBEpisode, TMDBSeason } from "@/types/tmdb";
import type { TVEpisodeTorrentResultItem } from "@/types/torrent"; // Import the new type
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, // Added for context
  DialogTrigger, 
  DialogFooter,
  DialogClose 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { Locale } from "@/config/i18n.config";
// import { useDownload } from "@/contexts/DownloadContext"; // Not used for Aria2 directly
import { DownloadTaskCreationData, ConceptualAria2Task } from "@/types/download"; 

// Placeholder for TorrentFindResultItem if not globally defined/imported
// This local definition is not needed if TVEpisodeTorrentResultItem is imported correctly
// interface TorrentFindResultItem {
//   magnetLink: string;
//   torrentQuality: string;
//   fileName?: string;
//   source?: string;
//   seeds?: number; 
// }

const QUALITIES = ["1080p", "720p", "480p", "Any Available"];

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
  const [selectedQuality, setSelectedQuality] = useState(QUALITIES[0]);
  const { toast } = useToast();
  // const { addDownloadTask: addWebTorrentTask } = useDownload(); // For WebTorrent, not Aria2

  // State for download dialog
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [currentEpisodeForDialog, setCurrentEpisodeForDialog] = useState<TMDBEpisode | null>(null);
  const [selectedTorrentInDialog, setSelectedTorrentInDialog] = useState<TVEpisodeTorrentResultItem | null>(null);
  const [isEpisodeDownloadLoading, setIsEpisodeDownloadLoading] = useState(false);


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
    if (episode.torrentOptions && episode.torrentOptions.length > 0) {
      setCurrentEpisodeForDialog(episode);
      setSelectedTorrentInDialog(null); // Reset selection when opening
      setIsDownloadDialogOpen(true);
    } else {
      toast({
        title: dictionary?.downloadNotAvailableTitle || "Download Not Available",
        description: dictionary?.downloadNotAvailableDescEpisode || "No download options found for this episode.",
        variant: "default"
      });
    }
  };

  const handleActualEpisodeDownload = async () => {
    if (!selectedTorrentInDialog || !currentEpisodeForDialog) {
      toast({ title: "Error", description: "No torrent selected or episode context lost.", variant: "destructive" });
      return;
    }
    setIsEpisodeDownloadLoading(true);
    const taskDisplayName = selectedTorrentInDialog.title || `${seriesTitle} S${String(currentEpisodeForDialog.season_number).padStart(2, '0')}E${String(currentEpisodeForDialog.episode_number).padStart(2, '0')} (${selectedTorrentInDialog.torrentQuality})`;

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
            disabled={isSeasonDownloadLoading || !isDownloadPossible} // isDownloadPossible needs to be updated based on allSeriesTorrents
              aria-label={`${dictionary?.downloadSeasonButton || "Download Season"} ${season.season_number}: ${season.name}`}
            >
            {isSeasonDownloadLoading ? <Loader2Icon className="animate-spin h-4 w-4" /> : <DownloadIconLucide className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">{dictionary?.downloadSeasonButton || "Download Season"}</span>
            </Button>
          </div>
        </div>
      </AccordionPrimitive.Header>

      <AccordionPrimitive.Content className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className={cn("pb-4 pt-0", "bg-card/50 p-2 sm:p-3 space-y-2")}>
          {/* ... loading and error states for episodes ... */}
          {!isLoading && !error && episodes.map((episode) => (
            <Card key={episode.id} className="overflow-hidden shadow-sm bg-card hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* ... episode image and details ... */}
                 <div className="flex-grow min-w-0">
                  <h5 className="font-semibold text-sm sm:text-base truncate" title={episode.name}>
                    S{String(episode.season_number).padStart(2, '0')}E{String(episode.episode_number).padStart(2, '0')}: {episode.name}
                  </h5>
                  {episode.air_date && <p className="text-xs text-muted-foreground mb-1">{dictionary?.airedPrefix || "Aired:"} {new Date(episode.air_date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}</p>}
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">{episode.overview || (dictionary?.noOverview || "No overview available.")}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0 self-start sm:self-center">
                    <Button /* ... Play button ... */ >
                        <PlayIcon className="h-4 w-4" />
                        <span className="ml-1.5 hidden sm:inline">{dictionary?.playEpisodeButton || "Play"}</span>
                    </Button>
                    
                    {/* New Download Button with Dialog */}
                    <Dialog open={isDownloadDialogOpen && currentEpisodeForDialog?.id === episode.id} onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setCurrentEpisodeForDialog(null); // Reset when dialog closes
                            setSelectedTorrentInDialog(null);
                        }
                        setIsDownloadDialogOpen(isOpen);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="flex-shrink-0 text-primary hover:text-primary/80 h-9"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (episode.torrentOptions && episode.torrentOptions.length > 0) {
                                    setCurrentEpisodeForDialog(episode);
                                    setSelectedTorrentInDialog(null); // Reset on open
                                    setIsDownloadDialogOpen(true);
                                } else {
                                    toast({
                                        title: dictionary?.downloadNotAvailableTitle || "Download Not Available",
                                        description: dictionary?.downloadNotAvailableDescEpisode || "No download options found for this episode.",
                                        variant: "default"
                                    });
                                }
                            }}
                            disabled={!episode.torrentOptions || episode.torrentOptions.length === 0}
                            aria-label={`${dictionary?.downloadEpisodeButton || "Download Episode"} S${episode.season_number}E${episode.episode_number}: ${episode.name}`}
                        >
                            <DownloadIconLucide className="h-4 w-4" />
                            <span className="ml-1.5 hidden sm:inline">{dictionary?.downloadButtonShort || "Download"}</span>
                        </Button>
                      </DialogTrigger>
                      {currentEpisodeForDialog?.id === episode.id && (
                        <DialogContent className="sm:max-w-[525px]" onEscapeKeyDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                            <DialogHeader>
                                <DialogTitle>{dictionary?.selectDownloadOption || "Select Download Option"} - S{String(episode.season_number).padStart(2, '0')}E{String(episode.episode_number).padStart(2, '0')}</DialogTitle>
                                <DialogDescription>{episode.name}</DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto space-y-2 p-1">
                                {currentEpisodeForDialog.torrentOptions?.map((opt, idx) => (
                                    <Button
                                        key={idx}
                                        variant={selectedTorrentInDialog?.magnetLink === opt.magnetLink ? "default" : "outline"}
                                        className="w-full justify-start h-auto py-2"
                                        onClick={() => setSelectedTorrentInDialog(opt)}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <span className="font-semibold text-sm truncate max-w-full" title={opt.title}>{opt.title}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {opt.torrentQuality} | {opt.size || 'N/A'} | Seeds: {opt.seeds ?? 'N/A'}
                                            </span>
                                        </div>
                                    </Button>
                                ))}
                                {(!currentEpisodeForDialog.torrentOptions || currentEpisodeForDialog.torrentOptions.length === 0) && (
                                    <p className="text-sm text-muted-foreground text-center py-4">{dictionary?.noTorrentsFoundItem || "No torrents found for this episode."}</p>
                                )}
                            </div>
                            <DialogFooter className="sm:justify-between gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost" onClick={(e) => e.stopPropagation()}>{dictionary?.cancelButton || "Cancel"}</Button>
                                </DialogClose>
                                <Button 
                                    type="button" 
                                    onClick={handleActualEpisodeDownload} 
                                    disabled={!selectedTorrentInDialog || isEpisodeDownloadLoading}
                                    onClickCapture={(e) => e.stopPropagation()} // Prevent accordion from closing
                                >
                                    {isEpisodeDownloadLoading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloudIcon className="mr-2 h-4 w-4" />}
                                    {dictionary?.downloadSelectedButton || "Download Selected"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                      )}
                    </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}

// Helper for handleDownloadSeason (ensure it's defined or logic integrated)
// const findBestTorrentForSeason = ... (as in your existing code, if still used for season pack download)
// const handleDownloadSeason = ... (as in your existing code)
