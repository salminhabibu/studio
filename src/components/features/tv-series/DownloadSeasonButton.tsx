// src/components/features/tv-series/DownloadSeasonButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ServerIcon, Loader2Icon, ChevronDown } from "lucide-react"; // Added ChevronDown
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConceptualAria2Task } from "@/types/download";
import { cn } from "@/lib/utils";

interface DownloadSeasonButtonProps {
  seriesId: number | string;
  seriesTitle: string;
  seasonNumber: number;
  seasonName: string;
}

const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "Any Available"];

export function DownloadSeasonButton({
  seriesId,
  seriesTitle,
  seasonNumber,
  seasonName,
}: DownloadSeasonButtonProps) {
  const { toast } = useToast();
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadSeason = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    const taskDisplayName = `${seriesTitle} - Season ${seasonNumber} (${seasonName})`;
    console.log(
      `[DownloadSeasonButton] Initiating server download for ${taskDisplayName} in ${selectedQuality}`
    );

    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: taskDisplayName,
                seriesTitle,
                season: seasonNumber,
                quality: selectedQuality,
                type: 'tv_season_pack'
            })
        });
        const result = await response.json();
        if (response.ok && result.taskId) {
            toast({
                title: "Sent to Server Download",
                description: `Season ${seasonNumber} of ${seriesTitle} (${selectedQuality}) sent to server. Task ID: ${result.taskId}. Check Downloads page.`
            });

            const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
            const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
            const newTask: ConceptualAria2Task = {
                taskId: result.taskId,
                name: result.taskName || taskDisplayName,
                quality: selectedQuality,
                addedTime: Date.now(),
                sourceUrlOrIdentifier: `${seriesTitle} S${String(seasonNumber).padStart(2,'0')}`,
                type: 'tv_season_pack',
            };
            if (!conceptualTasks.find(task => task.taskId === result.taskId)) {
                conceptualTasks.push(newTask);
                localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));
            }
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
    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
      <Select
        value={selectedQuality}
        onValueChange={setSelectedQuality}
        disabled={isLoading}
      >
        <SelectTrigger
          asChild // Use asChild to render a non-button element as the trigger
          className="w-[150px] h-9 text-xs" // This className is passed to the child div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              // Allow space/enter to open select, but stop propagation so accordion doesn't toggle
              e.stopPropagation();
            }
          }}
          disabled={isLoading}
        >
          {/* This div becomes the trigger. It will receive styles from SelectTrigger's className. */}
          {/* Radix Slot correctly applies ARIA attributes and event handlers. */}
          <div 
             className={cn(
                // Replicate essential styles for the trigger look and feel if not fully inherited.
                // The className from SelectTrigger (w-[150px] h-9 text-xs) will be merged by Radix Slot.
                // Default shadcn SelectTrigger styles (flex, items-center, etc.) are also applied.
             )}
          >
            <SelectValue placeholder="Select quality" />
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
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
        {isLoading ? <Loader2Icon className="animate-spin h-4 w-4" /> : <ServerIcon className="h-4 w-4" />}
        <span className="ml-1.5 hidden sm:inline">Download Season</span>
      </Button>
    </div>
  );
}
