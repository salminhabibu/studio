// src/components/features/tv-series/DownloadSeasonButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, ChevronDown } from "lucide-react";
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

  const handleDownloadSeason = (e: React.MouseEvent | React.KeyboardEvent) => {
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
          asChild
          className="w-[150px] h-9 text-xs"
          onClick={(e) => {
            // Stop propagation to prevent AccordionTrigger from toggling
            // and Select from opening when clicking on the trigger button from accordion.
            e.stopPropagation();
          }}
        >
          {/* This div receives merged classes from SelectTrigger and custom ones.
              Radix Slot component handles merging props and className.
              It acts as the visual trigger for the Select component.
           */}
          <div>
            <SelectValue placeholder="Select quality" />
            <ChevronDown className="h-4 w-4 opacity-50" />
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
        asChild // Render the child component instead of a <button> element
        size="sm"
        variant="outline"
        className="h-9" // Styling from buttonVariants will be applied to the div
        onClick={handleDownloadSeason} // onClick handler will be passed to the div via Slot
        aria-label={`Download season ${seasonNumber}: ${seasonName} in ${selectedQuality}`}
      >
        <div // This div will be rendered, styled like a button, but is not a <button> tag
          role="button" // Accessibility: announce as a button
          tabIndex={0}  // Accessibility: make it focusable
          onKeyDown={(e) => {
            // Accessibility: allow activation with Enter or Space key
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault(); // Prevent default spacebar scroll
              handleDownloadSeason(e); // Trigger the same action as click
            }
          }}
        >
          <DownloadIcon className="mr-2 h-4 w-4" /> Download Season
        </div>
      </Button>
    </div>
  );
}
