// src/components/features/tv-series/SeasonAccordionItem.tsx
"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, ClapperboardIcon, Loader2Icon, PlayIcon, DownloadIcon as DownloadIconLucide, DownloadCloudIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getFullImagePath, getTvSeasonDetails } from "@/lib/tmdb";
import type { TMDBEpisode, TMDBSeason } from "@/types/tmdb";
// TVEpisodeTorrentResultItem is structurally compatible with TorrentFindResultItem from the new API
import type { TorrentFindResultItem as TVEpisodeTorrentResultItem, TorrentFindResultItem } from "@/types/torrent"; 
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger, 
  DialogFooter,
  DialogClose 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo } from "react"; 
import type { Locale } from "@/config/i18n.config";
import { ConceptualAria2Task } from "@/types/download";
import { VideoPlayer } from "@/components/features/streaming/VideoPlayer"; // Added for streaming

// Extended TMDBEpisode to include torrentOptions (as expected from page.tsx)
interface EpisodeWithTorrents extends TMDBEpisode {
  torrentOptions?: TVEpisodeTorrentResultItem[];
}

interface SeasonWithEpisodesAndTorrents extends TMDBSeason {
  episodes: EpisodeWithTorrents[];
}

const QUALITIES = ["1080p", "720p", "480p", "Any Available"]; // "Any Available" can be a fallback

export function SeasonAccordionItem({
    seriesId,
    seriesTitle,
    season, // This will be SeasonWithEpisodesAndTorrents
    initialOpen,
    dictionary,
    locale,
    seasonPackTorrentOptions // Changed from allSeriesTorrents
}: {
    seriesId: number | string;
    seriesTitle: string;
    season: SeasonWithEpisodesAndTorrents, // Updated type
    initialOpen?: boolean,
    dictionary: any,
    locale: Locale,
    seasonPackTorrentOptions: TorrentFindResultItem[] // New prop
}) {
  // Episodes are now passed directly via the augmented season prop
  const episodes = useMemo(() => season.episodes || [], [season.episodes]);
  const [error, setError] = useState<string | null>(null); // For potential errors if we still had internal fetching
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false); // isLoading is now for internal episode fetching if needed, but episodes are pre-loaded
  const [isSeasonDownloadLoading, setIsSeasonDownloadLoading] = useState(false);
  const [isInternallyOpen, setIsInternallyOpen] = useState(initialOpen || false);
  const [selectedQualityForSeason, setSelectedQualityForSeason] = useState(QUALITIES[0]); // For season pack download
  const { toast } = useToast();

  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [currentEpisodeForDialog, setCurrentEpisodeForDialog] = useState<EpisodeWithTorrents | null>(null);
  const [selectedTorrentInDialog, setSelectedTorrentInDialog] = useState<TVEpisodeTorrentResultItem | null>(null);
  const [isEpisodeDownloadLoading, setIsEpisodeDownloadLoading] = useState(false);

  // State for episode streaming
  const [isEpisodeStreamLoading, setIsEpisodeStreamLoading] = useState(false);
  const [episodeStreamUrl, setEpisodeStreamUrl] = useState<string | null>(null);
  const [episodeStreamTitle, setEpisodeStreamTitle] = useState<string>("");
  const [isEpisodePlayerModalOpen, setIsEpisodePlayerModalOpen] = useState(false);

  // useEffect for fetching episodes is removed as episodes are now passed in `season.episodes`

  const handlePlaySeason = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`[SeasonAccordionItem] "Play Season" S${season.season_number} (${selectedQualityForSeason}) for "${seriesTitle}" clicked. Backend call stubbed.`);
    toast({
      title: dictionary?.toastPlaybackStubTitle || "Playback (Stubbed)",
      description: `${dictionary?.toastPlayingSeasonStubDesc || "Playing season"} ${season.season_number} (${selectedQualityForSeason}) ${dictionary?.of || "of"} "${seriesTitle}". ${dictionary?.featureToImplement || "Feature to be fully implemented."}`,
    });
  };
  
  const handlePlayEpisode = async (episode: EpisodeWithTorrents, e: React.MouseEvent) => {
    e.stopPropagation();
    const episodeMagnetLink = episode.torrentOptions?.[0]?.magnetLink;

    if (!episodeMagnetLink) {
      toast({
        title: dictionary?.noStreamSourceTitle || "Streaming Source Error",
        description: dictionary?.noStreamSourceDescEpisode || `No magnet link available for S${episode.season_number}E${episode.episode_number} to start streaming.`,
        variant: "destructive",
      });
      return;
    }

    setIsEpisodeStreamLoading(true);
    setEpisodeStreamUrl(null);
    setEpisodeStreamTitle(`${seriesTitle} - S${String(episode.season_number).padStart(2, '0')}E${String(episode.episode_number).padStart(2, '0')} - ${episode.name}`);
    toast({
      title: dictionary?.preparingStreamTitle || "Preparing Stream",
      description: dictionary?.preparingStreamDescEpisode || `Please wait for S${episode.season_number}E${episode.episode_number} stream...`,
    });

    try {
      const addResponse = await fetch('/api/webtorrent/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnetUri: episodeMagnetLink }),
      });

      if (!addResponse.ok) {
        const errorData = await addResponse.json().catch(() => ({ error: "Failed to add torrent to server." }));
        throw new Error(errorData.error || "Server error adding torrent.");
      }

      const result = await addResponse.json();
      const { torrentId, files, name: torrentName } = result;

      if (!files || files.length === 0) {
        throw new Error("No files found in the torrent.");
      }

      const videoExtensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
      const videoFiles = files.filter((file: { name: string; length: number }) =>
        videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      ).sort((a: { length: number }, b: { length: number }) => b.length - a.length);

      if (videoFiles.length === 0) {
        throw new Error("No playable video file found in the torrent for this episode.");
      }

      const largestVideoFile = videoFiles[0];
      const filePath = largestVideoFile.path;
      const newStreamUrl = `/api/webtorrent/stream/${torrentId}/${encodeURIComponent(filePath)}`;
      
      setEpisodeStreamUrl(newStreamUrl);
      setEpisodeStreamTitle(torrentName || `${seriesTitle} - S${String(episode.season_number).padStart(2, '0')}E${String(episode.episode_number).padStart(2, '0')} - ${episode.name}`);
      setIsEpisodePlayerModalOpen(true);
      toast({
        title: dictionary?.streamReadyTitle || "Stream Ready",
        description: `${episode.name} ${dictionary?.streamReadyDesc || "is ready to play."}`,
      });

    } catch (error: any) {
      console.error("[SeasonAccordionItem] Error preparing episode stream:", error);
      toast({
        title: dictionary?.streamErrorTitle || "Streaming Error",
        description: error.message || (dictionary?.streamErrorDescEpisode || "Could not prepare the episode stream."),
        variant: "destructive",
      });
      setIsEpisodePlayerModalOpen(false);
    } finally {
      setIsEpisodeStreamLoading(false);
    }
  };

  const handleOpenEpisodeDownloadDialog = (episode: EpisodeWithTorrents, e: React.MouseEvent) => {
    e.stopPropagation();
    if (episode.torrentOptions && episode.torrentOptions.length > 0) {
      setCurrentEpisodeForDialog(episode);
      setSelectedTorrentInDialog(episode.torrentOptions[0] || null); // Pre-select first option
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
      toast({ title: dictionary?.errorNoTorrentSelectedTitle || "Error", description: dictionary?.errorNoTorrentSelectedDesc || "No torrent selected or episode context lost.", variant: "destructive" });
      return;
    }
    setIsEpisodeDownloadLoading(true);
    const taskDisplayName = selectedTorrentInDialog.fileName || `${seriesTitle} S${String(currentEpisodeForDialog.season_number).padStart(2, '0')}E${String(currentEpisodeForDialog.episode_number).padStart(2, '0')} (${selectedTorrentInDialog.torrentQuality || 'Unknown Quality'})`;

    try {
      const response = await fetch('/api/aria2/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: selectedTorrentInDialog.magnetLink, // Changed from identifier to uri for magnet
          type: 'magnet', // This might be redundant if server infers from uri
          name: taskDisplayName,
           // TODO: Consider adding seriesId, season, episode numbers to the payload for better tracking on server/Aria2
        }),
      });
      const result = await response.json();

      if (response.ok && result.gid) { // Aria2 usually returns 'gid' for task ID
        toast({
          title: dictionary?.downloadEpisodeStartTitle || "Episode Download Started",
          description: `${taskDisplayName} ${dictionary?.downloadStartDesc || "sent to Aria2. GID:"} ${result.gid}.`,
        });
        
        const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
        const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
        const newTask: ConceptualAria2Task = {
            taskId: result.gid, // Use gid from Aria2
            name: taskDisplayName, // Use the name sent to Aria2
            quality: selectedTorrentInDialog.torrentQuality || "Unknown",
            addedTime: Date.now(),
            sourceUrlOrIdentifier: selectedTorrentInDialog.magnetLink,
            type: 'tv_episode', 
            seriesTmdbId: String(seriesId),
            seasonNumber: currentEpisodeForDialog.season_number,
            episodeNumber: currentEpisodeForDialog.episode_number,
        };
        if (!conceptualTasks.find(task => task.taskId === result.gid)) {
            conceptualTasks.push(newTask);
            localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));
        }
        setIsDownloadDialogOpen(false); // Close dialog on success
      } else {
        toast({ title: dictionary?.errorServerTitle || "Server Error", description: result.error || (dictionary?.errorServerDescEpisode || "Failed to start episode download."), variant: "destructive" });
      }
    } catch (error) {
      console.error("Error downloading episode:", error);
      toast({ title: dictionary?.errorApiTitle || "API Error", description: dictionary?.errorApiDescEpisode || "Could not communicate with server for episode download.", variant: "destructive" });
    } finally {
      setIsEpisodeDownloadLoading(false);
    }
  };

  // Updated logic for season pack download
  const findBestSeasonPackTorrent = useCallback((quality: string): TorrentFindResultItem | null => {
    const qualityLower = quality.toLowerCase();
    let filtered = seasonPackTorrentOptions;

    if (qualityLower !== "any available") {
      filtered = seasonPackTorrentOptions.filter(t => t.torrentQuality?.toLowerCase().includes(qualityLower.replace('p','')));
    }
    
    if (filtered.length === 0 && qualityLower !== "any available") { // Fallback if specific quality not found
        filtered = seasonPackTorrentOptions; // Try from all available for the season
    }

    return filtered.sort((a, b) => (b.seeds ?? 0) - (a.seeds ?? 0))[0] || null;
  }, [seasonPackTorrentOptions]); // findBestSeasonPackTorrent depends on seasonPackTorrentOptions
  
  const torrentForSeasonDownload = useMemo(() => findBestSeasonPackTorrent(selectedQualityForSeason), [selectedQualityForSeason, findBestSeasonPackTorrent]);
  const isSeasonDownloadPossible = !!torrentForSeasonDownload;

  const handleDownloadSeason = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!torrentForSeasonDownload) {
      toast({ title: dictionary?.noTorrentForSeasonTitle || "No Torrent Found", description: dictionary?.noTorrentForSeasonDesc || "No suitable season pack torrent found for the selected quality.", variant: "destructive" });
      return;
    }
    setIsSeasonDownloadLoading(true);
    const taskDisplayName = torrentForSeasonDownload.fileName || `${seriesTitle} Season ${season.season_number} (${torrentForSeasonDownload.torrentQuality || 'Unknown Quality'})`;

    try {
      const response = await fetch('/api/aria2/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: torrentForSeasonDownload.magnetLink,
          type: 'magnet',
          name: taskDisplayName,
          // Consider options like: { dir: `downloads/tv/${seriesTitle}/Season ${season.season_number}` }
        }),
      });
      const result = await response.json();

      if (response.ok && result.gid) {
        toast({
          title: dictionary?.downloadSeasonStartTitle || "Season Download Started",
          description: `${taskDisplayName} ${dictionary?.downloadStartDesc || "sent to Aria2. GID:"} ${result.gid}.`,
        });
         const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
        const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
        const newTask: ConceptualAria2Task = {
            taskId: result.gid,
            name: taskDisplayName,
            quality: torrentForSeasonDownload.torrentQuality || "Unknown",
            addedTime: Date.now(),
            sourceUrlOrIdentifier: torrentForSeasonDownload.magnetLink,
            type: 'tv_season_pack', 
            seriesTmdbId: String(seriesId),
            seasonNumber: season.season_number,
        };
        if (!conceptualTasks.find(task => task.taskId === result.gid)) {
            conceptualTasks.push(newTask);
            localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));
        }
      } else {
        toast({ title: dictionary?.errorServerTitle || "Server Error", description: result.error || (dictionary?.errorServerDescSeason || "Failed to start season download."), variant: "destructive" });
      }
    } catch (error) {
      console.error("Error downloading season pack:", error);
      toast({ title: dictionary?.errorApiTitle || "API Error", description: dictionary?.errorApiDescSeason || "Could not communicate with server for season download.", variant: "destructive" });
    } finally {
      setIsSeasonDownloadLoading(false);
    }
  };
  return (
    <AccordionPrimitive.Item
      value={`season-${season.season_number}`}
      className="border-b border-border/30 last:border-b-0"
    >
      <AccordionPrimitive.Header className="flex items-center justify-between w-full group data-[state=open]:bg-muted/20 hover:bg-muted/30 transition-colors">
        <AccordionPrimitive.Trigger
          className="flex-grow flex items-center text-left py-4 px-3 sm:px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-l-md"
          onClick={() => setIsInternallyOpen(prev => !prev)} // Internal open state still useful for lazy rendering content if needed, though episodes are pre-loaded
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
            <Select // Quality for Season Pack Download
              value={selectedQualityForSeason}
              onValueChange={setSelectedQualityForSeason}
              disabled={isSeasonDownloadLoading || seasonPackTorrentOptions.length === 0}
            >
              <SelectTrigger
                asChild
                className="w-[150px] h-9 text-xs"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();}}
                disabled={isSeasonDownloadLoading || seasonPackTorrentOptions.length === 0}
              >
                <div>
                  <SelectValue placeholder={dictionary?.selectQualityPlaceholder || "Select quality"} />
                </div>
              </SelectTrigger>
              <SelectContent onClick={(e) => e.stopPropagation()}>
                {QUALITIES.map((quality) => (
                  <SelectItem key={quality} value={quality} className="text-xs">
                    {dictionary?.qualities?.[quality.replace('p','').replace(' Any Available','Any')] || quality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm"
              variant="outline"
              className="h-9"
              onClick={handlePlaySeason}
              disabled={isSeasonDownloadLoading} // Only disable if season download is happening
              aria-label={`${dictionary?.playSeasonButton || "Play Season"} ${season.season_number}: ${season.name} ${dictionary?.inQuality || "in"} ${selectedQualityForSeason}`}
            >
              <PlayIcon className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">{dictionary?.playSeasonButton || "Play Season"}</span>
            </Button>
            <Button // Download Season Button
              size="sm"
              variant="default"
              className="h-9"
              onClick={handleDownloadSeason}
              disabled={isSeasonDownloadLoading || !isSeasonDownloadPossible || seasonPackTorrentOptions.length === 0}
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
          {isLoadingEpisodes && ( // This state is not really used as episodes are pre-loaded
            <div className="flex items-center justify-center p-4">
              <Loader2Icon className="w-6 h-6 text-primary animate-spin mr-2" />
              <span>{dictionary?.loadingEpisodes || "Loading episodes..."}</span>
            </div>
          )}
          {error && <p className="text-destructive p-4">{error}</p>}
          {!isLoadingEpisodes && !error && episodes.length === 0 && isInternallyOpen && (
             <p className="p-4 text-muted-foreground">{dictionary?.noEpisodesFound || "No episodes found for this season."}</p>
          )}

          {!isLoadingEpisodes && !error && episodes.map((episode) => (
            <Card key={episode.id} className="overflow-hidden shadow-sm bg-card hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                 <div className="flex-grow min-w-0">
                  <h5 className="font-semibold text-sm sm:text-base truncate" title={episode.name}>
                    S{String(episode.season_number).padStart(2, '0')}E{String(episode.episode_number).padStart(2, '0')}: {episode.name}
                  </h5>
                  {episode.air_date && <p className="text-xs text-muted-foreground mb-1">{dictionary?.airedPrefix || "Aired:"} {new Date(episode.air_date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}</p>}
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">{episode.overview || (dictionary?.noOverview || "No overview available.")}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0 self-start sm:self-center flex-shrink-0">
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-9"
                        onClick={(e) => handlePlayEpisode(episode, e)}
                        aria-label={`${dictionary?.playEpisodeButton || "Play"} S${episode.season_number}E${episode.episode_number}: ${episode.name}`}
                    >
                        <PlayIcon className="h-4 w-4" />
                        <span className="ml-1.5 hidden sm:inline">{dictionary?.playEpisodeButton || "Play"}</span>
                    </Button>
                    
                    <Dialog open={isDownloadDialogOpen && currentEpisodeForDialog?.id === episode.id} onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setCurrentEpisodeForDialog(null); 
                            setSelectedTorrentInDialog(null);
                        }
                        setIsDownloadDialogOpen(isOpen);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary/80 h-9"
                            onClick={(e) => handleOpenEpisodeDownloadDialog(episode, e)}
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
                                {(currentEpisodeForDialog.torrentOptions && currentEpisodeForDialog.torrentOptions.length > 0) ? 
                                    currentEpisodeForDialog.torrentOptions.map((opt, idx) => (
                                        <Button
                                            key={idx}
                                            variant={selectedTorrentInDialog?.magnetLink === opt.magnetLink ? "default" : "outline"}
                                            className="w-full justify-start h-auto py-2 text-left"
                                            onClick={() => setSelectedTorrentInDialog(opt)}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="font-semibold text-sm truncate max-w-full block" title={opt.fileName}>{opt.fileName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {opt.torrentQuality} | {opt.size || 'N/A'} | Seeds: {opt.seeds ?? 'N/A'} | Source: {opt.source}
                                                </span>
                                            </div>
                                        </Button>
                                    )) :
                                    (<p className="text-sm text-muted-foreground text-center py-4">{dictionary?.noTorrentsFoundItem || "No torrents found for this episode."}</p>)
                                }
                            </div>
                            <DialogFooter className="sm:justify-between gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost" onClick={(e) => e.stopPropagation()}>{dictionary?.cancelButton || "Cancel"}</Button>
                                </DialogClose>
                                <Button 
                                    type="button" 
                                    onClick={handleActualEpisodeDownload} 
                                    disabled={!selectedTorrentInDialog || isEpisodeDownloadLoading}
                                    onClickCapture={(e) => e.stopPropagation()}
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

      {/* Dialog for Episode Video Player */}
      <Dialog open={isEpisodePlayerModalOpen} onOpenChange={setIsEpisodePlayerModalOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] p-0 border-0 bg-black/95 backdrop-blur-md aspect-video rounded-lg overflow-hidden">
          <DialogTitle className="sr-only">{episodeStreamTitle}</DialogTitle>
          {episodeStreamUrl ? (
            <VideoPlayer src={episodeStreamUrl} title={episodeStreamTitle} />
          ) : (
           <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
             <Loader2Icon className="h-12 w-12 animate-spin mb-4" />
             <p>{dictionary?.loadingVideoStream || "Loading video stream..."}</p>
           </div>
          )}
        </DialogContent>
      </Dialog>
    </AccordionPrimitive.Item>
  );
}
