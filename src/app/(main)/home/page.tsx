// src/app/(main)/home/page.tsx
import { VideoUrlForm } from '@/components/features/home/VideoUrlForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircleIcon, ArrowRightIcon } from 'lucide-react';
import Image from 'next/image';
import { LiveSearch } from '@/components/features/search/LiveSearch'; // Import LiveSearch

export default function HomePage() {
  const featuredItems = [
    { id: 1, title: "Interstellar Exploration", category: "Sci-Fi Adventure", year: "2024", imageUrl: "https://picsum.photos/seed/interstellar/400/600", dataAiHint: "space movie" },
    { id: 2, title: "Cybernetic Uprising", category: "Action Thriller", year: "2023", imageUrl: "https://picsum.photos/seed/cyberpunk/400/600", dataAiHint: "robot movie" },
    { id: 3, title: "Mysteries of the Deep", category: "Documentary", year: "2024", imageUrl: "https://picsum.photos/seed/deepsea/400/600", dataAiHint: "ocean documentary" },
    { id: 4, title: "Chronicles of Eldoria", category: "Fantasy Epic", year: "2023", imageUrl: "https://picsum.photos/seed/fantasy/400/600", dataAiHint: "fantasy landscape" },
    { id: 5, title: "The Last Stand", category: "War Drama", year: "2024", imageUrl: "https://picsum.photos/seed/war/400/600", dataAiHint: "battle scene" },
    { id: 6, title: "Neon City Racers", category: "Racing Action", year: "2023", imageUrl: "https://picsum.photos/seed/racing/400/600", dataAiHint: "futuristic car" },
  ];

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
      
      {/* Search Section - Replaced with LiveSearch */}
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
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-foreground/90">Featured Content</h2>
          <Button variant="link" className="text-primary hover:text-primary/80">
            View All <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mb-4">
            {featuredItems.map((item) => (
              <div key={item.id} className="group flex-shrink-0 w-52 md:w-60">
                <Card className="overflow-hidden shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col">
                  <div className="aspect-[2/3] relative w-full">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={item.dataAiHint}
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 20vw, 15vw"
                    />
                  </div>
                  <CardContent className="p-4 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-md lg:text-lg truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs lg:text-sm text-muted-foreground">
                        {item.category} &bull; {item.year}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
