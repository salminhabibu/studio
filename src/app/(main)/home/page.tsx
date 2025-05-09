// src/app/(main)/home/page.tsx
import { VideoUrlForm } from '@/components/features/home/VideoUrlForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircleIcon, ArrowRightIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { LiveSearch } from '@/components/features/search/LiveSearch';
import { getPopularMovies, getPopularTvSeries, getFullImagePath } from "@/lib/tmdb";
import type { TMDBBaseMovie, TMDBBaseTVSeries } from "@/types/tmdb";
import { Badge } from "@/components/ui/badge";

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
  let popularTvSeries: TMDBBaseTVSeries[] = [];
  // let fetchError: string | null = null; // Error state can be used to display a message

  try {
    const [moviesData, tvSeriesData] = await Promise.all([
      getPopularMovies(1),
      getPopularTvSeries(1),
    ]);
    popularMovies = moviesData.results;
    popularTvSeries = tvSeriesData.results;
  } catch (error) {
    console.error("Failed to fetch featured content:", error);
    // fetchError = "Could not load featured content at this time.";
  }

  const featuredItems: FeaturedItem[] = [];
  const moviesTransformed = popularMovies.slice(0, 4).map(m => transformToFeaturedItem({ ...m, media_type: 'movie' as const }));
  const tvSeriesTransformed = popularTvSeries.slice(0, 4).map(t => transformToFeaturedItem({ ...t, media_type: 'tv' as const }));

  const maxLength = Math.max(moviesTransformed.length, tvSeriesTransformed.length);
  for (let i = 0; i < maxLength; i++) {
    if (moviesTransformed[i]) featuredItems.push(moviesTransformed[i]);
    if (tvSeriesTransformed[i]) featuredItems.push(tvSeriesTransformed[i]);
  }
  // Slice to ensure a max of 8 items if both arrays had 4 items.
  // If one fetch failed, this will take up to 4 from the successful one.
  const finalFeaturedItems = featuredItems.slice(0, 8);


  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] rounded-xl overflow-hidden shadow-2xl group">
        <Image
          src="https://picsum.photos/seed/hero-banner/1600/900"
          alt="Featured Movie Banner"
          fill
          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
          data-ai-hint="epic landscape"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 lg:p-16 space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
            Discover Your Next Favorite Movie
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 max-w-2xl shadow-black [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">
            Explore a vast collection of movies and TV series. Download and watch offline with ChillyMovies.
          </p>
          <div>
            <Button size="lg" className="h-14 px-8 text-lg group/button">
              <PlayCircleIcon className="mr-3 h-6 w-6 transition-transform duration-300 group-hover/button:scale-110" />
              Watch Trailer
            </Button>
          </div>
        </div>
      </section>

      {/* Add Video Link Section */}
      <section>
        <Card className="shadow-xl border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Add Video by Link</CardTitle>
            <CardDescription>
              Paste a video URL from a supported platform to start processing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoUrlForm />
          </CardContent>
        </Card>
      </section>
      
      {/* Search Section */}
      <section>
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
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-foreground/90">Featured Content</h2>
            <Button variant="link" className="text-primary hover:text-primary/80" asChild>
              <Link href="/movies"> {/* Consider changing this link if a mixed "explore" page is added */}
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
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw" // Adjusted sizes
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

