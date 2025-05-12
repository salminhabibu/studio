// src/components/features/movies/MovieDownloadCard.tsx
"use client";

import { useState, useEffect } from "react";
import type { TMDBMovie } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadIcon, ExternalLinkIcon, Loader2Icon, ServerIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getFullImagePath } from "@/lib/tmdb";
import { useWebTorrent } from "@/contexts/WebTorrentContext";
import { useToast } from "@/hooks/use-toast";
import type { ConceptualAria2Task } from "@/types/download";

interface MovieDownloadCardProps {
  movie: TMDBMovie & { magnetLink?: string; torrentQuality?: string }; 
}

const qualities = ["1080p (FHD)", "720p (HD)", "Any Available"]; 

export function MovieDownloadCard({ movie }: MovieDownloadCardProps) {
  const { toast } = useToast();
  const { addTorrent, isClientReady } = useWebTorrent();
  const [selectedQuality, setSelectedQuality] = useState(movie.torrentQuality || qualities[0]); 
  const [isWebTorrentLoading, setIsWebTorrentLoading] = useState(false);
  const [isAria2Loading, setIsAria2Loading] = useState(false);

  useEffect(() => {
    if (movie.torrentQuality) {
      setSelectedQuality(movie.torrentQuality);
    }
  }, [movie.torrentQuality]);


  const handleWebTorrentDownload = async () => {
    if (!isClientReady) {
      toast({ title: "WebTorrent Not Ready", description: "Please wait for the WebTorrent client to initialize.", variant: "destructive" });
      return;
    }
    if (!movie.magnetLink) {
      toast({ title: "Download Not Available", description: `No WebTorrent link found for ${movie.title}.`, variant: "destructive" });
      return;
    }
    setIsWebTorrentLoading(true);
    console.log(`[MovieDownloadCard] Adding WebTorrent for ${movie.title}, Magnet: ${movie.magnetLink ? movie.magnetLink.substring(0,50) + '...' : 'N/A'}`);
    
    try {
      const torrent = await addTorrent(movie.magnetLink, movie.title, movie.id);
      if (torrent) {
        toast({ title: "Download Queued (WebTorrent)", description: `${movie.title} is being added to your active downloads.` });
      } else {
        toast({ title: "WebTorrent Issue", description: `${movie.title} might already be in downloads or failed to add. Check for existing torrents or try again.`, variant: "default" });
      }
    } catch (error) {
        console.error("[MovieDownloadCard] Error adding WebTorrent:", error);
        toast({ title: "WebTorrent Error", description: `Could not start WebTorrent download: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
        setIsWebTorrentLoading(false);
    }
  };

  const handleAria2Download = async () => {
    setIsAria2Loading(true);
    console.log(`[MovieDownloadCard] Initiating SIMULATED Aria2 download for ${movie.title} (Quality: ${selectedQuality})`);
    
    if (!movie.magnetLink && !movie.imdb_id) {
        toast({ title: "Server Download Unavailable", description: "No identifier for server download simulation.", variant: "destructive"});
        setIsAria2Loading(false);
        return;
    }

    const identifier = movie.magnetLink || movie.imdb_id!;
    const type = movie.magnetLink ? 'magnet' : 'imdb_id';

    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, type, name: movie.title, quality: selectedQuality })
        });
        const result = await response.json();

        if (response.ok && result.taskId) {
            toast({ 
                title: "Server Download Sent (Simulated)", 
                description: `${movie.title} (${selectedQuality}) sent to conceptual server. Task ID: ${result.taskId}. Check Downloads page. Note: This is a simulation.` 
            });
            
            const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
            const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
            
            const newTask: ConceptualAria2Task = {
                taskId: result.taskId,
                name: result.taskName || movie.title,
                quality: selectedQuality,
                addedTime: Date.now(),
                sourceUrlOrIdentifier: identifier,
                type: type,
            };
            
            if (!conceptualTasks.find(task => task.taskId === result.taskId)) {
                conceptualTasks.push(newTask);
                localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));
            }

        } else {
            toast({ title: "Server Download Error (Simulated)", description: result.error || "Failed to start server download simulation.", variant: "destructive" });
        }
    } catch (error) {
        console.error("[MovieDownloadCard] Error calling conceptual Aria2 add API:", error);
        toast({ title: "Server API Error (Simulated)", description: "Could not communicate with conceptual download server.", variant: "destructive" });
    } finally {
        setIsAria2Loading(false);
    }
  };


  return (
    <Card className="overflow-hidden shadow-xl sticky top-24">
      <div className="aspect-[2/3] relative w-full bg-muted">
        <Image
          src={getFullImagePath(movie.poster_path, "w500")}
          alt={`${movie.title} poster`}
          fill
          className="object-cover"
          data-ai-hint="movie poster"
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 33vw, 25vw"
          priority
        />
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <h3 className="text-base font-semibold mb-1">Download Options</h3>
          <p className="text-xs text-muted-foreground">
            {movie.magnetLink ? `WebTorrent available (Quality: ${movie.torrentQuality || 'Unknown'})` : 'WebTorrent link not found.'}
          </p>
          <Button 
            size="lg" 
            className="w-full h-11 text-sm" 
            onClick={handleWebTorrentDownload} 
            disabled={isWebTorrentLoading || !movie.magnetLink || !isClientReady}
          >
            {isWebTorrentLoading ? <Loader2Icon className="animate-spin h-5 w-5" /> : <DownloadIcon className="h-5 w-5" />}
            <span className="ml-2">{isClientReady ? 'Download (WebTorrent)' : 'WebTorrent Loading...'}</span>
          </Button>
        </div>
        
        <div className="space-y-2 pt-2 border-t border-border/30">
            <h4 className="text-sm font-medium text-muted-foreground">Server Download (Simulated)</h4>
             <Select value={selectedQuality} onValueChange={setSelectedQuality} disabled={isAria2Loading}>
                <SelectTrigger className="w-full h-10 text-xs">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  {qualities.map(quality => (
                    <SelectItem key={quality} value={quality} className="text-xs">{quality}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            <Button
                size="lg"
                variant="secondary"
                className="w-full h-11 text-sm"
                onClick={handleAria2Download}
                disabled={isAria2Loading}
            >
                {isAria2Loading ? <Loader2Icon className="animate-spin h-5 w-5" /> : <ServerIcon className="h-5 w-5" />}
                <span className="ml-2">Download (Server - Sim)</span>
            </Button>
        </div>

        {movie.homepage && (
          <Button variant="outline" className="w-full h-10 text-sm mt-2" asChild>
            <Link href={movie.homepage} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="h-4 w-4 mr-2" /> Visit Homepage
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
