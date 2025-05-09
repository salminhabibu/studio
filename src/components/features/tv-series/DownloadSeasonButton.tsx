// src/components/features/tv-series/DownloadSeasonButton.tsx
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

interface DownloadSeasonButtonProps {
  seriesId: number | string;
  seasonNumber: number;
  seasonName: string;
}

const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "4K (UHD)", "2K (QHD)"];

export function DownloadSeasonButton({
  seriesId,
  seasonNumber,
  seasonName,
}: DownloadSeasonButtonProps) {
  const { toast } = useToast();
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]);

  const handleDownloadSeason = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent AccordionTrigger from toggling
    console.log(
      `Download season ${seasonNumber} (${seasonName}) for series ${seriesId} in ${selectedQuality}`
    );
    toast({
      title: "Download Started (Season)",
      description: `Season ${seasonNumber}: ${seasonName} (${selectedQuality}) of series ${seriesId} is being prepared for download.`,
    });
  };

  return (
    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
      <Select
        value={selectedQuality}
        onValueChange={setSelectedQuality}
        // Prevent accordion toggle when select is opened
        onOpenChange={(open) => {
          if (open) {
            const event = new Event('mousedown', { bubbles: true, cancelable: true });
            document.dispatchEvent(event); // A bit of a hack to stop propagation if Radix doesn't do it itself
          }
        }}
      >
        <SelectTrigger 
          className="w-[150px] h-9 text-xs"
          onClick={(e) => e.stopPropagation()} // Ensure click on trigger doesn't toggle accordion
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
        aria-label={`Download season ${seasonNumber}: ${seasonName} in ${selectedQuality}`}
      >
        <DownloadIcon className="mr-2 h-4 w-4" /> Download Season
      </Button>
    </div>
  );
}
