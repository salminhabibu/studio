// src/components/features/movies/MovieDownloadCard.tsx
"use client";

import { useState } from "react";
import type { TMDBMovie } from "@/types/tmdb"; 
import type { TorrentFindResultItem } from '@/types/torrent';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { DownloadCloudIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react"; 
import Link from "next/link";
import Image from "next/image";
import { getFullImagePath } from "@/lib/tmdb";
import { useToast } from "@/hooks/use-toast";
// ConceptualAria2Task might be relevant if we were to update localStorage here,
// but the main task is to send the correct payload to the API.
// import type { ConceptualAria2Task } from "@/types/download"; 

interface MovieDownloadCardProps {
  movieId: string; // Added movieId (TMDB ID)
  movieTitle: string;
  moviePosterPath?: string | null; 
  movieHomepage?: string | null; 
  torrentOptions: TorrentFindResultItem[];
  dictionary: any; 
  locale: string; 
}

export function MovieDownloadCard({ 
  movieId, // Destructure new prop
  movieTitle, 
  moviePosterPath,
  movieHomepage,
  torrentOptions, 
  dictionary, 
  locale 
}: MovieDownloadCardProps) {
  const { toast } = useToast();
  const [selectedTorrent, setSelectedTorrent] = useState<TorrentFindResultItem | null>(null); // Store full object
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectChange = (magnetLink: string) => {
    const torrent = torrentOptions.find(opt => opt.magnetLink === magnetLink);
    setSelectedTorrent(torrent || null);
  };

  const handleDownload = async () => {
    if (!selectedTorrent) {
      toast({ 
        title: dictionary?.selectQualityTitle || "Select Option", 
        description: dictionary?.selectQualityDesc || "Please select a download option.", 
        variant: "destructive" 
      });
      return;
    }
    setIsLoading(true);
    
    const payload = {
      title: movieTitle,
      type: "movie",
      source: selectedTorrent.magnetLink,
      metadata: {
        tmdbId: movieId, // Use the new movieId prop
        selectedQuality: selectedTorrent.torrentQuality || "Unknown",
        fileName: selectedTorrent.fileName || movieTitle, // Fallback to movieTitle if fileName is not present
        // seeds: selectedTorrent.seeds, // Example of other metadata if needed by API
        // size: selectedTorrent.size,   // Example
      },
      destinationPath: `movies/${movieTitle}` // Optional, based on API capability
    };
    
    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) 
        });
        const result = await response.json();

        // Assuming the API returns a taskId (or gid from Aria2) on successful queuing
        if (response.ok && (result.taskId || result.gid)) {
            toast({ 
                title: dictionary?.downloadStartedServerTitle || "Download Started", 
                description: `${payload.metadata.fileName} sent to server. Task ID: ${result.taskId || result.gid}.` 
            });
            // Logic for ConceptualAria2Task storage would go here if needed client-side after API call
            // For example, if the API doesn't handle it:
            // const conceptualTasksString = localStorage.getItem('chillymovies-aria2-tasks');
            // const conceptualTasks: ConceptualAria2Task[] = conceptualTasksString ? JSON.parse(conceptualTasksString) : [];
            // const newTask: ConceptualAria2Task = { /* ... construct task ... */ };
            // localStorage.setItem('chillymovies-aria2-tasks', JSON.stringify(conceptualTasks));

        } else {
            toast({ 
              title: dictionary?.downloadErrorServerTitle || "Server Download Error", 
              description: result.error || "Failed to start server download.", 
              variant: "destructive" 
            });
        }
    } catch (error) {
        console.error("[MovieDownloadCard] Error calling Aria2 add API:", error);
        toast({ 
          title: dictionary?.errorServerApi || "Server API Error", 
          description: dictionary?.errorServerApiDesc || "Could not communicate with download server.", 
          variant: "destructive" 
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden shadow-xl sticky top-24">
      {moviePosterPath && (
        <div className="aspect-[2/3] relative w-full bg-muted">
          <Image
            src={getFullImagePath(moviePosterPath, "w500")}
            alt={`${movieTitle} ${dictionary?.posterAltText || 'poster'}`}
            fill
            className="object-cover"
            data-ai-hint="movie poster"
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 33vw, 25vw"
            priority
          />
        </div>
      )}
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-base">{dictionary?.downloadTitle || "Download Options"}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!torrentOptions || torrentOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dictionary?.noDownloadsAvailable || "No downloads available for this movie."}</p>
        ) : (
          <>
            <Select onValueChange={handleSelectChange} value={selectedTorrent?.magnetLink || ""}>
              <SelectTrigger className="h-11 text-xs">
                <SelectValue placeholder={dictionary?.selectQualityPlaceholder || "Select quality..."} />
              </SelectTrigger>
              <SelectContent>
                {torrentOptions.map((opt) => ( // Changed key to magnetLink for reliability
                  <SelectItem key={opt.magnetLink} value={opt.magnetLink} className="text-xs">
                    <div className="flex flex-col gap-0.5 py-1">
                       <span className="font-semibold truncate" title={opt.fileName}>{opt.fileName || dictionary?.unknownFileName || 'Unknown File Name'}</span>
                       <span className="text-muted-foreground">
                         {opt.torrentQuality || 'N/A'} | {opt.size || 'N/A'} | Seeds: {opt.seeds ?? 'N/A'}
                       </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleDownload} 
              disabled={!selectedTorrent || isLoading} 
              className="w-full h-11 text-sm"
            >
              {isLoading ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloudIcon className="mr-2 h-5 w-5" />}
              {dictionary?.downloadButton || "Download"}
            </Button>
          </>
        )}

        {movieHomepage && (
          <Button variant="outline" className="w-full h-10 text-sm mt-2" asChild>
            <Link href={movieHomepage} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="h-4 w-4 mr-2" /> {dictionary?.visitHomepageButton || "Visit Homepage"}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

