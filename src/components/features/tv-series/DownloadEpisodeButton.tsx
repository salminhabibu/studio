// src/components/features/tv-series/DownloadEpisodeButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DownloadEpisodeButtonProps {
  seriesId: number | string;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
}

const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "4K (UHD)", "2K (QHD)"];

export function DownloadEpisodeButton({
  seriesId,
  seasonNumber,
  episodeNumber,
  episodeName,
}: DownloadEpisodeButtonProps) {
  const { toast } = useToast();
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]);

  const handleDownloadEpisode = (e: React.MouseEvent) => {
    // e.stopPropagation(); // Already handled by button click, select is separate
    const episodeId = `S${String(seasonNumber).padStart(2, "0")}E${String(
      episodeNumber
    ).padStart(2, "0")}`;
    console.log(
      `Download ${episodeId}: ${episodeName} for series ${seriesId} in ${selectedQuality}`
    );
    // Implement actual download logic here
    toast({
      title: "Download Started (Episode)",
      description: `${episodeId} - ${episodeName} (${selectedQuality}) is being prepared for download.`,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0 self-start sm:self-center">
      <Select value={selectedQuality} onValueChange={setSelectedQuality}>
        <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs">
          <SelectValue placeholder="Select quality" />
        </SelectTrigger>
        <SelectContent>
          {qualities.map((quality) => (
            <SelectItem key={quality} value={quality} className="text-xs">
              {quality}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="ghost"
        className="flex-shrink-0 text-primary hover:text-primary/80 h-9"
        onClick={handleDownloadEpisode}
        aria-label={`Download episode S${String(seasonNumber).padStart(
          2,
          "0"
        )}E${String(episodeNumber).padStart(2, "0")}: ${episodeName} in ${selectedQuality}`}
      >
        <DownloadIcon className="mr-2 h-4 w-4" /> Download Episode
      </Button>
    </div>
  );
}
