// src/components/features/movies/MovieDownloadCard.tsx
"use client";

import { useState } from "react";
import type { TMDBMovie } from "@/types/tmdb"; // Keep for movie poster, homepage etc.
import type { TorrentFindResultItem } from '@/types/torrent';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added CardHeader, CardTitle
import { DownloadCloudIcon, ExternalLinkIcon, Loader2Icon, ServerIcon } from "lucide-react"; // Added DownloadCloudIcon, ServerIcon can be primary now
import Link from "next/link";
import Image from "next/image";
import { getFullImagePath } from "@/lib/tmdb";
// import { useWebTorrent } from "@/contexts/WebTorrentContext"; // WebTorrent functionality removed for now for simplicity, can be added back
import { useToast } from "@/hooks/use-toast";
// import type { ConceptualAria2Task } from "@/types/download"; // Not directly used for adding, but for tracking if that logic is kept


interface MovieDownloadCardProps {
  movieTitle: string;
  moviePosterPath?: string | null; // For the image
  movieHomepage?: string | null; // For the homepage link
  torrentOptions: TorrentFindResultItem[];
  dictionary: any; // For localization
  locale: string; // For potential future use, not used in example logic
}

export function MovieDownloadCard({ 
  movieTitle, 
  moviePosterPath,
  movieHomepage,
  torrentOptions, 
  dictionary, 
  locale 
}: MovieDownloadCardProps) {
  const { toast } = useToast();
  // const { addTorrent, isClientReady } = useWebTorrent(); // WebTorrent parts commented out
  const [selectedMagnet, setSelectedMagnet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!selectedMagnet) {
      toast({ 
        title: dictionary?.selectQualityTitle || "Select Option", 
        description: dictionary?.selectQualityDesc || "Please select a download option.", 
        variant: "destructive" 
      });
      return;
    }
    setIsLoading(true);
    console.log(`[MovieDownloadCard] Initiating Aria2 download for ${movieTitle}, Magnet: ${selectedMagnet.substring(0,50)}...`);
    
    try {
        const response = await fetch('/api/aria2/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Body uses 'uri' for magnet links as per typical Aria2 usage
            body: JSON.stringify({ uri: selectedMagnet, options: { dir: `movies/${movieTitle}` }, name: movieTitle }) 
        });
        const result = await response.json();

        if (response.ok && result.taskId) {
            toast({ 
                title: dictionary?.downloadStartedServerTitle || "Sent to Server Download", 
                description: `${movieTitle} sent to server. Task ID: ${result.taskId}. Check Downloads page.` 
            });
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
            alt={`${movieTitle} poster`}
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
            <Select onValueChange={(value) => setSelectedMagnet(value)} value={selectedMagnet || ""}>
              <SelectTrigger className="h-11 text-xs">
                <SelectValue placeholder={dictionary?.selectQualityPlaceholder || "Select quality..."} />
              </SelectTrigger>
              <SelectContent>
                {torrentOptions.map((opt, index) => (
                  <SelectItem key={index} value={opt.magnetLink} className="text-xs">
                    <div className="flex flex-col gap-0.5 py-1">
                       <span className="font-semibold truncate" title={opt.fileName}>{opt.fileName}</span>
                       <span className="text-muted-foreground">
                         {opt.torrentQuality || 'N/A'} | {opt.size} | Seeds: {opt.seeds ?? 'N/A'}
                       </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleDownload} 
              disabled={!selectedMagnet || isLoading} 
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

