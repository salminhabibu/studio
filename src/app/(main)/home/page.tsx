// src/app/(main)/home/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getPopularMovies, getPopularTvSeries, getMovieDetails, getFullImagePath } from "@/lib/tmdb";
import type { TMDBBaseMovie, TMDBBaseTVSeries, TMDBMovie, TMDBVideo } from "@/types/tmdb";
import { HeroSection, type HeroItem } from '@/components/features/home/HeroSection';
import { RecommendedItemCard } from '@/components/features/common/RecommendedItemCard';
import { Loader2Icon, FilmIcon, Tv2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const SESSION_STORAGE_KEY_PREFIX = "chillymovies";
const HOME_STATE_KEY = `${SESSION_STORAGE_KEY_PREFIX}-home-page-state`;

interface HomePageState {
  heroItems: HeroItem[];
  popularMovies: TMDBBaseMovie[];
  popularTvSeries: TMDBBaseTVSeries[];
  moviesPage: number;
  tvSeriesPage: number;
  moviesTotalPages: number;
  tvSeriesTotalPages: number;
  scrollY: number;
}


export default function HomePage() {
  const [heroItems, setHeroItems] = useState<HeroItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBBaseMovie[]>([]);
  const [popularTvSeries, setPopularTvSeries] = useState<TMDBBaseTVSeries[]>([]);
  
  const [moviesPage, setMoviesPage] = useState(1);
  const [tvSeriesPage, setTvSeriesPage] = useState(1);
  
  const [moviesTotalPages, setMoviesTotalPages] = useState(1);
  const [tvSeriesTotalPages, setTvSeriesTotalPages] = useState(1);
  
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);
  const [isLoadingTvSeries, setIsLoadingTvSeries] = useState(false);
  const [isLoadingHero, setIsLoadingHero] = useState(true);

  const moviesObserver = useRef<IntersectionObserver>();
  const tvSeriesObserver = useRef<IntersectionObserver>();

  const hasRestoredStateRef = useRef(false);
  const scrollYToRestoreRef = useRef<number | null>(null);


  // Fetch hero items
  const fetchHeroData = useCallback(async () => {
    setIsLoadingHero(true);
    try {
      const moviesData = await getPopularMovies(1);
      const potentialHeroMovies = moviesData.results.filter(movie => movie.backdrop_path).slice(0, 10);
      
      const heroItemsDataPromises = potentialHeroMovies.map(async (movie) => {
        try {
          const movieDetails = await getMovieDetails(movie.id);
          const videos: TMDBVideo[] = movieDetails.videos?.results || [];
          const officialTrailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official) || videos.find(v => v.site === "YouTube" && v.type === "Trailer");
          return officialTrailer?.key ? { movie: movieDetails, trailerKey: officialTrailer.key } : null;
        } catch (e) { return null; }
      });
      
      const resolvedItems = (await Promise.all(heroItemsDataPromises)).filter((item): item is HeroItem => item !== null);
      setHeroItems(resolvedItems.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch hero content:", error);
    } finally {
      setIsLoadingHero(false);
    }
  }, []);

  const fetchMovies = useCallback(async (page: number) => {
    setIsLoadingMovies(true);
    try {
      const data = await getPopularMovies(page);
      setPopularMovies(prev => page === 1 ? data.results : [...prev, ...data.results]);
      setMoviesTotalPages(data.total_pages);
    } catch (error) {
      console.error("Failed to fetch popular movies:", error);
    } finally {
      setIsLoadingMovies(false);
    }
  }, []);

  const fetchTvSeries = useCallback(async (page: number) => {
    setIsLoadingTvSeries(true);
    try {
      const data = await getPopularTvSeries(page);
      setPopularTvSeries(prev => page === 1 ? data.results : [...prev, ...data.results]);
      setTvSeriesTotalPages(data.total_pages);
    } catch (error) {
      console.error("Failed to fetch popular TV series:", error);
    } finally {
      setIsLoadingTvSeries(false);
    }
  }, []);

  // Restore state on mount
  useEffect(() => {
    if (hasRestoredStateRef.current || typeof window === 'undefined') return;

    const savedStateString = sessionStorage.getItem(HOME_STATE_KEY);
    if (savedStateString) {
      try {
        const savedState: HomePageState = JSON.parse(savedStateString);
        console.log("[HomePage] Restoring state:", savedState);
        setHeroItems(savedState.heroItems);
        setPopularMovies(savedState.popularMovies);
        setPopularTvSeries(savedState.popularTvSeries);
        setMoviesPage(savedState.moviesPage);
        setTvSeriesPage(savedState.tvSeriesPage);
        setMoviesTotalPages(savedState.moviesTotalPages);
        setTvSeriesTotalPages(savedState.tvSeriesTotalPages);
        scrollYToRestoreRef.current = savedState.scrollY;

        setIsLoadingHero(false); // Assume hero items are restored
        setIsLoadingMovies(false);
        setIsLoadingTvSeries(false);
        
        hasRestoredStateRef.current = true;

        setTimeout(() => {
          if (scrollYToRestoreRef.current !== null) {
            console.log(`[HomePage] Attempting scroll to ${scrollYToRestoreRef.current}`);
            window.scrollTo({ top: scrollYToRestoreRef.current, behavior: 'auto' });
            scrollYToRestoreRef.current = null;
          }
        }, 100);
        return; // State restored, no need for initial fetches
      } catch (e) {
        console.error("[HomePage] Error parsing saved state:", e);
        sessionStorage.removeItem(HOME_STATE_KEY);
      }
    }
    // If no saved state or error parsing, proceed with initial fetches
    hasRestoredStateRef.current = true;
    fetchHeroData();
    fetchMovies(1);
    fetchTvSeries(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchHeroData, fetchMovies, fetchTvSeries are stable due to useCallback


  useEffect(() => {
    // Only fetch if not restored and page > 1
    if (hasRestoredStateRef.current && !sessionStorage.getItem(HOME_STATE_KEY) && moviesPage > 1) {
      fetchMovies(moviesPage);
    }
  }, [fetchMovies, moviesPage]);

  useEffect(() => {
    // Only fetch if not restored and page > 1
    if (hasRestoredStateRef.current && !sessionStorage.getItem(HOME_STATE_KEY) && tvSeriesPage > 1) {
      fetchTvSeries(tvSeriesPage);
    }
  }, [fetchTvSeries, tvSeriesPage]);

  // Save state
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined' && (popularMovies.length > 0 || popularTvSeries.length > 0 || heroItems.length > 0)) {
        const stateToSave: HomePageState = {
          heroItems,
          popularMovies,
          popularTvSeries,
          moviesPage,
          tvSeriesPage,
          moviesTotalPages,
          tvSeriesTotalPages,
          scrollY: window.scrollY,
        };
        sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify(stateToSave));
        console.log("[HomePage] Saved state:", stateToSave);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Also save on component unmount
    };
  }, [heroItems, popularMovies, popularTvSeries, moviesPage, tvSeriesPage, moviesTotalPages, tvSeriesTotalPages]);


  const lastMovieElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoadingMovies) return;
    if (moviesObserver.current) moviesObserver.current.disconnect();
    moviesObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && moviesPage < moviesTotalPages) {
        setMoviesPage(prevPage => prevPage + 1);
      }
    });
    if (node) moviesObserver.current.observe(node);
  }, [isLoadingMovies, moviesPage, moviesTotalPages]);

  const lastTvSeriesElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoadingTvSeries) return;
    if (tvSeriesObserver.current) tvSeriesObserver.current.disconnect();
    tvSeriesObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && tvSeriesPage < tvSeriesTotalPages) {
        setTvSeriesPage(prevPage => prevPage + 1);
      }
    });
    if (node) tvSeriesObserver.current.observe(node);
  }, [isLoadingTvSeries, tvSeriesPage, tvSeriesTotalPages]);

  return (
    <div className="space-y-10">
      <HeroSection items={heroItems} />
      
      <section className="space-y-6">
        <h2 className="text-3xl font-semibold text-foreground/90 flex items-center gap-2">
          <FilmIcon className="h-7 w-7 text-primary" /> Popular Movies
        </h2>
        {popularMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
            {popularMovies.map((movie, index) => (
              <RecommendedItemCard
                key={`${movie.id}-${index}`} // Ensure unique key if movies can repeat
                item={movie}
                mediaType="movie"
                ref={index === popularMovies.length - 1 ? lastMovieElementRef : null}
              />
            ))}
          </div>
        ) : (
          !isLoadingMovies && <p className="text-muted-foreground">No movies to display currently.</p>
        )}
        {isLoadingMovies && (
          <div className="flex justify-center py-6">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoadingMovies && moviesPage >= moviesTotalPages && popularMovies.length > 0 && (
          <p className="text-center text-muted-foreground py-4">You've reached the end of the movie list.</p>
        )}
      </section>

      <Separator className="my-8 md:my-12" />

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold text-foreground/90 flex items-center gap-2">
          <Tv2Icon className="h-7 w-7 text-primary" /> Popular TV Series
        </h2>
        {popularTvSeries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
            {popularTvSeries.map((series, index) => (
              <RecommendedItemCard
                key={`${series.id}-${index}`} // Ensure unique key
                item={series}
                mediaType="tv"
                ref={index === popularTvSeries.length - 1 ? lastTvSeriesElementRef : null}
              />
            ))}
          </div>
        ) : (
          !isLoadingTvSeries && <p className="text-muted-foreground">No TV series to display currently.</p>
        )}
        {isLoadingTvSeries && (
          <div className="flex justify-center py-6">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
         {!isLoadingTvSeries && tvSeriesPage >= tvSeriesTotalPages && popularTvSeries.length > 0 && (
          <p className="text-center text-muted-foreground py-4">You've reached the end of the TV series list.</p>
        )}
      </section>
    </div>
  );
}
