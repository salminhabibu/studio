// src/components/features/tv-series/DownloadAllSeasonsWithOptionsButton.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ServerIcon, Loader2Icon } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TorrentFindResultItem } from "@/types/torrent";
import type { ConceptualAria2Task } from "@/types/download";

interface DownloadAllSeasonsWithOptionsButtonProps {
  seriesId: number | string; 
  seriesName: string; 
  seriesTitle: string; 
  allSeasonPackResults: Map<number, TorrentFindResultItem[]>; // Changed from torrentResults
  dictionary?: any;
}

export function DownloadAllSeasonsWithOptionsButton({
  seriesId,
  seriesName,
  seriesTitle,
  allSeasonPackResults, // Changed prop name
  dictionary,
}: DownloadAllSeasonsWithOptionsButtonProps) {
  const { toast } = useToast();
  const [selectedMagnet, setSelectedMagnet] = useState<string>(""); 
  const [isLoading, setIsLoading] = useState(false);

  const t = dictionary || {};

  // Flatten all season pack torrents from the map and then filter for "all seasons" or "complete series" packs
  const suitableSeriesPacks = useMemo(() => {
    const flatTorrentList: TorrentFindResultItem[] = [];
    allSeasonPackResults.forEach(torrents => {
      flatTorrentList.push(...torrents);
    });

    // Deduplicate based on magnet link to avoid listing the same pack multiple times if it appeared for multiple seasons
    const uniqueTorrents = Array.from(new Map(flatTorrentList.map(t => [t.magnetLink, t])).values());

    return uniqueTorrents.filter(torrent => {
      const fileNameLower = torrent.fileName?.toLowerCase() || "";
      // Prioritize torrents that explicitly state "complete", "all seasons", "season 1-X", etc.
      // More specific season packs (e.g. "Season 1", "Season 2") are typically handled by SeasonAccordionItem
      const isCompleteSeriesPack = /pack|batch|complete|all seasons|full series|collection|season \d{1,2}-\d{1,2}|seasons \d{1,2} & \d{1,2}/.test(fileNameLower);
      // Avoid single season packs unless they are the only thing available and filename suggests it's a large pack
      const isSingleSeasonPack = /season\s\d{1,2}(?![\w-])/.test(fileNameLower) && !isCompleteSeriesPack; // e.g. "Season 1" but not "Season 1-3"
      
      if (isCompleteSeriesPack) return true;
      // If no obvious "complete series" packs, consider any torrent that isn't clearly a single episode or specific single season.
      // This part might need refinement based on typical naming conventions of torrents from the API.
      // For now, we rely on the filtering done in page.tsx for `seasonPackResults` to primarily fetch season-level packs.
      // The goal here is to find the "most encompassing" pack.
      return !isSingleSeasonPack; 
    }).sort((a,b) => (b.seeds ?? 0) - (a.seeds ?? 0)); // Sort by seeders
  }, [allSeasonPackResults]);

  useEffect(() => {
    if (suitableSeriesPacks.length > 0 && !selectedMagnet) {
      setSelectedMagnet(suitableSeriesPacks[0].magnetLink);
    }
    if (selectedMagnet && !suitableSeriesPacks.find(t => t.magnetLink === selectedMagnet)) {
      setSelectedMagnet(suitableSeriesPacks.length > 0 ? suitableSeriesPacks[0].magnetLink : "");
    }
  }, [suitableSeriesPacks, selectedMagnet]);

  const handleDownloadAllSeasons = async () => {
    if (!selectedMagnet) {
      toast({ 
        title: t.noOptionSelectedTitle || "No Option Selected", 
        description: t.noOptionSelectedDesc || "Please select a series pack to download.", 
        variant: "destructive" 
      });
      return;
    }

    const selectedTorrent = suitableSeriesPacks.find(t => t.magnetLink === selectedMagnet);

    if (!selectedTorrent) {
      toast({ 
        title: t.torrentNotFoundTitle || "Torrent Not Found", 
        description: t.torrentNotFoundDesc || "Selected torrent could not be found.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    const taskDisplayName = selectedTorrent.fileName || `${seriesTitle} - (${selectedTorrent.torrentQuality || 'Series Pack'})`;
    
    try {
      const payload = {
        title: taskDisplayName,
        type: 'tvSeason', // Using 'tvSeason' as a general type for "all seasons" pack. 
                           // downloadManager will use seriesTitle and a generic season "pack" name if seasonNumber is not in metadata.
                           // Alternatively, a new type 'tvSeriesPack' could be handled in downloadManager.
        source: selectedTorrent.magnetLink,
        metadata: {
          tmdbId: String(seriesId),
          seriesTitle: seriesTitle,
          fileName: taskDisplayName, // Or a more structured name from selectedTorrent.fileName
          selectedQuality: selectedTorrent.torrentQuality || "Unknown",
          // seasonNumber: 0, // Could use a placeholder like 0 or -1 for "all seasons" if type 'tvSeason' strictly needs it in backend
        },
        // destinationPath: `tv-series/${seriesTitle}` // Optional: let downloadManager handle path construction
      };

      const response = await fetch('/api/aria2/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (response.ok && (result.gid || result.taskId)) {
        const newTaskId = result.gid || result.taskId;
        toast({
          title: t.successTitle || "Download Started",
          description: `${taskDisplayName} ${t.successDesc || "sent to Aria2. GID:"} ${newTaskId}. ${t.checkDownloadsPage || "Check Downloads page."}`
        });

        const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
        const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
        const newTask: ConceptualAria2Task = {
          taskId: newTaskId,
          name: taskDisplayName,
          quality: selectedTorrent.torrentQuality || "Unknown",
          addedTime: Date.now(),
          sourceUrlOrIdentifier: selectedTorrent.magnetLink,
          type: 'tv_season_pack_all', 
          seriesTmdbId: String(seriesId),
          // seasonNumber: payload.metadata.seasonNumber, // If added to payload
        };
        if (!conceptualTasks.find(task => task.taskId === newTaskId)) {
          conceptualTasks.push(newTask);
                localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));
            }
        } else {
            toast({ title: t.errorServerTitle || "Server Download Error", description: result.error || (t.errorServerDesc || "Failed to start download on server."), variant: "destructive" });
        }
    } catch (error) {
        console.error("[DownloadAllSeasonsWithOptionsButton] Error calling Aria2 add API:", error);
        toast({ title: t.errorApiTitle || "Server API Error", description: t.errorApiDesc || "Could not communicate with download server.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };
  
  const noTorrentsAvailable = suitableSeriesPacks.length === 0;

  return (
    <div className="space-y-3">
      <Select 
        value={selectedMagnet} 
        onValueChange={setSelectedMagnet} 
        disabled={isLoading || noTorrentsAvailable}
      >
        <SelectTrigger className="w-full h-auto min-h-11 text-sm py-2" disabled={isLoading || noTorrentsAvailable}>
         <SelectValue 
            placeholder={
                noTorrentsAvailable 
                ? (t.noTorrentsPlaceholder || "No series packs found") 
                : (t.selectTorrentPlaceholder || "Select series pack...")
            } 
         />
        </SelectTrigger>
        <SelectContent>
          {suitableSeriesPacks.map((torrent, index) => (
            <SelectItem key={torrent.magnetLink || index} value={torrent.magnetLink} className="text-xs">
              <div className="flex flex-col gap-0.5 py-1">
                <span className="font-semibold truncate max-w-[300px] sm:max-w-[400px] md:max-w-[250px]" title={torrent.fileName}>{torrent.fileName || 'Unknown File Name'}</span>
                <span className="text-muted-foreground">
                  {torrent.torrentQuality || 'N/A'} | {torrent.size || 'N/A'} | Seeds: {torrent.seeds ?? 'N/A'}
                </span>
              </div>
            </SelectItem>
          ))}
          {noTorrentsAvailable && (
            <SelectItem value="disabled" disabled className="text-sm text-muted-foreground">
              {t.noTorrentsFoundItem || "No season packs available"}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <Button
        size="lg"
        className="w-full h-12"
        onClick={handleDownloadAllSeasons}
        disabled={isLoading || noTorrentsAvailable || !selectedMagnet}
        aria-label={`${t.downloadAllSeasonsAriaLabel || `Download season pack for ${seriesName} via Server`}`}
      >
        {isLoading ? <Loader2Icon className="animate-spin h-5 w-5"/> : <ServerIcon className="h-5 w-5" /> } 
        <span className="ml-2">{t.downloadSelectedPackButtonText || "Download Selected Pack"}</span>
      </Button>
       <p className="text-xs text-muted-foreground text-center">{t.downloadNote || "Note: This downloads a multi-season pack or full series."}</p>
    </div>
  );
}

