// src/components/features/search/SearchResultItem.tsx
"use client";

import type { ClientTMDBMultiSearchResultItem } from "@/types/tmdb";
import { getFullImagePath } from "@/lib/tmdb";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilmIcon, Tv2Icon } from "lucide-react";

interface SearchResultItemProps {
  item: ClientTMDBMultiSearchResultItem;
  onItemClick?: () => void; // Callback to close search results, e.g.
}

export function SearchResultItem({ item, onItemClick }: SearchResultItemProps) {
  const title = item.media_type === "movie" ? item.title : item.name;
  const releaseDate = item.media_type === "movie" ? item.release_date : item.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "N/A";
  const href = item.media_type === "movie" ? `/movies/${item.id}` : `/tv-series/${item.id}`;

  return (
    <Link href={href} passHref legacyBehavior>
      <a
        onClick={onItemClick}
        className="block hover:bg-muted/50 transition-colors rounded-lg"
        aria-label={`View details for ${title}`}
      >
        <Card className="border-0 shadow-none bg-transparent rounded-lg overflow-hidden">
          <CardContent className="p-2 flex items-center gap-3">
            <div className="relative w-16 h-24 rounded-md overflow-hidden flex-shrink-0 bg-muted">
              <Image
                src={getFullImagePath(item.poster_path, "w200")}
                alt={title || "Search result poster"}
                fill
                className="object-cover"
                sizes="64px"
                data-ai-hint={item.media_type === "movie" ? "movie poster" : "tv series poster"}
              />
            </div>
            <div className="flex-grow min-w-0">
              <h3 className="font-semibold text-sm truncate" title={title}>
                {title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {item.media_type === "movie" ? (
                  <FilmIcon className="h-3.5 w-3.5" />
                ) : (
                  <Tv2Icon className="h-3.5 w-3.5" />
                )}
                <span>{year}</span>
                {item.vote_average > 0 && (
                   <>
                    <span>&bull;</span>
                    <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">{item.vote_average.toFixed(1)}</Badge>
                   </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}
