// src/components/features/tv-series/DownloadEpisodeButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DownloadEpisodeButtonProps {
  seriesId: number | string;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string; 
}

export function DownloadEpisodeButton({
  seriesId,
  seasonNumber,
  episodeNumber,
  episodeName,
}: DownloadEpisodeButtonProps) {
  const { toast } = useToast();

  const handleDownloadEpisode = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    const episodeId = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
    console.log(
      `Download ${episodeId}: ${episodeName} for series ${seriesId}`
    );
    // Implement actual download logic here
     toast({
      title: "Download Started (Episode)",
      description: `${episodeId} - ${episodeName} is being prepared for download.`,
    });
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="mt-2 sm:mt-0 flex-shrink-0 self-start sm:self-center text-primary hover:text-primary/80"
      onClick={handleDownloadEpisode}
      aria-label={`Download episode S${String(seasonNumber).padStart(
        2,
        "0"
      )}E${String(episodeNumber).padStart(2, "0")}: ${episodeName}`}
    >
      <DownloadIcon className="mr-2 h-4 w-4" /> Download Episode
    </Button>
  );
}
