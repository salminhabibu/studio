// src/components/features/tv-series/DownloadEpisodeButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, Loader2Icon, ServerIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getEpisodeMagnetLink } from "@/lib/tmdb"; 
import { useWebTorrent } from "@/contexts/WebTorrentContext"; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DownloadEpisodeButtonProps {
  seriesId: number | string; 
  seriesTitle: string; 
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  preferredQuality: string; // Added to receive preferred quality from parent
}

// Shared qualities with season button, could be a constant
const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "Any Available"];

export function DownloadEpisodeButton({
  seriesId,
  seriesTitle,
  seasonNumber,
  episodeNumber,
  episodeName,
  preferredQuality, // Use this prop
}: DownloadEpisodeButtonProps) {
  const { toast } = useToast();
  const { addTorrent, isClientReady } = useWebTorrent(); 
  const [isLoadingWebTorrent, setIsLoadingWebTorrent] = useState(false);
  const [isLoadingAria2, setIsLoadingAria2] = useState(false);
  // Quality for Aria2, WebTorrent will take whatever magnet is found
  const [selectedAriaQuality, setSelectedAriaQuality] = useState(preferredQuality || qualities[0]);


  const episodeIdString = `S${String(seasonNumber).padStart(2, "0")}E${String(
    episodeNumber
  ).padStart(2, "0")}`;
  const uniqueItemId = `${seriesId}-${episodeIdString}`; // Used for history and tracking


  const handleWebTorrentDownload = async () => {
    if (!isClientReady) {
      toast({ title: "WebTorrent Not Ready", description: "Please wait...", variant: "destructive" });
      return;
    }
    setIsLoadingWebTorrent(true);
    console.log(
      `[DownloadEpisodeButton] Fetching magnet for WebTorrent: ${seriesTitle} ${episodeIdString}`
    );

    try {
      // Quality parameter for getEpisodeMagnetLink is conceptual for now, as API doesn't use it yet
      const fetchedMagnetLink = await getEpisodeMagnetLink(
        seriesTitle,
        seasonNumber,
        episodeNumber,
        // selectedAriaQuality // Or a specific quality for WebTorrent if API supports
      );

      if (fetchedMagnetLink) {
        console.log(`[DownloadEpisodeButton] Adding WebTorrent: ${fetchedMagnetLink}`);
        const torrent = await addTorrent(fetchedMagnetLink, `${seriesTitle} - ${episodeIdString} - ${episodeName}`, uniqueItemId);
        if (torrent) {
          toast({ title: "Download Queued (WebTorrent)", description: `${episodeName} is being added.` });
        } else {
          toast({ title: "WebTorrent Issue", description: `${episodeName} might already be in downloads or failed to add.`, variant: "default" });
        }
      } else {
        toast({ title: "Download Failed", description: `Could not find a WebTorrent link for ${episodeName}.`, variant: "destructive" });
      }
    } catch (error) {
      console.error("[DownloadEpisodeButton] WebTorrent Error:", error);
      toast({ title: "Error", description: `WebTorrent download failed: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
        setIsLoadingWebTorrent(false);
    }
  };

  const handleAria2Download = async () => {
    setIsLoadingAria2(true);
    console.log(`[DownloadEpisodeButton] Initiating Aria2 download for ${seriesTitle} ${episodeIdString} (Quality: ${selectedAriaQuality})`);
    
    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: `${seriesTitle} - ${episodeIdString} - ${episodeName}`,
                seriesTitle, // Send individual parts for backend to construct search query
                season: seasonNumber,
                episode: episodeNumber,
                quality: selectedAriaQuality,
                type: 'tv_episode' // Indicate to backend this is a TV episode
            })
        });
        const result = await response.json();

        if (response.ok && result.taskId) {
            toast({ title: "Server Download Started", description: `${episodeName} (Quality: ${selectedAriaQuality}) sent to server. Task ID: ${result.taskId}` });
        } else {
            toast({ title: "Server Download Error", description: result.error || "Failed to start server download.", variant: "destructive" });
        }
    } catch (error) {
        console.error("[DownloadEpisodeButton] Error calling Aria2 add API:", error);
        toast({ title: "Server API Error", description: "Could not communicate with download server.", variant: "destructive" });
    } finally {
        setIsLoadingAria2(false);
    }
  };
  

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0 self-start sm:self-center">
      {/* Quality selection for Aria2 - WebTorrent uses whatever magnet is found */}
       <Select value={selectedAriaQuality} onValueChange={setSelectedAriaQuality}>
        <SelectTrigger className="h-9 text-xs w-full sm:w-[140px] flex-shrink-0">
          <SelectValue placeholder="Quality" />
        </SelectTrigger>
        <SelectContent>
          {qualities.map(q => <SelectItem key={q} value={q} className="text-xs">{q}</SelectItem>)}
        </SelectContent>
      </Select>
      
      <Button
        size="sm"
        variant="ghost"
        className="flex-shrink-0 text-primary hover:text-primary/80 h-9"
        onClick={handleWebTorrentDownload}
        disabled={isLoadingWebTorrent || !isClientReady}
        aria-label={`Download episode ${episodeIdString} via WebTorrent: ${episodeName}`}
      >
        {isLoadingWebTorrent ? (
            <Loader2Icon className="animate-spin" /> 
        ) : (
            <DownloadIcon />
        )}
        <span className="ml-1.5 hidden sm:inline">WebTorrent</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0 h-9"
        onClick={handleAria2Download}
        disabled={isLoadingAria2}
        aria-label={`Download episode ${episodeIdString} via Server: ${episodeName}`}
      >
        {isLoadingAria2 ? (
            <Loader2Icon className="animate-spin" /> 
        ) : (
            <ServerIcon />
        )}
         <span className="ml-1.5 hidden sm:inline">Server</span>
      </Button>
    </div>
  );
}
