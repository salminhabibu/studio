// src/components/features/home/HeroSection.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlayCircleIcon, FilmIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { TMDBMovie } from "@/types/tmdb";
import { getFullImagePath } from "@/lib/tmdb";
import { useState } from "react";

interface HeroSectionProps {
  movie: TMDBMovie | null;
  trailerKey: string | null;
}

export function HeroSection({ movie, trailerKey }: HeroSectionProps) {
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);

  if (!movie) {
    return (
      <section className="relative h-[60vh] min-h-[400px] rounded-xl overflow-hidden shadow-2xl group bg-muted flex flex-col items-center justify-center text-center p-6">
        <FilmIcon className="w-24 h-24 text-muted-foreground/50 mb-6" />
        <h1 className="text-3xl font-semibold text-muted-foreground">No Movie to Feature</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          We couldn&apos;t load a featured movie at this time. Please check back later.
        </p>
      </section>
    );
  }

  const movieTitle = movie.title;
  const movieTagline = movie.tagline || `Explore the latest in movies and TV series.`;

  return (
    <section className="relative h-[60vh] min-h-[400px] rounded-xl overflow-hidden shadow-2xl group">
      <Image
        src={getFullImagePath(movie.backdrop_path, "original")}
        alt={movieTitle ? `${movieTitle} backdrop` : "Featured Movie Banner"}
        fill
        className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
        data-ai-hint="movie backdrop"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 md:p-12 lg:p-16 space-y-3 sm:space-y-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
          {movieTitle}
        </h1>
        <p className="text-md sm:text-lg md:text-xl text-foreground/80 max-w-2xl shadow-black [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">
          {movieTagline}
        </p>
        {trailerKey && (
          <Dialog open={isTrailerModalOpen} onOpenChange={setIsTrailerModalOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="h-12 px-6 sm:h-14 sm:px-8 text-base sm:text-lg group/button self-start mt-2"
                onClick={() => setIsTrailerModalOpen(true)}
              >
                <PlayCircleIcon className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover/button:scale-110" />
                Watch Trailer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] p-0 border-0 bg-black/90 backdrop-blur-md aspect-video rounded-lg overflow-hidden">
              {/* The aspect-video on DialogContent ensures it maintains ratio. iframe needs to fill it. */}
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}
