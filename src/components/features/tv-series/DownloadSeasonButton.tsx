// src/components/features/tv-series/DownloadSeasonButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DownloadSeasonButtonProps {
  seriesId: number | string;
  seasonNumber: number;
}

export function DownloadSeasonButton({ seriesId, seasonNumber }: DownloadSeasonButtonProps) {
  const { toast } = useToast();

  const handleDownloadSeason = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent AccordionTrigger from toggling if button is inside it
    console.log(`Download season ${seasonNumber} for series ${seriesId}`);
    // Implement actual download logic here
    // This might involve calling a server action or interacting with a download manager
    toast({
      title: "Download Started (Season)",
      description: `Season ${seasonNumber} of series ${seriesId} is being prepared for download.`,
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="ml-4 flex-shrink-0"
      onClick={handleDownloadSeason}
      aria-label={`Download season ${seasonNumber}`}
    >
      <DownloadIcon className="mr-2 h-4 w-4" /> Download Season
    </Button>
  );
}
