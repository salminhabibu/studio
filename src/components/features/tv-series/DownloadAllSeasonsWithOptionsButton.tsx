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

import type { TorrentFindResultItem } from "@/types/torrent"; // Import the actual type
import { useEffect, useMemo } from "react"; 

interface DownloadAllSeasonsWithOptionsButtonProps {
  seriesId: number | string; 
  seriesName: string; // Used for ARIA label
  seriesTitle: string; // Used for task display name
  torrentResults: TorrentFindResultItem[];
  dictionary?: any;
}

export function DownloadAllSeasonsWithOptionsButton({
  seriesId,
  seriesName,
  seriesTitle,
  torrentResults,
  dictionary,
}: DownloadAllSeasonsWithOptionsButtonProps) {
  const { toast } = useToast();
  // Store the magnet link of the selected torrent
  const [selectedMagnet, setSelectedMagnet] = useState<string>(""); 
  const [isLoading, setIsLoading] = useState(false);

  const t = dictionary || {};

  // Filter for "all seasons" or "complete series" packs
  const allSeasonsTorrents = useMemo(() => {
    return torrentResults.filter(torrent => {
      const qualityLower = torrent.torrentQuality?.toLowerCase() || "";
      const fileNameLower = torrent.fileName?.toLowerCase() || "";
      const hasSpecificSeasonInQuality = /s\d{1,2}(?!e\d{1,2})/.test(qualityLower);
      const hasPackKeywords = /pack|batch|complete|all seasons|season \d{1,2}-\d{1,2}|seasons \d{1,2} & \d{1,2}/.test(fileNameLower);
      // If torrentQuality is very generic like "HD" or "1080p" without season specifier, also consider it a pack
      const isGenericQualityWithoutSeason = (qualityLower === "hd" || qualityLower === "fhd" || qualityLower === "1080p" || qualityLower === "720p") && !hasSpecificSeasonInQuality;
      
      return (!hasSpecificSeasonInQuality || hasPackKeywords || isGenericQualityWithoutSeason);
    });
  }, [torrentResults]);

  useEffect(() => {
    // Auto-select the first torrent if available and none is selected
    if (allSeasonsTorrents.length > 0 && !selectedMagnet) {
      setSelectedMagnet(allSeasonsTorrents[0].magnetLink);
    }
    // If the currently selected magnet is no longer in the filtered list (e.g. torrentResults changed),
    // reset to the first available or empty if none.
    if (selectedMagnet && !allSeasonsTorrents.find(t => t.magnetLink === selectedMagnet)) {
      setSelectedMagnet(allSeasonsTorrents.length > 0 ? allSeasonsTorrents[0].magnetLink : "");
    }
  }, [allSeasonsTorrents, selectedMagnet]);


  const handleDownloadAllSeasons = async () => {
    if (!selectedMagnet) {
      toast({ 
        title: t.noOptionSelectedTitle || "No Option Selected", 
        description: t.noOptionSelectedDesc || "Please select a season pack to download.", 
        variant: "destructive" 
      });
      return;
    }

    const selectedTorrent = allSeasonsTorrents.find(t => t.magnetLink === selectedMagnet);

    if (!selectedTorrent) { // Should not happen if selectedMagnet is from the list
      toast({ 
        title: t.torrentNotFoundTitle || "Torrent Not Found", 
        description: t.torrentNotFoundDesc || "Selected torrent could not be found.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    const taskDisplayName = selectedTorrent.fileName || `${seriesTitle} - ${selectedTorrent.torrentQuality || 'Season Pack'}`;
    
    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uri: selectedTorrent.magnetLink, // Use 'uri' for magnet
                options: { dir: `tv-series/${seriesTitle}` }, // Example directory structure
                name: taskDisplayName,
            })
        });
        const result = await response.json();
        if (response.ok && result.taskId) {
            toast({ 
                title: t.successTitle || "Sent to Server Download", 
                description: `${taskDisplayName} ${t.successDesc || "sent to server. Task ID:"} ${result.taskId}. ${t.checkDownloadsPage || "Check Downloads page."}` 
            });
            // Optional: Add to conceptual tasks if needed, but this might be better handled in DownloadContext
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
  
  const noTorrentsAvailable = allSeasonsTorrents.length === 0;

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
                ? (t.noTorrentsPlaceholder || "No season packs found") 
                : (t.selectTorrentPlaceholder || "Select season pack...")
            } 
         />
        </SelectTrigger>
        <SelectContent>
          {allSeasonsTorrents.map((torrent, index) => (
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

