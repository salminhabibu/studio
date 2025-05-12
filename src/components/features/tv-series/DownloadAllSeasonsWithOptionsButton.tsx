// src/components/features/tv-series/DownloadAllSeasonsWithOptionsButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, ServerIcon, Loader2Icon } from "lucide-react"; // Added ServerIcon, Loader2Icon
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DownloadAllSeasonsWithOptionsButtonProps {
  seriesId: number | string;
  seriesName: string; // User-friendly display name
  seriesTitle: string; // Title for backend search (usually same as seriesName)
}

const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "Any Available"];

export function DownloadAllSeasonsWithOptionsButton({
  seriesId,
  seriesName,
  seriesTitle,
}: DownloadAllSeasonsWithOptionsButtonProps) {
  const { toast } = useToast();
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadAllSeasons = async () => {
    setIsLoading(true);
    console.log(
      `[DownloadAllSeasons] Initiating server download for ALL seasons of ${seriesTitle} (ID: ${seriesId}) in ${selectedQuality}`
    );
    
    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `${seriesTitle} - All Seasons`,
                seriesTitle, // Backend will use this to search for season packs
                season: 'all', // Special indicator for all seasons
                quality: selectedQuality,
                type: 'tv_season_pack_all' // Indicate to backend this is for all season packs
            })
        });
        const result = await response.json();
        if (response.ok && result.taskId) {
            toast({ title: "Server Download Started (All Seasons)", description: `All seasons of ${seriesName} (${selectedQuality}) sent to server. Task ID: ${result.taskId}` });
        } else {
            toast({ title: "Server Download Error", description: result.error || "Failed to start 'All Seasons' download on server.", variant: "destructive" });
        }
    } catch (error) {
        console.error("[DownloadAllSeasons] Error calling Aria2 add API for all seasons:", error);
        toast({ title: "Server API Error", description: "Could not communicate with download server for 'All Seasons'.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Select value={selectedQuality} onValueChange={setSelectedQuality} disabled={isLoading}>
        <SelectTrigger className="w-full h-11 text-sm">
          <SelectValue placeholder="Select download quality" />
        </SelectTrigger>
        <SelectContent>
          {qualities.map((quality) => (
            <SelectItem key={quality} value={quality} className="text-sm">
              {quality}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="lg"
        className="w-full h-12"
        onClick={handleDownloadAllSeasons}
        disabled={isLoading}
        aria-label={`Download all seasons of ${seriesName} in ${selectedQuality} via Server`}
      >
        {isLoading ? <Loader2Icon className="animate-spin"/> : <ServerIcon /> } 
        <span className="ml-2">Download All Seasons</span>
      </Button>
       <p className="text-xs text-muted-foreground text-center">Note: Downloads full season packs via server (conceptual).</p>
    </div>
  );
}
