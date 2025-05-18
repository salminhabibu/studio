// src/components/features/tv-series/TVSeriesClientContent.tsx
"use client";

import type { TMDBTVSeries } from "@/types/tmdb";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"; // Added DialogTitle
import { PlayCircleIcon, PlayIcon, Loader2Icon } from "lucide-react";
import { getFullImagePath } from "@/lib/tmdb";
import { useState } from "react";
import { VideoPlayer } from "@/components/features/streaming/VideoPlayer";
import { useToast } from "@/hooks/use-toast";

interface TVSeriesClientContentProps {
  series: TMDBTVSeries;
  trailerKey: string | null;
  children: React.ReactNode;
  dictionary: any; // For localized text
  locale: string;
}

export function TVSeriesClientContent({ series, trailerKey, children, dictionary, locale }: TVSeriesClientContentProps) {
  const { toast } = useToast();
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  
  // States for the main series play (e.g., play first episode or if series itself is streamable)
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamTitle, setStreamTitle] = useState<string>("");
  const [isPlayLoading, setIsPlayLoading] = useState(false);


  const handleWatchTrailer = () => {
    if (trailerKey) {
      setIsTrailerModalOpen(true);
    } else {
         toast({
            title: dictionary?.noTrailerToastTitle || "Trailer Unavailable",
            description: dictionary?.noTrailerToastDesc || "No trailer found for this series.",
            variant: "default"
        })
    }
  };

  // This function is for playing the series itself, e.g., its first available episode
  // Individual episodes will have their own play handlers in SeasonAccordionItem
  const handlePlaySeries = async () => {
    setIsPlayLoading(true);
    setStreamUrl(null);
    setStreamTitle("");

    // Find first available episode to play (simple logic for now)
    const firstSeason = series.seasons?.find(s => s.season_number > 0 && s.episode_count > 0) || series.seasons?.[0];
    if (!firstSeason) {
        toast({ title: dictionary?.toastStreamErrorTitle || "Streaming Error", description: "No seasons available to play.", variant: "destructive"});
        setIsPlayLoading(false);
        return;
    }
    // In a real scenario, you'd fetch episode 1 of season 1 or similar
    const episodeToPlay = { season: firstSeason.season_number, episode: 1, title: `${series.name} - S${String(firstSeason.season_number).padStart(2,'0')}E01 (Example)` };


    try {
      const response = await fetch(`/api/stream`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_BACKEND_API_KEY || "",
         },
        body: JSON.stringify({ 
          tmdbSeriesId: series.id,
          title: series.name, // Series title
          type: 'tv_episode', // Assuming we play an episode
          season: episodeToPlay.season,
          episode: episodeToPlay.episode,
          preferredQuality: localStorage.getItem("chillymovies-preferred-streaming-quality") || '1080p',
        }),
      });

      if (!response.ok) {
        let errorPayload = { message: dictionary?.toastServerAPIErrorDesc || 'Server API Error' };
        try { errorPayload = await response.json(); } catch (e) {}
        throw new Error(errorPayload.message || `Server error: ${response.status}`);
      }

      const { streamId, streamTitle: actualStreamTitle, fileName } = await response.json();
      if (streamId) {
        setStreamUrl(`/api/watch/${streamId}/${encodeURIComponent(fileName || episodeToPlay.title)}`);
        setStreamTitle(actualStreamTitle || episodeToPlay.title);
        setIsPlayerModalOpen(true);
        toast({ title: dictionary?.toastSuccessStreamTitle || "Stream Ready", description: `${actualStreamTitle || episodeToPlay.title}`});
      } else {
        throw new Error(dictionary?.toastStreamErrorDesc || "Failed to get stream ID from server.");
      }
    } catch (error) {
      console.error("[TVSeriesClientContent] Error initiating series stream:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: dictionary?.toastStreamErrorTitle || "Streaming Error",
        description: `${dictionary?.toastStreamErrorDesc || "Could not start stream:"} ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsPlayLoading(false);
    }
  };


  return (
    <>
      {/* Hero section */}
      <div className="relative h-[45vh] sm:h-[50vh] md:h-[60vh] min-h-[280px] sm:min-h-[350px] md:min-h-[400px] rounded-lg sm:rounded-xl overflow-hidden shadow-2xl group mb-6 sm:mb-8">
        <Image
          src={getFullImagePath(series.backdrop_path, "original")}
          alt={`${series.name} backdrop`}
          fill
          className="object-cover object-center sm:object-top transition-transform duration-500 ease-in-out group-hover:scale-105"
          priority
          data-ai-hint="tv series backdrop"
          sizes="(max-width: 768px) 100vw, 80vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-8 z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
            {series.name}
          </h1>
          {series.tagline && (
            <p className="text-md sm:text-lg md:text-xl text-muted-foreground italic mt-1 max-w-xl shadow-black [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">
              {series.tagline}
            </p>
          )}
          <div className="mt-2 sm:mt-3 space-x-3 animate-fade-in-up animation-delay-200">
            <Button
              size="lg"
              className="h-11 px-5 sm:h-12 sm:px-7 text-base sm:text-lg group/button self-start"
              onClick={handlePlaySeries}
              disabled={isPlayLoading}
            >
              {isPlayLoading ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : <PlayIcon className="mr-2 h-5 w-5" />}
              {dictionary?.playSeriesButton || "Play Series"}
            </Button>
            {trailerKey && (
                <Button
                variant="outline"
                size="lg"
                className="h-11 px-5 sm:h-12 sm:px-7 text-base sm:text-lg group/button self-start"
                onClick={handleWatchTrailer}
                >
                <PlayCircleIcon className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover/button:scale-110" />
                {dictionary?.watchTrailerButton || "Watch Trailer"}
                </Button>
            )}
           </div>
        </div>
      </div>

      {children}

      <Dialog open={isTrailerModalOpen} onOpenChange={setIsTrailerModalOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] p-0 border-0 bg-black/90 backdrop-blur-md aspect-video rounded-lg overflow-hidden">
          <DialogTitle className="sr-only">{dictionary?.trailerModalTitle || "Series Trailer"}</DialogTitle>
          {trailerKey && (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
              title={dictionary?.trailerModalTitle || "Series Trailer"}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPlayerModalOpen} onOpenChange={setIsPlayerModalOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] p-0 border-0 bg-black/95 backdrop-blur-md aspect-video rounded-lg overflow-hidden">
          <DialogTitle className="sr-only">{streamTitle || (dictionary?.streamingVideoTitle || "Streaming Video")}</DialogTitle>
          {streamUrl && <VideoPlayer src={streamUrl} title={streamTitle || series.name} />}
        </DialogContent>
      </Dialog>

       <style jsx global>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0; /* Start hidden for animation */
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animation-delay-200 { animation-delay: 0.2s; }
      `}</style>
    </>
  );
}
