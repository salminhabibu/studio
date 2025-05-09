// src/components/features/tv-series/DownloadSeasonButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, ChevronDown } from "lucide-react"; // Added ChevronDown
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils"; // Import cn for merging classes if needed

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
      >
        <SelectTrigger
          asChild // Use asChild to render the child component instead of a button
          className="w-[150px] h-9 text-xs" // These classes will be applied to the div by Radix
          onClick={(e) => {
            // Stop propagation to prevent AccordionTrigger from toggling
            e.stopPropagation();
          }}
        >
          {/* 
            This div replaces the default button rendered by SelectTrigger.
            Radix will pass down ARIA attributes and event handlers.
            The className from SelectTrigger (merged default + "w-[150px] h-9 text-xs") will be applied here.
          */}
          <div> {/* This div itself will get styled by SelectTrigger's classes like flex, justify-between */}
            <SelectValue placeholder="Select quality" />
            <ChevronDown className="h-4 w-4 opacity-50" /> {/* Manually add icon */}
          </div>
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}> {/* Prevent clicks in content from toggling accordion */}
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
        onClick={handleDownloadSeason} // This already stops propagation
        aria-label={`Download season ${seasonNumber}: ${seasonName} in ${selectedQuality}`}
      >
        <DownloadIcon className="mr-2 h-4 w-4" /> Download Season
      </Button>
    </div>
  );
}
