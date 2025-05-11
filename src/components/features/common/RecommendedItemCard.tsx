// src/components/features/common/RecommendedItemCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import type { TMDBBaseMovie, TMDBBaseTVSeries } from '@/types/tmdb';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFullImagePath } from '@/lib/tmdb';

interface RecommendedItemCardProps {
  item: TMDBBaseMovie | TMDBBaseTVSeries;
  mediaType: 'movie' | 'tv';
}

export function RecommendedItemCard({ item, mediaType }: RecommendedItemCardProps) {
  const title = mediaType === 'movie' ? (item as TMDBBaseMovie).title : (item as TMDBBaseTVSeries).name;
  const releaseDate = mediaType === 'movie' ? (item as TMDBBaseMovie).release_date : (item as TMDBBaseTVSeries).first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const href = mediaType === 'movie' ? `/movies/${item.id}` : `/tv-series/${item.id}`;
  const category = mediaType === 'movie' ? 'Movie' : 'TV Series';
  const dataAiHint = mediaType === 'movie' ? 'movie poster' : 'tv series poster';

  return (
    <Link href={href} className="group flex-shrink-0 w-40 md:w-48">
      <Card className="overflow-hidden shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col bg-card hover:bg-card/90">
        <div className="aspect-[2/3] relative w-full">
          <Image
            src={getFullImagePath(item.poster_path, "w300")}
            alt={title || "Recommended content poster"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={dataAiHint}
            sizes="(max-width: 768px) 33vw, 15vw"
          />
          {item.vote_average && item.vote_average > 0 && (
            <Badge variant="default" className="absolute top-1.5 right-1.5 bg-primary/80 backdrop-blur-sm text-xs px-1.5 py-0.5">
              {item.vote_average.toFixed(1)}
            </Badge>
          )}
        </div>
        <CardContent className="p-2 flex-grow flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm lg:text-base truncate group-hover:text-primary transition-colors" title={title}>
              {title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {category} &bull; {year}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
