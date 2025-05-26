// src/components/features/youtube-downloader/MediaInfoDisplay.tsx
"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FilmIcon, ListMusicIcon } from "lucide-react";

// Assuming these types are defined in a shared location or passed correctly
interface ApiVideoInfo {
  id: string;
  title: string;
  thumbnail: string | undefined;
  duration: number;
  author: { name: string; url?: string; channelID?: string };
  formats: any; // Simplified for this component's direct needs
}

interface ApiPlaylistInfo {
  title: string | undefined;
  author: { name: string | undefined; url?: string };
  itemCount: number;
  videos: any[]; // Simplified
}

interface MediaInfoDisplayProps {
  currentContent: ApiVideoInfo | ApiPlaylistInfo;
  previewVideoId: string | null; // For single video iframe preview
  formatDuration: (totalSeconds: number, dict: any) => string;
  dictionary: any;
}

export function MediaInfoDisplay({
  currentContent,
  previewVideoId,
  formatDuration,
  dictionary,
}: MediaInfoDisplayProps) {
  const isVideoInfo = (content: any): content is ApiVideoInfo => 
    content && 'formats' in content && 'id' in content;
  const isPlaylistInfo = (content: any): content is ApiPlaylistInfo =>
    content && 'videos' in content && 'itemCount' in content;

  return (
    <>
      {/* Single Video Preview (shown outside the main content card in the original page) */}
      {previewVideoId && isVideoInfo(currentContent) && currentContent.id === previewVideoId && (
        <Card className="max-w-3xl mx-auto mt-6 shadow-md border-border/30 mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=0&modestbranding=1&rel=0`}
                title={dictionary.videoPreviewTitle || "Video Preview"}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                key={`preview-${previewVideoId}`}
              ></iframe>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Display within the Card */}
      {isVideoInfo(currentContent) && (
        <>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <FilmIcon className="h-6 w-6 text-accent" /> {currentContent.title}
            </CardTitle>
            <CardDescription>
              {dictionary.authorLabel}: {currentContent.author.name} &bull; {dictionary.durationLabel}: {formatDuration(currentContent.duration, dictionary)}
            </CardDescription>
          </CardHeader>
          {/* Thumbnail is shown alongside download options in original, so might be passed to a layout component or handled there */}
        </>
      )}

      {isPlaylistInfo(currentContent) && (
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ListMusicIcon className="h-6 w-6 text-accent" /> {dictionary.playlistTitleLabel}: {currentContent.title}
          </CardTitle>
          <CardDescription>
            {currentContent.itemCount} {dictionary.videosLabel}.
            {currentContent.author?.name && ` ${dictionary.authorLabel}: ${currentContent.author.name}`}
          </CardDescription>
        </CardHeader>
      )}
    </>
  );
}
