// src/components/features/home/HeroSection.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlayCircleIcon, FilmIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TMDBMovie } from "@/types/tmdb";
import { getFullImagePath } from "@/lib/tmdb";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface HeroItem {
  movie: TMDBMovie;
  trailerKey: string | null;
}

interface HeroSectionProps {
  items: HeroItem[];
  homeDictionary: any; // Dictionary for home page specific texts
}

export function HeroSection({ items, homeDictionary }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? items.length - 1 : prevIndex - 1
    );
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === items.length - 1 ? 0 : prevIndex + 1
    );
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1 || isHovering || isTrailerModalOpen) {
      return; 
    }
    const timer = setInterval(() => {
      goToNext();
    }, 7000); // Autoplay every 7 seconds
    return () => clearInterval(timer);
  }, [currentIndex, items.length, isHovering, isTrailerModalOpen, goToNext]);


  const handleWatchTrailer = (key: string | null) => {
    if (key) {
      setActiveTrailerKey(key);
      setIsTrailerModalOpen(true);
    }
  };

  if (!items || items.length === 0) {
    return (
      <section className="relative h-[60vh] min-h-[400px] rounded-xl overflow-hidden shadow-2xl group bg-muted flex flex-col items-center justify-center text-center p-6">
        <FilmIcon className="w-24 h-24 text-muted-foreground/50 mb-6" />
        <h1 className="text-3xl font-semibold text-muted-foreground">{homeDictionary?.featuredContentTitle || "Featured Content"}</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          {homeDictionary?.noMovies || "We couldn't load featured movies at this time. Please check back later."}
        </p>
      </section>
    );
  }

  const currentItem = items[currentIndex];
  const movieTitle = currentItem.movie.title;
  const movieTagline = currentItem.movie.tagline || `Explore the latest in movies and TV series.`;

  return (
    <section 
      className="relative h-[60vh] min-h-[400px] rounded-xl overflow-hidden shadow-2xl group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative w-full h-full">
        {items.map((item, index) => (
          <div
            key={item.movie.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            )}
          >
            <Image
              src={getFullImagePath(item.movie.backdrop_path, "original")}
              alt={item.movie.title ? `${item.movie.title} backdrop` : "Featured Movie Banner"}
              fill
              className="object-cover"
              data-ai-hint="movie backdrop"
              priority={index === 0} // Prioritize first image
              sizes="100vw"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
          </div>
        ))}
      </div>
      
      {/* Keyed content wrapper for smoother text transitions */}
      <div 
        key={`hero-content-${currentItem.movie.id}`} 
        className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 md:p-12 lg:p-16 space-y-3 sm:space-y-4 z-20"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)] animate-fade-in-up">
          {movieTitle}
        </h1>
        <p className="text-md sm:text-lg md:text-xl text-foreground/80 max-w-2xl shadow-black [text-shadow:_0_1px_2px_var(--tw-shadow-color)] animate-fade-in-up animation-delay-200">
          {movieTagline}
        </p>
        {currentItem.trailerKey && (
           <Button 
            size="lg" 
            className="h-12 px-6 sm:h-14 sm:px-8 text-base sm:text-lg group/button self-start mt-2 animate-fade-in-up animation-delay-400"
            onClick={() => handleWatchTrailer(currentItem.trailerKey)}
          >
            <PlayCircleIcon className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover/button:scale-110" />
            {homeDictionary?.heroWatchTrailerButton || "Watch Trailer"}
          </Button>
        )}
      </div>

      {items.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-primary"
            onClick={goToPrevious}
            aria-label="Previous movie"
          >
            <ChevronLeftIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-primary"
            onClick={goToNext}
            aria-label="Next movie"
          >
            <ChevronRightIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
            {items.map((_, index) => (
              <button
                key={`dot-${index}`}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full transition-all duration-300",
                  currentIndex === index ? "bg-primary scale-125" : "bg-white/50 hover:bg-white/80"
                )}
                aria-label={`Go to movie ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <Dialog open={isTrailerModalOpen} onOpenChange={setIsTrailerModalOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] p-0 border-0 bg-black/90 backdrop-blur-md aspect-video rounded-lg overflow-hidden">
          <DialogTitle className="sr-only">{homeDictionary?.heroTrailerModalTitle || "Content Trailer"}</DialogTitle>
          {activeTrailerKey ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${activeTrailerKey}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
              title={homeDictionary?.heroTrailerModalTitle || "Content Trailer"}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
                <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <style jsx global>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
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
        .animation-delay-200 { animation-delay: 0.2s; opacity:0; }
        .animation-delay-400 { animation-delay: 0.4s; opacity:0; }
      `}</style>
    </section>
  );
}
