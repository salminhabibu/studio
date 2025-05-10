// src/components/features/tv-series/DownloadEpisodeButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getEpisodeMagnetLink } from "@/lib/tmdb"; 
import { useWebTorrent } from "@/contexts/WebTorrentContext"; 


interface DownloadEpisodeButtonProps {
  seriesId: number | string; 
  seriesTitle: string; 
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
}

export function DownloadEpisodeButton({
  seriesId,
  seriesTitle,
  seasonNumber,
  episodeNumber,
  episodeName,
}: DownloadEpisodeButtonProps) {
  const { toast } = useToast();
  const { addTorrent } = useWebTorrent(); 
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMagnet, setIsFetchingMagnet] = useState(false);

  const episodeIdString = `S${String(seasonNumber).padStart(2, "0")}E${String(
    episodeNumber
  ).padStart(2, "0")}`;
  const uniqueItemId = `${seriesId}-${episodeIdString}`;


  const handleFetchAndDownload = async () => {
    setIsLoading(true);
    setIsFetchingMagnet(true);
    console.log(
      `[DownloadEpisodeButton] Clicked Download for ${seriesTitle} ${episodeIdString}: ${episodeName}`
    );

    try {
      const fetchedMagnetLink = await getEpisodeMagnetLink(
        seriesTitle,
        seasonNumber,
        episodeNumber
      );
      setIsFetchingMagnet(false);

      if (fetchedMagnetLink) {
        const torrent = await addTorrent(fetchedMagnetLink, `${seriesTitle} - ${episodeIdString} - ${episodeName}`, uniqueItemId);
        if (torrent) {
          toast({
            title: "Download Started",
            description: `${episodeName} is being added to your active downloads.`,
          });
        } else {
          toast({
            title: "Download Issue",
            description: `${episodeName} might already be in downloads or failed to add. Check Downloads page.`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Download Failed",
          description: `Could not find a download link for ${episodeName}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[DownloadEpisodeButton] Error fetching magnet or adding torrent:", error);
      setIsFetchingMagnet(false);
      toast({
        title: "Error",
        description: "An unexpected error occurred while trying to start the download.",
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  };
  

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0 self-start sm:self-center">
      <Button
        size="sm"
        variant="ghost"
        className="flex-shrink-0 text-primary hover:text-primary/80 h-9"
        onClick={handleFetchAndDownload}
        disabled={isLoading || isFetchingMagnet}
        aria-label={`Download episode ${episodeIdString}: ${episodeName}`}
      >
        {isLoading || isFetchingMagnet ? (
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> 
        ) : (
            <DownloadIcon className="mr-2 h-4 w-4" />
        )}
        {isFetchingMagnet ? 'Fetching...' : (isLoading ? 'Adding...' : 'Download Episode')}
      </Button>
    </div>
  );
}
