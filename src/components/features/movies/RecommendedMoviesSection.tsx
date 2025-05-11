// src/components/features/movies/RecommendedMoviesSection.tsx
import { getMovieRecommendations } from "@/lib/tmdb";
import { RecommendedItemCard } from "@/components/features/common/RecommendedItemCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FilmIcon, ThumbsUpIcon } from "lucide-react"; // Changed SparklesIcon to ThumbsUpIcon

interface RecommendedMoviesSectionProps {
  movieId: number | string;
}

export async function RecommendedMoviesSection({ movieId }: RecommendedMoviesSectionProps) {
  try {
    const recommendationsData = await getMovieRecommendations(movieId, 1);
    const recommendedMovies = recommendationsData.results.slice(0, 4);

    if (recommendedMovies.length === 0) {
      return null; // Don't render the section if no recommendations
    }

    return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ThumbsUpIcon className="h-6 w-6 text-primary" /> {/* Changed SparklesIcon to ThumbsUpIcon */}
            You Might Also Like
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mb-2">
              {recommendedMovies.map((movie) => (
                <RecommendedItemCard key={movie.id} item={movie} mediaType="movie" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error("Failed to fetch movie recommendations:", error);
    return (
        <Card className="shadow-lg mt-8">
            <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><FilmIcon className="h-6 w-6 text-destructive" /> Error</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Could not load recommendations at this time.</p></CardContent>
        </Card>
    );
  }
}
