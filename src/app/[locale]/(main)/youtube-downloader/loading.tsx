// src/app/[locale]/(main)/youtube-downloader/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { YoutubeIcon } from "lucide-react";

export default function YouTubeDownloaderLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="text-center">
        <YoutubeIcon className="h-16 w-16 text-primary/50 mx-auto mb-3"/>
        <Skeleton className="h-10 w-3/4 mx-auto mb-2" /> {/* Title */}
        <Skeleton className="h-6 w-1/2 mx-auto mt-1" /> {/* Description */}
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Input Card Header + Content */}
        <Skeleton className="h-24 w-full rounded-lg" /> {/* Increased height for card header and form */}
      </div>

      <div className="max-w-5xl mx-auto mt-8 space-y-6">
        {/* Placeholder for potential video info card */}
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
