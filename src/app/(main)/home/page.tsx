// src/app/(main)/home/page.tsx
import { VideoUrlForm } from '@/components/features/home/VideoUrlForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchIcon, FilmIcon } from 'lucide-react'; // Added FilmIcon for consistency in potential empty state
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Add Video Link</CardTitle>
          <CardDescription>
            Enter a video URL from a supported platform to begin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VideoUrlForm />
        </CardContent>
      </Card>

      <Card className="shadow-lg border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Search for Movies & TV Shows</CardTitle>
          <CardDescription>
            Find your favorite content to download.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full items-center space-x-2">
            <Input type="search" placeholder="Search by title, actor, genre..." className="h-12 text-base" />
            <Button type="submit" size="lg" className="h-12">
              <SearchIcon className="mr-2 h-5 w-5" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for search results or featured content */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-foreground/80">Featured Content</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((item) => (
            <Card key={item} className="overflow-hidden shadow-md hover:shadow-primary/30 transition-shadow duration-300">
              <Image
                src={`https://picsum.photos/seed/${item + 10}/400/600`}
                alt={`Featured Content ${item}`}
                width={400}
                height={600}
                className="w-full h-auto aspect-[2/3] object-cover"
                data-ai-hint="movie poster"
              />
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg truncate">Awesome Movie Title {item}</h3>
                <p className="text-sm text-muted-foreground">Action, Sci-Fi - 202X</p>
              </CardContent>
            </Card>
          ))}
        </div>
         {/* Empty State Example - Kept commented as per original, but design aligns with proposal */}
        {/* <div className="text-center py-12">
          <FilmIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-muted-foreground">Nothing to show here yet</h3>
          <p className="text-muted-foreground">Start by searching or adding a video link.</p>
        </div> */}
      </div>
    </div>
  );
}

