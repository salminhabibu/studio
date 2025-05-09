// src/components/features/tv-series/DownloadAllSeasonsWithOptionsButton.tsx
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

interface DownloadAllSeasonsWithOptionsButtonProps {
  seriesId: number | string;
  seriesName: string;
}

const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "4K (UHD)", "2K (QHD)"];

export function DownloadAllSeasonsWithOptionsButton({
  seriesId,
  seriesName,
}: DownloadAllSeasonsWithOptionsButtonProps) {
  const { toast } = useToast();
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]);

  const handleDownloadAllSeasons = () => {
    console.log(
      `Download all seasons for series ${seriesName} (ID: ${seriesId}) in ${selectedQuality}`
    );
    toast({
      title: "Download Started (All Seasons)",
      description: `All seasons of ${seriesName} (${selectedQuality}) are being prepared for download.`,
    });
  };

  return (
    <div className="space-y-3">
      <Select value={selectedQuality} onValueChange={setSelectedQuality}>
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
        aria-label={`Download all seasons of ${seriesName} in ${selectedQuality}`}
      >
        <DownloadIcon className="mr-2 h-5 w-5" /> Download All ({selectedQuality})
      </Button>
    </div>
  );
}
