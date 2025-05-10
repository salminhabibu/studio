// src/components/features/movies/MovieDownloadCard.tsx
"use client";

import { useState } from "react";
import type { TMDBMovie } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DownloadIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getFullImagePath } from "@/lib/tmdb";
import { useWebTorrent } from "@/contexts/WebTorrentContext";
import { useToast } from "@/hooks/use-toast";

interface MovieDownloadCardProps {
  movie: TMDBMovie & { magnetLink?: string }; 
}

const qualities = ["1080p (FHD)", "720p (HD)", "Any Available"]; 

export function MovieDownloadCard({ movie }: MovieDownloadCardProps) {
  const { toast } = useToast();
  const { addTorrent } = useWebTorrent();
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]); 
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadMovie = async () => {
    if (!movie.magnetLink) {
      toast({
        title: "Download Not Available",
        description: `No download link found for ${movie.title}.`,
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    console.log(
      `[MovieDownloadCard] Adding torrent for ${movie.title} (Quality preference: ${selectedQuality})`
    );
    
    try {
      const torrent = await addTorrent(movie.magnetLink, movie.title, movie.id);

      if (torrent) {
        toast({
          title: "Download Started",
          description: `${movie.title} is being added to your active downloads.`,
        });
      } else {
        // This case might happen if the torrent with the same magnetURI is already added
        // or if client failed to initialize or add.
        toast({
          title: "Download Issue",
          description: `${movie.title} might already be in your active downloads or failed to add. Check the Downloads page.`,
          variant: "default", 
        });
      }
    } catch (error) {
        console.error("[MovieDownloadCard] Error adding torrent:", error);
        toast({
            title: "Download Error",
            description: "An unexpected error occurred while trying to start the download.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
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
        />
      </div>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold mb-1">Download Movie</h3>
          <Select value={selectedQuality} onValueChange={setSelectedQuality}>
            <SelectTrigger className="w-full h-11 text-sm">
              <SelectValue placeholder="Select quality" />
            </SelectTrigger>
            <SelectContent>
              {qualities.map(quality => (
                <SelectItem key={quality} value={quality} className="text-sm">{quality}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="lg" 
            className="w-full mt-2 h-12" 
            onClick={handleDownloadMovie} 
            disabled={isLoading || !movie.magnetLink}
          >
            {isLoading ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : <DownloadIcon className="mr-2 h-5 w-5" />}
            {isLoading ? 'Adding...' : (movie.magnetLink ? 'Download' : 'Unavailable')}
          </Button>
        </div>
        {movie.homepage && (
          <Button variant="outline" className="w-full" asChild>
            <Link href={movie.homepage} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="mr-2 h-4 w-4" /> Visit Homepage
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
