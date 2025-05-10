// src/app/(main)/home/page.tsx
import { YouTubeDownloaderForm } from '@/components/features/home/YouTubeDownloaderForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, YoutubeIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { LiveSearch } from '@/components/features/search/LiveSearch';
import { getPopularMovies, getFullImagePath, getMovieDetails, getPopularTvSeries } from "@/lib/tmdb";
import type { TMDBBaseMovie, TMDBBaseTVSeries, TMDBMovie, TMDBVideo } from "@/types/tmdb";
import { Badge } from "@/components/ui/badge";
import { HeroSection, type HeroItem } from '@/components/features/home/HeroSection';

interface FeaturedItem {
  id: number;
  title: string;
  category: string;
  year: string;
  imageUrl: string;
  dataAiHint: string;
  href: string;
  vote_average?: number;
}

function transformToFeaturedItem(
  item: (TMDBBaseMovie & { media_type: 'movie' }) | (TMDBBaseTVSeries & { media_type: 'tv' })
): FeaturedItem {
  const isMovie = item.media_type === 'movie';
  const date = isMovie ? item.release_date : item.first_air_date;
  const yearString = date && date.split('-')[0] ? date.split('-')[0] : 'N/A';

  return {
    id: item.id,
    title: (isMovie ? item.title : item.name) || "Untitled",
    category: isMovie ? 'Movie' : 'TV Series',
    year: yearString,
    imageUrl: getFullImagePath(item.poster_path, 'w500'),
    dataAiHint: isMovie ? 'movie poster' : 'tv series poster',
    href: isMovie ? `/movies/${item.id}` : `/tv-series/${item.id}`,
    vote_average: item.vote_average,
  };
}

export default async function HomePage() {
  let popularMovies: TMDBBaseMovie[] = [];
  let popularTvSeriesList: TMDBBaseTVSeries[] = [];
  let heroItems: HeroItem[] = [];

  try {
    const [moviesData, tvSeriesData] = await Promise.all([
      getPopularMovies(1),
      getPopularTvSeries(1),
    ]);
    popularMovies = moviesData.results;
    popularTvSeriesList = tvSeriesData.results;

    // Prepare items for HeroSection
    const potentialHeroMovies = popularMovies.filter(movie => movie.backdrop_path).slice(0, 10); 
    
    const heroItemsDataPromises = potentialHeroMovies.map(async (movie) => {
      try {
        const movieDetails = await getMovieDetails(movie.id); 
        const videos: TMDBVideo[] = movieDetails.videos?.results || [];
        
        const officialTrailer = videos.find(
          (video) => video.site === "YouTube" && video.type === "Trailer" && video.official
        ) || videos.find( 
          (video) => video.site === "YouTube" && video.type === "Trailer"
        );

        if (officialTrailer?.key) {
          return { movie: movieDetails, trailerKey: officialTrailer.key };
        }
        return null;
      } catch (detailError) {
        console.error(`Failed to fetch details/trailer for movie ${movie.id}:`, detailError);
        return null;
      }
    });

    const resolvedHeroItemsData = await Promise.all(heroItemsDataPromises);
    heroItems = resolvedHeroItemsData.filter((item): item is HeroItem => item !== null).slice(0, 5); 

  } catch (error) {
    console.error("Failed to fetch content for Home Page:", error);
  }

  const featuredItems: FeaturedItem[] = [];
  const moviesTransformed = popularMovies.slice(0, 4).map(m => transformToFeaturedItem({ ...m, media_type: 'movie' as const }));
  const tvSeriesTransformed = popularTvSeriesList.slice(0, 4).map(t => transformToFeaturedItem({ ...t, media_type: 'tv' as const }));

  const maxLength = Math.max(moviesTransformed.length, tvSeriesTransformed.length);
  for (let i = 0; i < maxLength; i++) {
    if (moviesTransformed[i]) featuredItems.push(moviesTransformed[i]);
    if (tvSeriesTransformed[i]) featuredItems.push(tvSeriesTransformed[i]);
  }
  const finalFeaturedItems = featuredItems.slice(0, 8);


  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <HeroSection items={heroItems} />

      {/* Add Video Link Section */}
      <section>
        <Card className="shadow-xl border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex items-center">
              <YoutubeIcon className="h-7 w-7 mr-2 text-red-500" />
              Download from YouTube
            </CardTitle>
            <CardDescription>
              Paste a YouTube video URL below to fetch info and download options.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <YouTubeDownloaderForm />
          </CardContent>
        </Card>
      </section>
      
      {/* Search Section - Increased z-index to ensure dropdown is above subsequent content */}
      <section className="relative z-20"> {/* Was z-10, increased to z-20 */}
        <Card className="shadow-xl border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Search Movies & TV Shows</CardTitle>
            <CardDescription>
              Find content by title, actor, or genre. Results appear as you type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LiveSearch />
          </CardContent>
        </Card>
      </section>

      {/* Featured Content Section - Horizontal Scroll */}
      {finalFeaturedItems.length > 0 && (
        <section className="space-y-6 relative z-10"> {/* Added relative z-10 to ensure it's below search if contexts align */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-foreground/90">Featured Content</h2>
            <Button variant="link" className="text-primary hover:text-primary/80" asChild>
              <Link href="/movies">
                View All <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="relative">
            <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mb-4">
              {finalFeaturedItems.map((item) => (
                <Link href={item.href} key={item.id} className="group flex-shrink-0 w-52 md:w-60">
                  <Card className="overflow-hidden shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col">
                    <div className="aspect-[2/3] relative w-full">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        data-ai-hint={item.dataAiHint}
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      />
                      {item.vote_average && item.vote_average > 0 && (
                        <Badge variant="default" className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm text-xs">
                          {item.vote_average.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3 flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-base lg:text-md truncate group-hover:text-primary transition-colors" title={item.title}>
                          {item.title}
                        </h3>
                        <p className="text-xs lg:text-sm text-muted-foreground">
                          {item.category} &bull; {item.year}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
