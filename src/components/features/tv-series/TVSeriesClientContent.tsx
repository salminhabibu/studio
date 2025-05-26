// src/components/features/tv-series/TVSeriesClientContent.tsx
"use client";

import type { TMDBTVSeries } from "@/types/tmdb";
import type { TorrentFindResultItem } from "@/types/torrent"; // Import the actual type
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PlayCircleIcon, PlayIcon, Loader2Icon } from "lucide-react";
import { getFullImagePath } from "@/lib/tmdb";
import { useState } from "react";
// import { VideoPlayer } from "@/components/features/streaming/VideoPlayer"; // Keep if you want player UI
import { useToast } from "@/hooks/use-toast";

interface TVSeriesClientContentProps {
  series: TMDBTVSeries;
  trailerKey: string | null;
  children: React.ReactNode;
  dictionary: any;
  locale: string; // Already present, good.
  // New props related to torrent fetching, passed from parent page.tsx
  seasonPackResults: Map<number, TorrentFindResultItem[]>;
  isLoadingTorrents: boolean;
  torrentError: string | null;
}

export function TVSeriesClientContent({ 
  series, 
  trailerKey, 
  children, 
  dictionary, 
  locale, 
  seasonPackResults, // These are now available if TVSeriesClientContent needs them
  isLoadingTorrents, 
  torrentError 
}: TVSeriesClientContentProps) {
  // For this subtask, TVSeriesClientContent doesn't directly use seasonPackResults, isLoadingTorrents, or torrentError.
  // The loading/error UI for torrents is handled within the `children` passed from page.tsx.
  // These props are declared here to correctly type the component based on what page.tsx passes.
  const { toast } = useToast();
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  // const [streamUrl, setStreamUrl] = useState<string | null>(null); // Stubbed
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

  const handlePlaySeries = async () => {
    setIsPlayLoading(true);
    const firstSeason = series.seasons?.find(s => s.season_number > 0 && s.episode_count > 0) || series.seasons?.[0];
    const episodeToPlayTitle = firstSeason 
      ? `${series.name} - S${String(firstSeason.season_number).padStart(2,'0')}E01 (${dictionary?.exampleEpisodeSuffix || 'Example'})` 
      : series.name;
    setStreamTitle(episodeToPlayTitle);

    console.log(`[TVSeriesClientContent] "Play Series" clicked for: ${series.name}. Backend call stubbed.`);
    toast({
      title: "Playback (Stubbed)",
      description: `Playing series "${series.name}". Feature to be fully implemented.`,
    });
    // setStreamUrl("placeholder_stream_url_series");
    setIsPlayerModalOpen(true);
    setTimeout(() => setIsPlayLoading(false), 1500);
  };


  return (
    <>
      <div className="relative h-[45vh] sm:h-[50vh] md:h-[60vh] min-h-[280px] sm:min-h-[350px] md:min-h-[400px] rounded-lg sm:rounded-xl overflow-hidden shadow-2xl group mb-6 sm:mb-8">
        <Image
          src={getFullImagePath(series.backdrop_path, "original")}
          alt={`${series.name} ${dictionary?.backdropAltText || 'backdrop'}`}
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
          <div className="mt-2 sm:mt-3 flex flex-wrap gap-3 animate-fade-in-up animation-delay-200">
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
          {/* <VideoPlayer src={streamUrl!} title={streamTitle || series.name} /> */}
          <div className="w-full h-full flex items-center justify-center bg-black text-white">
             {isPlayLoading ? <Loader2Icon className="h-12 w-12 animate-spin" /> : (streamTitle ? `Video Player for: ${streamTitle} (Stubbed)` : "Video Player (Stubbed)")}
           </div>
        </DialogContent>
      </Dialog>

       <style jsx global>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0; 
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
