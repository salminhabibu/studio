// src/components/features/tv-series/DownloadSeasonButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, ChevronDown, ServerIcon, Loader2Icon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConceptualAria2Task } from "@/types/download";

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
            toast({ title: "Server Download Sent (Season)", description: `Season ${seasonNumber} of ${seriesTitle} (${selectedQuality}) sent to server. Task ID: ${result.taskId}. Check Downloads page.` });
            
            const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
            const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
            const newTask: ConceptualAria2Task = {
                taskId: result.taskId,
                name: result.taskName || taskDisplayName,
                quality: selectedQuality,
                addedTime: Date.now(),
                sourceUrlOrIdentifier: `${seriesTitle} S${seasonNumber}`,
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
          className="w-[150px] h-9 text-xs"
          onClick={(e) => e.stopPropagation()} 
          disabled={isLoading}
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
        disabled={isLoading}
        aria-label={`Download season ${seasonNumber}: ${seasonName} in ${selectedQuality} via Server`}
      >
        {isLoading ? <Loader2Icon className="animate-spin h-4 w-4" /> : <ServerIcon className="h-4 w-4" />}
        <span className="ml-1.5 hidden sm:inline">Download Season</span>
      </Button>
    </div>
  );
}
