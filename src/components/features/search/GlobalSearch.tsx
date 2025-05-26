"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Loader2Icon } from "lucide-react";
import { ClientTMDBMultiSearchResultItem } from "@/types/tmdb";
import { handleSearch } from "@/lib/actions/search.actions";
import { useDebounce } from "@/hooks/use-debounce"; // Assuming this is the correct path

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientTMDBMultiSearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 500);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || "en"; // Default to 'en' if locale is not present

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback(async () => {
    if (!debouncedQuery) {
      setResults([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsDropdownOpen(true);

    try {
      // Pass the query as an object, matching the server action's expected input
      const actionResult = await handleSearch({ query: debouncedQuery });

      if (actionResult.error) {
        setError(actionResult.error);
        setResults([]);
      } else if (actionResult.results) {
        setResults(actionResult.results);
      } else {
        setResults([]);
      }
    } catch (err) {
      // Fallback error for unexpected issues during the action call itself
      console.error("Error calling handleSearch:", err);
      setError("Failed to fetch results. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    fetchResults();
  }, [debouncedQuery, fetchResults]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleResultClick = () => {
    setIsDropdownOpen(false);
    setQuery(""); // Clear query after selection
  };

  return (
    <div ref={searchContainerRef} className="relative w-full max-w-md">
      <Input
        type="text"
        placeholder="Search movies or TV shows..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value) {
            setIsDropdownOpen(true);
          } else {
            setIsDropdownOpen(false);
          }
        }}
        className="w-full"
      />

      {isDropdownOpen && (
        <div className="absolute mt-1 w-full bg-background border border-border shadow-lg rounded-md z-50 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading...</span>
            </div>
          )}

          {error && (
            <div className="p-4 text-destructive text-center">
              {error}
            </div>
          )}

          {!isLoading && !error && results.length === 0 && debouncedQuery && (
            <div className="p-4 text-muted-foreground text-center">
              No results found for "{debouncedQuery}".
            </div>
          )}

          {!isLoading && !error && results.length > 0 && (
            <ul>
              {results.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/${locale}/${item.media_type === "movie" ? "movies" : "tv-series"}/${item.id}`}
                    passHref
                    legacyBehavior // Required for custom component child in Link
                  >
                    <a
                      onClick={handleResultClick}
                      className="flex items-center p-3 hover:bg-muted/50 transition-colors duration-150"
                    >
                      <div className="relative w-16 h-24 mr-3 flex-shrink-0">
                        <Image
                          src={item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : "/images/placeholder-poster.png"}
                          alt={item.title || item.name || "Search result poster"}
                          fill
                          sizes="4rem" // More specific size for the small poster
                          className="rounded object-cover"
                        />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-semibold text-sm truncate">{item.title || item.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.media_type === "movie" ? "Movie" : "TV Show"}
                        </p>
                      </div>
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
