// src/app/(main)/movies/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilmIcon, FilterIcon, ListFilter, SearchIcon } from "lucide-react";
import Image from "next/image";

export default function MoviesPage() {
  const movies = [...Array(15)].map((_, index) => ({
    id: index + 1,
    title: `Epic Movie Title ${index + 1}`,
    genre: index % 3 === 0 ? "Action, Sci-Fi" : index % 3 === 1 ? "Comedy, Romance" : "Drama, Thriller",
    year: 2022 + (index % 3),
    imageUrl: `https://picsum.photos/seed/epicmovie${index}/400/600`,
    dataAiHint: "movie poster"
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Movies</h1>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input type="search" placeholder="Search movies..." className="h-10 md:w-64" />
          <Button variant="outline" size="icon" aria-label="Search">
            <SearchIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <Card className="shadow-lg border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Filters & Sorting</CardTitle>
          </div>
          <CardDescription>Refine your movie browsing experience.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-center">
          <Select defaultValue="popularity">
            <SelectTrigger className="w-full md:w-[180px] h-10">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="release_date">Release Date</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="title">Title (A-Z)</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-full md:w-[180px] h-10">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              <SelectItem value="action">Action</SelectItem>
              <SelectItem value="comedy">Comedy</SelectItem>
              <SelectItem value="drama">Drama</SelectItem>
              <SelectItem value="sci-fi">Sci-Fi</SelectItem>
            </SelectContent>
          </Select>
           <Button variant="outline" className="h-10 w-full md:w-auto">
            <FilterIcon className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
        {movies.map((movie) => (
          <Card key={movie.id} className="overflow-hidden shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out group transform hover:-translate-y-1 flex flex-col">
            <div className="aspect-[2/3] relative w-full">
               <Image
                src={movie.imageUrl}
                alt={movie.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                data-ai-hint={movie.dataAiHint}
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              />
            </div>
            <CardContent className="p-3 flex-grow flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors" title={movie.title}>
                  {movie.title}
                </h3>
                <p className="text-xs text-muted-foreground">{movie.genre} &bull; {movie.year}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {movies.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 py-12 rounded-lg bg-card/50 shadow-md">
          <FilmIcon className="w-20 h-20 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No Movies Found</h2>
          <p className="text-muted-foreground max-w-sm">
            It seems there are no movies matching your criteria. Try adjusting your filters or search terms.
          </p>
          <Button variant="outline">Clear Filters</Button>
        </div>
      )}
    </div>
  );
}
