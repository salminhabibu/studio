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
import type { ConceptualAria2Task } from "@/types/download";

interface DownloadEpisodeButtonProps {
  seriesId: number | string; 
  seriesTitle: string; 
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  preferredQuality: string;
}

const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "Any Available"];

export function DownloadEpisodeButton({
  seriesId,
  seriesTitle,
  seasonNumber,
  episodeNumber,
  episodeName,
  preferredQuality,
}: DownloadEpisodeButtonProps) {
  const { toast } = useToast();
  const { addTorrent, isClientReady } = useWebTorrent(); 
  const [isLoadingWebTorrent, setIsLoadingWebTorrent] = useState(false);
  const [isLoadingAria2, setIsLoadingAria2] = useState(false);
  const [selectedAriaQuality, setSelectedAriaQuality] = useState(preferredQuality || qualities[0]);

  const episodeIdString = `S${String(seasonNumber).padStart(2, "0")}E${String(
    episodeNumber
  ).padStart(2, "0")}`;
  const uniqueItemId = `${seriesId}-${episodeIdString}`;

  const handleWebTorrentDownload = async () => {
    if (!isClientReady) {
      toast({ title: "WebTorrent Not Ready", description: "Please wait for the client to initialize...", variant: "destructive" });
      return;
    }
    setIsLoadingWebTorrent(true);
    console.log(
      `[DownloadEpisodeButton] Fetching magnet for WebTorrent: ${seriesTitle} ${episodeIdString} (Quality hint: ${selectedAriaQuality})`
    );

    try {
      const fetchedMagnetLink = await getEpisodeMagnetLink(
        seriesTitle,
        seasonNumber,
        episodeNumber,
        selectedAriaQuality 
      );

      if (fetchedMagnetLink) {
        console.log(`[DownloadEpisodeButton] Adding WebTorrent: ${fetchedMagnetLink.substring(0,60)}...`);
        const torrent = await addTorrent(fetchedMagnetLink, `${seriesTitle} - ${episodeIdString} - ${episodeName}`, uniqueItemId);
        if (torrent) {
          toast({ title: "Download Queued (WebTorrent)", description: `${episodeName} is being added.` });
        } else {
          toast({ title: "WebTorrent Issue", description: `${episodeName} might already be in downloads or failed to add. Check active downloads or try again.`, variant: "default" });
        }
      } else {
        toast({ title: "Download Failed (WebTorrent)", description: `Could not find a WebTorrent link for ${episodeName} (${selectedAriaQuality}). Try a different quality or source.`, variant: "destructive" });
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
    const taskDisplayName = `${seriesTitle} - ${episodeIdString} - ${episodeName}`;
    console.log(`[DownloadEpisodeButton] Initiating Aria2 download for ${taskDisplayName} (Quality: ${selectedAriaQuality})`);
    
    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: taskDisplayName,
                seriesTitle, 
                season: seasonNumber,
                episode: episodeNumber,
                quality: selectedAriaQuality,
                type: 'tv_episode'
            })
        });
        const result = await response.json();

        if (response.ok && result.taskId) {
            toast({ 
                title: "Sent to Server Download", 
                description: `${episodeName} (${selectedAriaQuality}) sent to server. Task ID: ${result.taskId}. Check Downloads page.` 
            });
            
            const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
            const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
            const newTask: ConceptualAria2Task = {
                taskId: result.taskId,
                name: result.taskName || taskDisplayName,
                quality: selectedAriaQuality,
                addedTime: Date.now(),
                sourceUrlOrIdentifier: `${seriesTitle} S${String(seasonNumber).padStart(2,'0')}E${String(episodeNumber).padStart(2,'0')}`,
                type: 'tv_episode',
            };
            if (!conceptualTasks.find(task => task.taskId === result.taskId)) {
                conceptualTasks.push(newTask);
                localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));
            }
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
       <Select value={selectedAriaQuality} onValueChange={setSelectedAriaQuality} disabled={isLoadingAria2 || isLoadingWebTorrent}>
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
        disabled={isLoadingWebTorrent || !isClientReady || isLoadingAria2}
        aria-label={`Download episode ${episodeIdString} via WebTorrent: ${episodeName}`}
      >
        {isLoadingWebTorrent ? (
            <Loader2Icon className="animate-spin h-4 w-4" /> 
        ) : (
            <DownloadIcon className="h-4 w-4" />
        )}
        <span className="ml-1.5 hidden sm:inline">{isClientReady ? 'WebTorrent' : 'WT Init...'}</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0 h-9"
        onClick={handleAria2Download}
        disabled={isLoadingAria2 || isLoadingWebTorrent}
        aria-label={`Download episode ${episodeIdString} via Server: ${episodeName}`}
      >
        {isLoadingAria2 ? (
            <Loader2Icon className="animate-spin h-4 w-4" /> 
        ) : (
            <ServerIcon className="h-4 w-4" />
        )}
         <span className="ml-1.5 hidden sm:inline">Server</span>
      </Button>
    </div>
  );
}

