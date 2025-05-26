// src/components/features/youtube-downloader/PlaylistManager.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card"; // For individual item cards
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormLabel } from "@/components/ui/form"; // For "Select All" label
import { Loader2Icon, DownloadCloudIcon } from "lucide-react";

// Assuming these types are defined in a shared location or passed correctly
interface ApiPlaylistVideoInfo { 
  id: string;
  title: string;
  duration: number;
  authorName: string | undefined;
  thumbnail?: string;
}

interface ApiPlaylistInfo {
  title: string | undefined;
  author: { name: string | undefined; url?: string };
  itemCount: number;
  videos: ApiPlaylistVideoInfo[]; 
}

interface PlaylistManagerProps {
  playlistInfo: ApiPlaylistInfo;
  playlistItemsSelection: Record<string, boolean>;
  togglePlaylistItemSelection: (itemId: string) => void;
  toggleAllPlaylistItems: () => void;
  handleDownloadPlaylist: () => Promise<void>;
  isDownloadingPlaylist: boolean;
  formatDuration: (totalSeconds: number, dict: any) => string;
  dictionary: any;
  // Props for global download options, if they are to be included *within* this manager
  // For now, assuming DownloadOptionsPanel is separate and these are not needed here directly for rendering it
  // selectedDownloadType: 'videoaudio' | 'videoonly' | 'audioonly';
  // selectedAudioItag: number | null;
  // selectedVideoItag: number | null;
}

export function PlaylistManager({
  playlistInfo,
  playlistItemsSelection,
  togglePlaylistItemSelection,
  toggleAllPlaylistItems,
  handleDownloadPlaylist,
  isDownloadingPlaylist,
  formatDuration,
  dictionary,
  // selectedDownloadType, // Uncomment if global options are part of this component
  // selectedAudioItag,
  // selectedVideoItag
}: PlaylistManagerProps) {
  
  const allItemsSelected = playlistInfo.videos.length > 0 && playlistInfo.videos.every(item => playlistItemsSelection[item.id]);
  const selectedItemsCount = Object.values(playlistItemsSelection).filter(v => v).length;

  // Determine if the download button should be disabled based on global selections
  // This logic might need adjustment based on how global options are managed and passed
  // For now, this specific disabling logic related to itags is illustrative
  // and might be handled in the parent component that calls handleDownloadPlaylist.
  // const isGlobalFormatSelectionMissing = () => {
  //   if (selectedDownloadType === 'audioonly' && !selectedAudioItag) return true;
  //   if ((selectedDownloadType === 'videoaudio' || selectedDownloadType === 'videoonly') && !selectedVideoItag) return true;
  //   return false;
  // };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button 
          onClick={handleDownloadPlaylist} 
          disabled={
            isDownloadingPlaylist || 
            selectedItemsCount === 0 
            // || isGlobalFormatSelectionMissing() // Uncomment if this logic resides here
          } 
          className="h-11"
        >
          {isDownloadingPlaylist ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloudIcon className="mr-2 h-5 w-5" />}
          {dictionary.downloadSelectedButton} ({selectedItemsCount})
        </Button>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="select-all-playlist"
            checked={allItemsSelected}
            onCheckedChange={toggleAllPlaylistItems} 
            aria-label={dictionary.selectAllLabel}
          />
          <FormLabel htmlFor="select-all-playlist" className="text-sm font-medium cursor-pointer">
            {dictionary.selectAllLabel}
          </FormLabel>
        </div>
      </div>

      <ScrollArea className="h-[400px] border rounded-md p-2 bg-muted/30">
        <div className="space-y-3">
          {playlistInfo.videos.map((item) => (
            <Card key={item.id} className="flex items-center gap-3 p-3 bg-card hover:bg-card/80 shadow-sm transition-shadow duration-150">
              <Checkbox 
                checked={playlistItemsSelection[item.id] || false} 
                onCheckedChange={() => togglePlaylistItemSelection(item.id)} 
                id={`item-${item.id}`} 
                aria-label={`Select ${item.title}`}
              />
              <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0 bg-muted/50">
                <Image 
                  src={item.thumbnail || `https://placehold.co/96x54.png?text=${encodeURIComponent(item.title.substring(0,10))}`} 
                  alt={item.title} 
                  fill 
                  style={{objectFit:"cover"}} 
                  data-ai-hint="video thumbnail small"
                  sizes="96px"
                />
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-sm font-semibold truncate" title={item.title}>{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.authorName || dictionary.na} &bull; {formatDuration(item.duration, dictionary)}</p>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
