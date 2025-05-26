// src/components/features/tv-series/DownloadAllSeasonsWithOptionsButton.tsx
"use client";

import { useState } from "react";
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
import type { ConceptualAria2Task } from "@/types/download";

import { useEffect, useMemo } from "react"; // Added useEffect and useMemo

// Assuming TorrentFindResultItem is defined globally or imported
// For this component, we only strictly need magnetLink and torrentQuality from it for now
interface TorrentFindResultItem {
  magnetLink: string;
  torrentQuality: string;
  fileName?: string;
  // Other fields like seeds, source, etc., might be useful for better filtering/sorting in future
}

interface DownloadAllSeasonsWithOptionsButtonProps {
  seriesId: number | string; // Keep for potential future use or different download strategies
  seriesName: string;
  seriesTitle: string;
  torrentResults: TorrentFindResultItem[]; // New prop
  dictionary?: any; // Optional dictionary for localization
}

export function DownloadAllSeasonsWithOptionsButton({
  seriesId,
  seriesName,
  seriesTitle,
  torrentResults,
  dictionary,
}: DownloadAllSeasonsWithOptionsButtonProps) {
  const { toast } = useToast();
  const [selectedQuality, setSelectedQuality] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const t = dictionary || {}; // Fallback for dictionary

  // Heuristic to identify potential "all seasons" or "complete series" packs
  // These are often larger and don't specify a single season number in their torrentQuality from our backend
  const allSeasonsTorrents = useMemo(() => {
    return torrentResults.filter(torrent => {
      const qualityLower = torrent.torrentQuality.toLowerCase();
      const fileNameLower = torrent.fileName?.toLowerCase() || "";
      // Check if quality string indicates a specific season (e.g., "1080p S01")
      const hasSpecificSeasonInQuality = /s\d{1,2}(?!e\d{1,2})/.test(qualityLower); // Matches "S01", "S12", but not "S01E01"
      
      // Look for keywords in filename
      const hasPackKeywords = /batch|complete|all seasons|season \d{1,2}-\d{1,2}|seasons \d{1,2} & \d{1,2}/.test(fileNameLower);

      return (!hasSpecificSeasonInQuality || hasPackKeywords);
    });
  }, [torrentResults]);

  const dynamicQualities = useMemo(() => {
    if (!allSeasonsTorrents.length) return [];
    const qualities = allSeasonsTorrents.map(t => t.torrentQuality);
    return [...new Set(qualities)]; // Deduplicate
  }, [allSeasonsTorrents]);

  useEffect(() => {
    if (dynamicQualities.length > 0) {
      if (!selectedQuality || !dynamicQualities.includes(selectedQuality)) {
        setSelectedQuality(dynamicQualities[0]);
      }
    } else {
      setSelectedQuality(""); // Reset if no qualities available
    }
  }, [dynamicQualities, selectedQuality]);


  const handleDownloadAllSeasons = async () => {
    if (!selectedQuality) {
      toast({ title: t.noQualityTitle || "No Quality Selected", description: t.noQualityDesc || "Please select a quality to download.", variant: "destructive" });
      return;
    }

    const selectedTorrent = allSeasonsTorrents.find(t => t.torrentQuality === selectedQuality);

    if (!selectedTorrent || !selectedTorrent.magnetLink) {
      toast({ title: t.torrentNotFoundTitle || "Torrent Not Found", description: t.torrentNotFoundDesc || "Could not find a suitable torrent for the selected quality.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const taskDisplayName = selectedTorrent.fileName || `${seriesTitle} - All Seasons - ${selectedQuality}`;
    
    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: selectedTorrent.magnetLink,
                type: 'magnet', // Important: type is 'magnet'
                name: taskDisplayName,
                // quality: selectedQuality, // Quality is inherent in the chosen magnet
                // seriesTitle, season: 'all' // These are less relevant if we have a direct magnet for "all seasons"
            })
        });
        const result = await response.json();
        if (response.ok && result.taskId) {
            toast({ 
                title: t.successTitle || "Sent to Server Download", 
                description: `${taskDisplayName} ${t.successDesc || "sent to server. Task ID:"} ${result.taskId}. ${t.checkDownloadsPage || "Check Downloads page."}` 
            });
            
            const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
            const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
            const newTask: ConceptualAria2Task = {
                taskId: result.taskId,
                name: result.taskName || taskDisplayName,
                quality: selectedQuality, // Store the user-selected quality label
                addedTime: Date.now(),
                sourceUrlOrIdentifier: selectedTorrent.magnetLink,
                type: 'tv_season_pack_all', // Keep a general type for UI grouping
            };
            if (!conceptualTasks.find(task => task.taskId === result.taskId)) {
                conceptualTasks.push(newTask);
                localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));
            }
        } else {
            toast({ title: t.errorServerTitle || "Server Download Error", description: result.error || (t.errorServerDesc || "Failed to start 'All Seasons' download on server."), variant: "destructive" });
        }
    } catch (error) {
        console.error("[DownloadAllSeasons] Error calling Aria2 add API for all seasons:", error);
        toast({ title: t.errorApiTitle || "Server API Error", description: t.errorApiDesc || "Could not communicate with download server for 'All Seasons'.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };
  
  const noTorrentsAvailable = dynamicQualities.length === 0;

  return (
    <div className="space-y-3">
      <Select 
        value={selectedQuality} 
        onValueChange={setSelectedQuality} 
        disabled={isLoading || noTorrentsAvailable}
      >
        <SelectTrigger className="w-full h-11 text-sm" disabled={isLoading || noTorrentsAvailable}>
         <SelectValue placeholder={noTorrentsAvailable ? (t.noTorrentsPlaceholder || "No 'all seasons' torrents") : (t.selectQualityPlaceholder || "Select download quality")} />
        </SelectTrigger>
        <SelectContent>
          {dynamicQualities.map((quality) => (
            <SelectItem key={quality} value={quality} className="text-sm">
              {quality}
            </SelectItem>
          ))}
          {noTorrentsAvailable && (
            <SelectItem value="disabled" disabled className="text-sm text-muted-foreground">
              {t.noTorrentsFoundItem || "No 'all seasons' torrents found"}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <Button
        size="lg"
        className="w-full h-12"
        onClick={handleDownloadAllSeasons}
        disabled={isLoading || noTorrentsAvailable || !selectedQuality}
        aria-label={`${t.downloadAllSeasonsAriaLabel || `Download all seasons of ${seriesName} via Server`}${selectedQuality ? ` (${selectedQuality})` : ''}`}
      >
        {isLoading ? <Loader2Icon className="animate-spin h-5 w-5"/> : <ServerIcon className="h-5 w-5" /> } 
        <span className="ml-2">{t.downloadAllSeasonsButtonText || "Download All Seasons"}</span>
      </Button>
       <p className="text-xs text-muted-foreground text-center">{t.downloadNote || "Note: Prioritizes full season packs via server."}</p>
    </div>
  );
}

