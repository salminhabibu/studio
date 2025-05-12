// src/components/features/tv-series/DownloadAllSeasonsWithOptionsButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ServerIcon, Loader2Icon } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConceptualAria2Task } from "@/types/download";

interface DownloadAllSeasonsWithOptionsButtonProps {
  seriesId: number | string;
  seriesName: string; 
  seriesTitle: string; 
}

const qualities = ["1080p (FHD)", "720p (HD)", "480p (SD)", "Any Available"];

export function DownloadAllSeasonsWithOptionsButton({
  seriesId,
  seriesName,
  seriesTitle,
}: DownloadAllSeasonsWithOptionsButtonProps) {
  const { toast } = useToast();
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadAllSeasons = async () => {
    setIsLoading(true);
    const taskDisplayName = `${seriesTitle} - All Seasons`;
    console.log(
      `[DownloadAllSeasons] Initiating server download for ALL seasons of ${seriesTitle} (ID: ${seriesId}) in ${selectedQuality}`
    );
    
    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: taskDisplayName,
                seriesTitle, 
                season: 'all', 
                quality: selectedQuality,
                type: 'tv_season_pack_all' 
            })
        });
        const result = await response.json();
        if (response.ok && result.taskId) {
            toast({ 
                title: "Sent to Server Download", 
                description: `All seasons of ${seriesName} (${selectedQuality}) sent to server. Task ID: ${result.taskId}. Check Downloads page.` 
            });
            
            const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
            const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
            const newTask: ConceptualAria2Task = {
                taskId: result.taskId,
                name: result.taskName || taskDisplayName,
                quality: selectedQuality,
                addedTime: Date.now(),
                sourceUrlOrIdentifier: `${seriesTitle} All Seasons`,
                type: 'tv_season_pack_all',
            };
            if (!conceptualTasks.find(task => task.taskId === result.taskId)) {
                conceptualTasks.push(newTask);
                localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));
            }
        } else {
            toast({ title: "Server Download Error", description: result.error || "Failed to start 'All Seasons' download on server.", variant: "destructive" });
        }
    } catch (error) {
        console.error("[DownloadAllSeasons] Error calling Aria2 add API for all seasons:", error);
        toast({ title: "Server API Error", description: "Could not communicate with download server for 'All Seasons'.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Select value={selectedQuality} onValueChange={setSelectedQuality} disabled={isLoading}>
        <SelectTrigger className="w-full h-11 text-sm" disabled={isLoading} asChild={false}>
         <span><SelectValue placeholder="Select download quality" /></span>
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
        disabled={isLoading}
        aria-label={`Download all seasons of ${seriesName} in ${selectedQuality} via Server`}
      >
        {isLoading ? <Loader2Icon className="animate-spin h-5 w-5"/> : <ServerIcon className="h-5 w-5" /> } 
        <span className="ml-2">Download All Seasons</span>
      </Button>
       <p className="text-xs text-muted-foreground text-center">Note: Downloads full season packs via server.</p>
    </div>
  );
}

