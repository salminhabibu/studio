// src/components/features/tv-series/TVSeriesClientContent.tsx
"use client";

import type { TMDBTVSeries } from "@/types/tmdb";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PlayCircleIcon } from "lucide-react";
import { getFullImagePath } from "@/lib/tmdb";
import { useState } from "react";

interface TVSeriesClientContentProps {
  series: TMDBTVSeries;
  trailerKey: string | null;
  children: React.ReactNode;
}

export function TVSeriesClientContent({ series, trailerKey, children }: TVSeriesClientContentProps) {
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);

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
           {trailerKey && (
            <Button
              size="lg"
              className="mt-2 sm:mt-3 h-11 px-5 sm:h-12 sm:px-7 text-base sm:text-lg group/button self-start animate-fade-in-up"
              onClick={() => setIsTrailerModalOpen(true)}
            >
              <PlayCircleIcon className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover/button:scale-110" />
              Watch Trailer
            </Button>
          )}
        </div>
      </div>

      {children}

      <Dialog open={isTrailerModalOpen} onOpenChange={setIsTrailerModalOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] p-0 border-0 bg-black/90 backdrop-blur-md aspect-video rounded-lg overflow-hidden">
          {trailerKey && (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          )}
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
      `}</style>
    </>
  );
}
