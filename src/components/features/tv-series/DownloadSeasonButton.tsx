// src/components/features/tv-series/DownloadSeasonButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, ChevronDown, ServerIcon, Loader2Icon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { useWebTorrent } from "@/contexts/WebTorrentContext"; // WebTorrent for full seasons is complex, focusing on Aria2 for now

interface DownloadSeasonButtonProps {
  seriesId: number | string;
  seriesTitle: string; // Added seriesTitle
  seasonNumber: number;
  seasonName: string;
}

const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "Any Available"]; // Simplified from 4K/2K for season packs

export function DownloadSeasonButton({
  seriesId,
  seriesTitle, // Use this
  seasonNumber,
  seasonName,
}: DownloadSeasonButtonProps) {
  const { toast } = useToast();
  // const { addTorrent, isClientReady } = useWebTorrent(); // Defer WebTorrent for full seasons
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadSeason = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation(); 
    setIsLoading(true);
    console.log(
      `[DownloadSeasonButton] Initiating server download for ${seriesTitle} Season ${seasonNumber} (${seasonName}) in ${selectedQuality}`
    );

    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `${seriesTitle} - Season ${seasonNumber} (${seasonName})`,
                seriesTitle,
                season: seasonNumber,
                quality: selectedQuality,
                type: 'tv_season_pack' // Indicate to backend this is a season pack
            })
        });
        const result = await response.json();
        if (response.ok && result.taskId) {
            toast({ title: "Server Download Started (Season)", description: `Season ${seasonNumber} of ${seriesTitle} sent to server. Task ID: ${result.taskId}` });
        } else {
            toast({ title: "Server Download Error", description: result.error || "Failed to start season download on server.", variant: "destructive" });
        }

    } catch (error) {
        console.error("[DownloadSeasonButton] Error calling Aria2 add API for season:", error);
        toast({ title: "Server API Error", description: "Could not communicate with download server for season.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 ml-auto flex-shrink-0"> {/* Changed margin to ml-auto */}
      <Select
        value={selectedQuality}
        onValueChange={setSelectedQuality}
        disabled={isLoading}
      >
        <SelectTrigger
          className="w-[150px] h-9 text-xs"
          onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
        >
          <SelectValue placeholder="Select quality" />
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}>
          {qualities.map((quality) => (
            <SelectItem key={quality} value={quality} className="text-xs">
              {quality}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        className="h-9"
        onClick={handleDownloadSeason}
        disabled={isLoading}
        aria-label={`Download season ${seasonNumber}: ${seasonName} in ${selectedQuality} via Server`}
      >
        {isLoading ? <Loader2Icon className="animate-spin" /> : <ServerIcon />}
        <span className="ml-1.5 hidden sm:inline">Download Season</span>
      </Button>
    </div>
  );
}
