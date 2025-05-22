// src/components/features/movies/MovieClientContent.tsx
"use client";

import type { TMDBMovie } from "@/types/tmdb";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PlayCircleIcon, PlayIcon, Loader2Icon, DownloadIcon } from "lucide-react"; // Added DownloadIcon
import { getFullImagePath } from "@/lib/tmdb";
import { useState } from "react";
// import { VideoPlayer } from "@/components/features/streaming/VideoPlayer"; // Keep if you want player UI, but stub source
import { useToast } from "@/hooks/use-toast";
import { useDownload } from "@/contexts/DownloadContext"; // Added useDownload
import { DownloadTaskCreationData } from "@/types/download"; // Added DownloadTaskCreationData

interface MovieClientContentProps {
  movie: TMDBMovie;
  trailerKey: string | null;
  children: React.ReactNode;
  dictionary: any; 
  locale: string; 
}

export function MovieClientContent({ movie, trailerKey, children, dictionary, locale }: MovieClientContentProps) {
  const { toast } = useToast();
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  // const [streamUrl, setStreamUrl] = useState<string | null>(null); // Stubbed
  const [streamTitle, setStreamTitle] = useState<string>("");
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const { addDownloadTask } = useDownload(); // Added

  const handleWatchTrailer = () => {
    if (trailerKey) {
      setIsTrailerModalOpen(true);
    } else {
        toast({
            title: dictionary?.noTrailerToastTitle || "Trailer Unavailable",
            description: dictionary?.noTrailerToastDesc || "No trailer found for this movie.",
            variant: "default"
        })
    }
  };

  const handlePlayMovie = async () => {
    setIsPlayLoading(true);
    setStreamTitle(movie.title);
    console.log(`[MovieClientContent] "Play Movie" clicked for: ${movie.title}. Backend call stubbed.`);
    toast({
      title: "Playback (Stubbed)",
      description: `Playing "${movie.title}". Feature to be fully implemented.`,
    });
    // Simulate a delay then open modal with placeholder
    // setStreamUrl("placeholder_stream_url"); // Or keep null and let VideoPlayer handle it
    setIsPlayerModalOpen(true); 
    setTimeout(() => setIsPlayLoading(false), 1500);
  };

  const handleDownloadMovie = async () => {
    if (!movie.magnetLink || !movie.id) {
      toast({ 
        title: dictionary?.downloadNotAvailableTitle || "Download Not Available", 
        description: dictionary?.downloadNotAvailableDesc || "No download source found for this movie.", 
        variant: "default" 
      });
      return;
    }

    const taskData: DownloadTaskCreationData = {
      title: movie.title,
      type: 'movie' as 'movie', // Ensure type literal
      source: movie.magnetLink,
      metadata: { 
        tmdbId: movie.id.toString(), // Ensure tmdbId is string if your type expects string
        imdbId: movie.imdb_id, 
        quality: movie.torrentQuality || 'Unknown', // Use torrentQuality if available
        posterPath: movie.poster_path, // For display in download list
        releaseDate: movie.release_date,
        // Add any other relevant movie metadata
      },
      // destinationPath could be set by a global setting later
    };
    
    // addDownloadTask will show its own toasts for success/failure
    await addDownloadTask(taskData);
  };

  return (
    <>
      <div className="relative h-[60vh] min-h-[300px] md:min-h-[400px] lg:min-h-[500px] rounded-xl overflow-hidden shadow-2xl group mb-8">
        <Image
          src={getFullImagePath(movie.backdrop_path, "original")}
          alt={`${movie.title} ${dictionary?.backdropAltText || 'backdrop'}`}
          fill
          className="object-cover object-top transition-transform duration-500 ease-in-out group-hover:scale-105"
          priority
          data-ai-hint="movie backdrop"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-10 z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
            {movie.title}
          </h1>
          {movie.tagline && (
            <p className="text-lg md:text-xl text-muted-foreground italic mt-1 shadow-black [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">
              {movie.tagline}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 animate-fade-in-up animation-delay-200">
            <Button
              size="lg"
              className="h-12 px-6 sm:h-14 sm:px-8 text-base sm:text-lg group/button"
              onClick={handlePlayMovie}
              disabled={isPlayLoading || !movie.id} 
            >
              {isPlayLoading ? <Loader2Icon className="animate-spin h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
              <span className="ml-2">{dictionary?.playMovieButton || "Play Movie"}</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 sm:h-14 sm:px-8 text-base sm:text-lg group/button"
              onClick={handleWatchTrailer}
              disabled={!trailerKey}
            >
              <PlayCircleIcon className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover/button:scale-110" />
              {dictionary?.watchTrailerButton || "Watch Trailer"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 sm:h-14 sm:px-8 text-base sm:text-lg group/button"
              onClick={handleDownloadMovie}
              disabled={!movie.magnetLink || !movie.id} // Disable if no magnet link or ID
            >
              <DownloadIcon className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover/button:scale-110" />
              {dictionary?.downloadMovieButton || "Download"}
            </Button>
          </div>
        </div>
      </div>

      {children}

      <Dialog open={isTrailerModalOpen} onOpenChange={setIsTrailerModalOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] p-0 border-0 bg-black/90 backdrop-blur-md aspect-video rounded-lg overflow-hidden">
           <DialogTitle className="sr-only">{dictionary?.trailerModalTitle || "Movie Trailer"}</DialogTitle>
          {trailerKey && (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
              title={dictionary?.trailerModalTitle || "Movie Trailer"}
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
          {/* VideoPlayer can show a "No source" message or be hidden if streamUrl is null */}
          {/* <VideoPlayer src={streamUrl!} title={streamTitle || movie.title} /> */}
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
