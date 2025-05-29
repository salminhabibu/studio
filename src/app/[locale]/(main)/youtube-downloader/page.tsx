// src/app/[locale]/(main)/youtube-downloader/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, use } from "react"; 
import { Loader2Icon, DownloadCloudIcon, YoutubeIcon, SearchIcon, ListMusicIcon, VideoIcon, FilmIcon } from "lucide-react"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary';
import { getSmartFeedback } from '@/lib/actions/ai.actions';

const youtubeUrlFormSchema = z.object({
  url: z.string().url({ message: "Please enter a valid YouTube URL (video or playlist)." })
  .refine(url => {
    try {
      const { hostname, pathname } = new URL(url);
      const isValidHost = hostname.includes("youtube.com") || hostname.includes("youtu.be");
      const isVideo = pathname === '/watch' || hostname === 'youtu.be' || pathname.startsWith('/shorts/') || pathname.startsWith('/embed/');
      const isPlaylist = pathname === '/playlist';
      return isValidHost && (isVideo || isPlaylist);
    } catch {
      return false;
    }
  }, "Please enter a valid YouTube video or playlist URL."),
});

type YouTubeUrlFormValues = z.infer<typeof youtubeUrlFormSchema>;

interface Format {
  // Matches backend VideoFormat structure
  itag: number;
  qualityLabel: string | null;
  container: string | null;
  fps?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  url?: string; 
  contentLength?: string;
  bitrate?: number | null;
  audioBitrate?: number | null;
}

// Matches backend VideoInfo structure
interface ApiVideoInfo {
  id: string;
  title: string;
  thumbnail: string | undefined;
  duration: number; // in seconds
  author: {
    name: string;
    url?: string;
    channelID?: string;
  };
  formats: {
    video: Format[];
    audio: Format[];
  };
}

// Matches backend simplified video info for playlists
interface ApiPlaylistVideoInfo { 
  id: string;
  title: string;
  duration: number; // in seconds
  authorName: string | undefined;
  thumbnail?: string; // Add if backend sends this for playlist items
}

// Matches backend PlaylistInfo structure
interface ApiPlaylistInfo {
  title: string | undefined;
  author: { 
    name: string | undefined;
    url?: string;
  };
  itemCount: number;
  videos: ApiPlaylistVideoInfo[]; 
}

// Extended for frontend state (e.g., selection)
interface PlaylistItem extends ApiPlaylistVideoInfo {
  selected?: boolean;
}

function getYouTubeId(url: string): { videoId?: string; playlistId?: string } {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.searchParams.get('v') || 
                      (urlObj.hostname === 'youtu.be' ? urlObj.pathname.substring(1).split('?')[0] : null) ||
                      (urlObj.pathname.startsWith('/shorts/') ? urlObj.pathname.split('/shorts/')[1]?.split('?')[0] : null) ||
                      (urlObj.pathname.startsWith('/embed/') ? urlObj.pathname.split('/embed/')[1]?.split('?')[0] : null);
      const playlistId = urlObj.searchParams.get('list');
      return { videoId: videoId || undefined, playlistId: playlistId || undefined };
    }
    return {};
  } catch {
    return {};
  }
}

function formatDuration(totalSeconds: number, dict: any): string {
    if (isNaN(totalSeconds) || totalSeconds < 0) return dict?.na || "N/A";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    let timeString = "";
    if (hrs > 0) timeString += `${hrs}:`;
    timeString += `${mins.toString().padStart(hrs > 0 ? 2 : 1, '0')}:${secs.toString().padStart(2, '0')}`;
    return timeString;
}

interface YouTubeDownloaderPageProps {
  params: { locale: Locale }; 
}

export default function YouTubeDownloaderPage(props: YouTubeDownloaderPageProps) {
  const locale = props.params.locale; 

  const { toast } = useToast();
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // General download button state
  // const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({}); // Future: for individual item progress

  const [currentContent, setCurrentContent] = useState<ApiVideoInfo | ApiPlaylistInfo | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  const [selectedDownloadType, setSelectedDownloadType] = useState<'videoaudio' | 'videoonly' | 'audioonly'>('videoaudio');
  const [selectedVideoItag, setSelectedVideoItag] = useState<number | null>(null); // Store itag as number
  const [selectedAudioItag, setSelectedAudioItag] = useState<number | null>(null); // Store itag as number
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<'m4a' | 'opus'>('m4a'); // User preference for audio container

  const [playlistItemsSelection, setPlaylistItemsSelection] = useState<Record<string, boolean>>({});
  const [dictionary, setDictionary] = useState<any>(null);

  // For UI Clarification when playlist is loaded
  const [isPlaylistLoaded, setIsPlaylistLoaded] = useState(false);


  useEffect(() => {
    const fetchDictionary = async () => {
      if (locale) { 
        const dict = await getDictionary(locale);
        setDictionary(dict.youtubeDownloaderPage); 
      }
    };
    fetchDictionary();
  }, [locale]);


  const form = useForm<YouTubeUrlFormValues>({
    resolver: zodResolver(youtubeUrlFormSchema),
    defaultValues: { url: "" },
    mode: "onBlur",
  });

  const currentUrl = form.watch("url");

  useEffect(() => {
    if (!currentUrl.trim()) {
      setCurrentContent(null);
      setPreviewVideoId(null);
      return;
    }
    const validation = youtubeUrlFormSchema.safeParse({ url: currentUrl });
    if (!validation.success) {
        if (currentContent) setCurrentContent(null);
        if (previewVideoId) setPreviewVideoId(null);
    } else {
        const { videoId } = getYouTubeId(currentUrl);
        if (videoId && !(currentContent && 'items' in currentContent)) {
          if (previewVideoId !== videoId) setPreviewVideoId(videoId);
        } else if (!videoId && !(currentContent && 'items' in currentContent)) {
          setPreviewVideoId(null);
        }
    }
  }, [currentUrl, currentContent, previewVideoId]);

  const onSearch = async (data: YouTubeUrlFormValues) => {
    setIsLoadingInfo(true);
    setCurrentContent(null);
    setPreviewVideoId(null);
    setSelectedVideoItag(null); // Reset selected itags
    setSelectedAudioItag(null);

    try {
      const response = await fetch('/api/youtube/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error structure" }));
        
        // Call the AI flow for smarter feedback
        const aiFeedback = await getSmartFeedback({ url: data.url });

        let description = aiFeedback.feedback; // Use AI feedback by default
        // Optional: if AI feedback is generic or indicates success (which it shouldn't here),
        // you might append or use original error as fallback.
        // For instance, if (!aiFeedback.isValid && errorData.error) {
        //   description += ` (Original error: ${errorData.error})`;
        // } else if (aiFeedback.isValid) { 
        //   // This case should ideally not happen if response.ok is false
        //   description = `AI suggested the URL is valid, but server processing failed: ${errorData.error || "Unknown server error"}`;
        // }

        toast({
          title: dictionary?.errorFetchInfoTitle || "Error Fetching Information",
          description: description, // Use the AI-generated feedback
          variant: "destructive",
        });
        setCurrentContent(null);
        return;
      }

      const result = await response.json();

      if (result.type === 'video' && result.videoInfo) {
        const videoInfo = result.videoInfo as ApiVideoInfo;
        setCurrentContent(videoInfo);
        setPreviewVideoId(videoInfo.id);
        // Auto-select default itags will be handled by useEffect listening to videoFormatsToShow/audioFormatsToShow
      } else if (result.type === 'playlist' && result.playlistInfo) {
        const playlistInfo = result.playlistInfo as ApiPlaylistInfo;
        const itemsWithSelection: PlaylistItem[] = playlistInfo.videos.map(video => ({
          ...video,
          selected: true 
        }));
        setCurrentContent({ ...playlistInfo, videos: itemsWithSelection });
        
        setPlaylistItemsSelection(itemsWithSelection.reduce((acc: Record<string, boolean>, item) => {
          acc[item.id] = true;
          return acc;
        }, {}));
        
        setIsPlaylistLoaded(true); // Set flag for UI note

        if (playlistInfo.videos.length > 0) {
          setPreviewVideoId(playlistInfo.videos[0].id);
        } else {
          setPreviewVideoId(null);
          setIsPlaylistLoaded(false); // Reset if playlist is empty
        }
      } else {
        toast({ title: dictionary?.errorInvalidResponseTitle || "Invalid API Response", description: dictionary?.errorInvalidResponseDesc || "Received an unexpected response from the server.", variant: "destructive" });
        setCurrentContent(null);
        setIsPlaylistLoaded(false);
      }
    } catch (error) {
      console.error("onSearch error:", error);
      setIsPlaylistLoaded(false);
      toast({
        title: dictionary?.errorNetworkTitle || "Network Error",
        description: (error as Error).message || dictionary?.errorNetworkDesc || "Could not connect to the server.",
        variant: "destructive",
      });
      setCurrentContent(null);
      setIsPlaylistLoaded(false);
    } finally {
      setIsLoadingInfo(false);
    }
  };
  
  const handleDownload = async (videoToDownload?: ApiVideoInfo) => { 
    const contentToUse = videoToDownload || (currentContent && 'formats' in currentContent ? currentContent : null);

    if (!contentToUse || !currentUrl || !contentToUse.id) {
      toast({ title: dictionary?.errorNoVideoTitle || "Error", description: dictionary?.errorNoVideoDesc || "No video selected or URL is missing.", variant: "destructive" });
      return;
    }
    
    let finalItag: number | null = null;
    let fileExtension: string = "mp4"; 

    if (selectedDownloadType === 'audioonly') {
      finalItag = selectedAudioItag;
      const audioFormatDetails = audioFormatsToShow.find(f => f.itag === finalItag);
      fileExtension = audioFormatDetails?.container || selectedAudioFormat; 
    } else if (selectedDownloadType === 'videoonly') {
      finalItag = selectedVideoItag;
      const videoFormatDetails = videoFormatsToShow.find(f => f.itag === finalItag);
      fileExtension = videoFormatDetails?.container || "mp4";
    } else { 
      finalItag = selectedVideoItag; 
      const videoFormatDetails = videoFormatsToShow.find(f => f.itag === finalItag);
      if (videoFormatDetails && !videoFormatDetails.hasAudio) {
         toast({ title: dictionary?.errorFormatNoAudioTitle || "Format Error", description: dictionary?.errorFormatNoAudioDesc || "Selected video quality does not have audio. Choose another or download audio separately.", variant: "destructive" });
         return;
      }
      fileExtension = videoFormatDetails?.container || "mp4";
    }

    if (!finalItag) {
      toast({ title: dictionary?.errorSelectFormatTitle || "Select Format", description: `${dictionary?.errorSelectFormatDesc || "Please select a quality for"} ${selectedDownloadType}.`, variant: "destructive" });
      return;
    }
    
    const fileName = sanitizeFileName(contentToUse.title, fileExtension);

    setIsDownloading(true);
    try {
      const response = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: contentToUse.id,
          itag: finalItag,
          fileName: fileName,
          title: contentToUse.title,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: dictionary?.errorDownloadStartTitle || "Download Error",
          description: errorData.error || dictionary?.errorDownloadStartDesc || "Could not start download.",
          variant: "destructive",
        });
      } else {
        const successData = await response.json();
        toast({
          title: dictionary?.successDownloadStartTitle || "Download Started",
          description: `${dictionary?.successDownloadStartDesc || "Task ID"}: ${successData.taskId}. (${fileName})`,
        });
      }
    } catch (error) {
      console.error("handleDownload error:", error);
      toast({ title: dictionary?.errorNetworkTitle || "Network Error", description: (error as Error).message || dictionary?.errorNetworkDesc || "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper to sort video formats (simple sort, can be improved)
  const sortVideoFormats = (formats: Format[]): Format[] => {
    return formats.sort((a, b) => {
      const qualityA = parseInt(a.qualityLabel || "0");
      const qualityB = parseInt(b.qualityLabel || "0");
      return qualityB - qualityA; // Descending
    });
  };

  // Helper to sort audio formats
  const sortAudioFormats = (formats: Format[]): Format[] => {
    return formats.sort((a, b) => (b.audioBitrate || b.bitrate || 0) - (a.audioBitrate || a.bitrate || 0)); // Descending
  };

  const determineBestFormat = (
    individualVideoInfo: ApiVideoInfo,
    preferredVideoItag: number | null,
    preferredAudioItag: number | null,
    downloadType: 'videoaudio' | 'videoonly' | 'audioonly',
    preferredAudioContainer: 'm4a' | 'opus'
  ): { itag: number; container: string; } | null => {
    const videoFormats = sortVideoFormats(individualVideoInfo.formats.video || []);
    const audioFormats = sortAudioFormats(individualVideoInfo.formats.audio || []);

    if (downloadType === 'videoaudio') {
      if (preferredVideoItag) {
        const preferred = videoFormats.find(f => f.itag === preferredVideoItag && f.hasAudio);
        if (preferred) return { itag: preferred.itag, container: preferred.container || 'mp4' };
      }
      const bestWithAudio = videoFormats.find(f => f.hasAudio);
      return bestWithAudio ? { itag: bestWithAudio.itag, container: bestWithAudio.container || 'mp4' } : null;
    } else if (downloadType === 'videoonly') {
      if (preferredVideoItag) {
        const preferred = videoFormats.find(f => f.itag === preferredVideoItag);
        if (preferred) return { itag: preferred.itag, container: preferred.container || 'mp4' };
      }
      return videoFormats.length > 0 ? { itag: videoFormats[0].itag, container: videoFormats[0].container || 'mp4' } : null;
    } else { // audioonly
      if (preferredAudioItag) {
        const preferred = audioFormats.find(f => f.itag === preferredAudioItag);
        if (preferred) return { itag: preferred.itag, container: preferred.container || preferredAudioContainer };
      }
      // Fallback: if preferred not found, try to find one matching the preferred container, then any.
      let bestAudio = audioFormats.find(f => f.container === preferredAudioContainer);
      if (!bestAudio && audioFormats.length > 0) bestAudio = audioFormats[0];
      return bestAudio ? { itag: bestAudio.itag, container: bestAudio.container || preferredAudioContainer } : null;
    }
  };

  const handleDownloadPlaylist = async () => {
      if (!currentContent || !('videos' in currentContent)) {
          toast({title: dictionary?.errorNoPlaylistTitle || "Error", description: dictionary?.errorNoPlaylistDesc || "No playlist loaded.", variant: "destructive"});
          return;
      }
      const selectedItems = currentContent.videos.filter(item => playlistItemsSelection[item.id]);
      if (selectedItems.length === 0) {
          toast({title: dictionary?.errorNoItemsSelectedTitle || "No items selected", description: dictionary?.errorNoItemsSelectedDesc || "Please select at least one video from the playlist to download.", variant: "default"});
          return;
      }

      setIsDownloading(true);
      let successCount = 0;
      let errorCount = 0;

      toast({
        title: dictionary?.playlistDownloadStartingTitle || "Playlist Download Starting",
        description: `${dictionary?.playlistDownloadStartingDesc || "Attempting to download"} ${selectedItems.length} ${dictionary?.items || "items"}.`,
      });

      for (const item of selectedItems) {
        try {
          const videoInfoResponse = await fetch('/api/youtube/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${item.id}` }),
          });

          if (!videoInfoResponse.ok) {
            toast({ title: `Error fetching info for ${item.title.substring(0,30)}...`, description: "Skipping this video.", variant: "destructive" });
            errorCount++;
            continue;
          }
          const videoInfoData = await videoInfoResponse.json();
          if (videoInfoData.type !== 'video' || !videoInfoData.videoInfo) {
              toast({ title: `Could not parse info for ${item.title.substring(0,30)}...`, description: "Skipping this video.", variant: "destructive" });
              errorCount++;
              continue;
          }
          const individualVideoInfo = videoInfoData.videoInfo as ApiVideoInfo;

          const bestFormat = determineBestFormat(individualVideoInfo, selectedVideoItag, selectedAudioItag, selectedDownloadType, selectedAudioFormat);

          if (!bestFormat) {
            toast({ title: `No suitable format for ${item.title.substring(0,30)}... (${selectedDownloadType})`, description: "Skipping this video.", variant: "destructive" });
            errorCount++;
            continue;
          }
          
          const { itag: finalItag, container: fileExtension } = bestFormat;
          const fileName = sanitizeFileName(item.title, fileExtension);

          const downloadResponse = await fetch('/api/youtube/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: item.id,
              itag: finalItag,
              fileName: fileName,
              title: item.title,
            }),
          });

          if (downloadResponse.ok) {
            successCount++;
            const successData = await downloadResponse.json();
             toast({
                title: `Started: ${item.title.substring(0,30)}...`,
                description: `Task ID: ${successData.taskId}`
                // variant: "success" // Removed, will use default
            });
          } else {
            errorCount++;
            const errorData = await downloadResponse.json();
            toast({
                title: `Error: ${item.title.substring(0,30)}...`,
                description: errorData.error || "Failed to start download.",
                variant: "destructive"
            });
          }
        } catch (error) {
          errorCount++;
          console.error(`Error processing playlist item ${item.title}:`, error);
          toast({ title: `Error processing: ${item.title.substring(0,30)}...`, description: (error as Error).message, variant: "destructive" });
        }
         await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
      }

      toast({
        title: dictionary?.playlistDownloadCompleteTitle || "Playlist Download Attempt Finished",
        description: `${successCount} ${dictionary?.downloadsStarted || "downloads started"}, ${errorCount} ${dictionary?.errorsEncountered || "errors encountered"}.`,
        variant: (errorCount > 0 && successCount === 0) ? "destructive" : (errorCount > 0 ? "default" : "default")
      });
      setIsDownloading(false);
  };
  
  const togglePlaylistItemSelection = (itemId: string) => {
    setPlaylistItemsSelection(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const toggleAllPlaylistItems = () => {
    if (!currentContent || !('videos' in currentContent)) return; // Check 'videos' field
    const allSelected = currentContent.videos.every(item => playlistItemsSelection[item.id]);
    const newSelections: Record<string, boolean> = {};
    currentContent.videos.forEach(item => { // Iterate over 'videos'
      newSelections[item.id] = !allSelected;
    });
    setPlaylistItemsSelection(newSelections);
  };

// Sanitize filename and add appropriate extension
const sanitizeFileName = (name: string, desiredExtension: string): string => {
  // Remove most non-alphanumeric characters, except for a few safe ones like underscore, hyphen, space
  let saneName = name.replace(/[^\w\s.-]/gi, ''); 
  // Replace multiple spaces/hyphens with a single underscore
  saneName = saneName.replace(/[\s-]+/g, '_');
  // Limit length to avoid issues
  saneName = saneName.substring(0, 150); 
  return `${saneName}.${desiredExtension}`;
};

// State for formats to display in dropdowns
const [videoFormatsToShow, setVideoFormatsToShow] = useState<Format[]>([]);
const [audioFormatsToShow, setAudioFormatsToShow] = useState<Format[]>([]);

useEffect(() => {
  const updateFormats = async () => {
    if (currentContent && 'formats' in currentContent) { // Single ApiVideoInfo
      const allVideoFormats = currentContent.formats.video || [];
      const allAudioFormats = currentContent.formats.audio || [];

      if (selectedDownloadType === 'videoaudio') {
        setVideoFormatsToShow(allVideoFormats.filter(f => f.hasVideo && f.hasAudio));
        setAudioFormatsToShow(allAudioFormats);
      } else if (selectedDownloadType === 'videoonly') {
        setVideoFormatsToShow(allVideoFormats.filter(f => f.hasVideo && !f.hasAudio));
        setAudioFormatsToShow([]);
      } else { // audioonly
        setVideoFormatsToShow([]);
        setAudioFormatsToShow(allAudioFormats);
      }
    } else if (currentContent && 'videos' in currentContent && currentContent.videos.length > 0) {
      // For playlists, fetch info for the first video to populate global format selectors
      // This is a common UX pattern for setting a "preferred" quality for batch operations.
      try {
        // Temporarily set loading for format fields or a subtle indicator if desired
        const response = await fetch('/api/youtube/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${currentContent.videos[0].id}` }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.type === 'video' && result.videoInfo) {
            const firstVideoInfo = result.videoInfo as ApiVideoInfo;
            const allVideoFormats = firstVideoInfo.formats.video || [];
            const allAudioFormats = firstVideoInfo.formats.audio || [];

            if (selectedDownloadType === 'videoaudio') {
              setVideoFormatsToShow(allVideoFormats.filter(f => f.hasVideo && f.hasAudio));
              setAudioFormatsToShow(allAudioFormats);
            } else if (selectedDownloadType === 'videoonly') {
              setVideoFormatsToShow(allVideoFormats.filter(f => f.hasVideo && !f.hasAudio));
              setAudioFormatsToShow([]);
            } else { // audioonly
              setVideoFormatsToShow([]);
              setAudioFormatsToShow(allAudioFormats);
            }
          } else { // Failed to get first video's info, clear formats
            setVideoFormatsToShow([]);
            setAudioFormatsToShow([]);
          }
        } else { // Response not ok
          setVideoFormatsToShow([]);
          setAudioFormatsToShow([]);
        }
      } catch (error) {
        console.error("Error fetching first playlist video info for formats:", error);
        setVideoFormatsToShow([]);
        setAudioFormatsToShow([]);
      }
    } else { // No content or empty playlist
      setVideoFormatsToShow([]);
      setAudioFormatsToShow([]);
    }
  };
  updateFormats();
}, [currentContent, selectedDownloadType]);

// Auto-select default itag when formats change
useEffect(() => {
  if (selectedDownloadType !== 'audioonly' && videoFormatsToShow.length > 0) {
    if (!selectedVideoItag || !videoFormatsToShow.find(f => f.itag === selectedVideoItag)) {
      setSelectedVideoItag(videoFormatsToShow[0].itag);
    }
  } else if (selectedDownloadType === 'audioonly') {
     setSelectedVideoItag(null);
  }
}, [videoFormatsToShow, selectedDownloadType, selectedVideoItag]);

useEffect(() => {
  if (selectedDownloadType !== 'videoonly' && audioFormatsToShow.length > 0) {
    if (!selectedAudioItag || !audioFormatsToShow.find(f => f.itag === selectedAudioItag)) {
      setSelectedAudioItag(audioFormatsToShow[0].itag);
    }
  } else if (selectedDownloadType === 'videoonly') {
    setSelectedAudioItag(null);
  }
}, [audioFormatsToShow, selectedDownloadType, selectedAudioItag]);


  if (!dictionary || !locale) { 
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <YoutubeIcon className="h-16 w-16 text-primary mx-auto mb-3"/>
        <h1 className="text-4xl font-bold tracking-tight">{dictionary.mainTitle}</h1>
        <p className="text-xl text-muted-foreground mt-2">{dictionary.mainDescription}</p>
      </div>

      <Card className="shadow-xl border-border/50 max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">{dictionary.inputCardTitle}</CardTitle>
          <CardDescription>{dictionary.inputCardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSearch)} className="space-y-6">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">{dictionary.urlInputLabel}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder={dictionary.urlInputPlaceholder} {...field} className="h-12 text-base flex-grow" />
                      </FormControl>
                      <Button type="submit" size="lg" className="h-12 px-5" disabled={isLoadingInfo || !form.formState.isValid || !currentUrl.trim()}>
                        {isLoadingInfo ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <SearchIcon className="h-5 w-5" />}
                        <span className="ml-2 hidden sm:inline">{dictionary.fetchInfoButton}</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoadingInfo && !currentContent && (
        <div className="flex items-center justify-center p-6 text-muted-foreground">
          <Loader2Icon className="mr-2 h-6 w-6 animate-spin" /> {dictionary.fetchingDetailsText}
        </div>
      )}

      {previewVideoId && !(currentContent && 'items' in currentContent) && !isLoadingInfo && form.formState.isValid && currentUrl && (
           <Card className="max-w-3xl mx-auto mt-6 shadow-md border-border/30">
             <CardContent className="p-4 md:p-6">
                <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner">
                    <iframe
                        width="100%" height="100%"
                        src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=0&modestbranding=1&rel=0`}
                        title={dictionary.videoPreviewTitle} frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen key={`preview-${previewVideoId}`}>
                    </iframe>
                </div>
             </CardContent>
           </Card>
      )}

      {currentContent && (
        <Card className="animate-fade-in-up shadow-xl border-border/40 max-w-5xl mx-auto mt-8">
            {/* Case 1: Single Video ('ApiVideoInfo') */}
            {'title' in currentContent && !('items' in currentContent) && 'formats' in currentContent && currentContent.formats && (
              <>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FilmIcon className="h-6 w-6 text-accent"/> {currentContent.title}
                    </CardTitle>
                    <CardDescription>
                      {dictionary.authorLabel}: {currentContent.author.name} &bull; {dictionary.durationLabel}: {formatDuration(currentContent.duration, dictionary)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    {currentContent.thumbnail && (
                        <div className="aspect-video w-full overflow-hidden rounded-lg relative bg-muted shadow-inner">
                            <Image src={currentContent.thumbnail} alt={currentContent.title || "Video thumbnail"} fill style={{objectFit:"cover"}} data-ai-hint="video thumbnail"/>
                        </div>
                    )}
                    <div className="space-y-6">
                        <DownloadOptionsFields {...{selectedDownloadType, setSelectedDownloadType, videoFormatsToShow, selectedVideoItag, setSelectedVideoItag, audioFormatsToShow, selectedAudioItag, setSelectedAudioItag, selectedAudioFormat, setSelectedAudioFormat, dictionary }} />
                        <Button 
                          onClick={() => handleDownload()} 
                          disabled={isDownloading || (selectedDownloadType !== 'audioonly' && !selectedVideoItag) || (selectedDownloadType !== 'videoonly' && !selectedAudioItag)} 
                          className="w-full h-12 text-base"
                        >
                            {isDownloading ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloudIcon className="mr-2 h-5 w-5" />}
                            {dictionary.downloadButton}
                        </Button>
                    </div>
                </CardContent>
              </>
            )}

            {/* Case 2: Playlist ('ApiPlaylistInfo') */}
            {'videos' in currentContent && currentContent.videos && (
                <>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <ListMusicIcon className="h-6 w-6 text-accent"/> {dictionary.playlistTitleLabel}: {currentContent.title}
                        </CardTitle>
                        <CardDescription>
                          {currentContent.itemCount} {dictionary.videosLabel}. 
                          {currentContent.author?.name && ` ${dictionary.authorLabel}: ${currentContent.author.name}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Global download options for playlist - may need refinement for how quality is selected for all items */}
                        <DownloadOptionsFields {...{selectedDownloadType, setSelectedDownloadType, videoFormatsToShow, selectedVideoItag, setSelectedVideoItag, audioFormatsToShow, selectedAudioItag, setSelectedAudioItag, selectedAudioFormat, setSelectedAudioFormat, dictionary, sectionTitle: dictionary.playlistGlobalSettingsTitle }} />
                        
                        {isPlaylistLoaded && ( // Show note only when a playlist is loaded
                            <Alert variant="default" className="mt-4">
                                <VideoIcon className="h-4 w-4" />
                                <AlertTitle>{dictionary?.playlistQualityNoteTitle || "Playlist Download Quality"}</AlertTitle>
                                <AlertDescription>
                                    {dictionary?.playlistQualityNoteDesc || "The selected quality is a preference. For each video, the best available format matching this preference will be downloaded. If not available, a fallback quality will be chosen."}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex justify-between items-center mt-4">
                            <Button 
                              onClick={handleDownloadPlaylist} 
                              disabled={isDownloading || Object.values(playlistItemsSelection).every(v => !v)} 
                              className="h-11"
                            >
                                {isDownloading ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloudIcon className="mr-2 h-5 w-5" />}
                                {dictionary.downloadSelectedButton} ({Object.values(playlistItemsSelection).filter(v => v).length})
                            </Button>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="select-all-playlist"
                                    checked={currentContent.videos.length > 0 && currentContent.videos.every(item => playlistItemsSelection[item.id])}
                                    onCheckedChange={toggleAllPlaylistItems} />
                                <FormLabel htmlFor="select-all-playlist" className="text-sm font-medium">{dictionary.selectAllLabel}</FormLabel>
                            </div>
                        </div>

                        <ScrollArea className="h-[400px] border rounded-md p-2 bg-muted/30">
                            <div className="space-y-3">
                            {currentContent.videos.map((item) => (
                                <Card key={item.id} className="flex items-center gap-3 p-3 bg-card hover:bg-card/80 shadow-sm">
                                    <Checkbox checked={playlistItemsSelection[item.id] || false} onCheckedChange={() => togglePlaylistItemSelection(item.id)} id={`item-${item.id}`} />
                                    <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0 bg-muted/50">
                                        <Image src={item.thumbnail || `https://placehold.co/96x54.png?text=${item.title.substring(0,10)}`} alt={item.title} fill style={{objectFit:"cover"}} data-ai-hint="video thumbnail small"/>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-semibold truncate" title={item.title}>{item.title}</p>
                                        <p className="text-xs text-muted-foreground">{item.authorName} &bull; {formatDuration(item.duration, dictionary)}</p>
                                    </div>
                                </Card>
                            ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </>
            )}
        </Card>
      )}
      <style jsx global>{`
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

interface DownloadOptionsProps {
    selectedDownloadType: 'videoaudio' | 'videoonly' | 'audioonly';
    setSelectedDownloadType: (type: 'videoaudio' | 'videoonly' | 'audioonly') => void;
    videoFormatsToShow: Format[]; // Uses the new Format type
    selectedVideoItag: number | null;
    setSelectedVideoItag: (itag: number | null) => void;
    audioFormatsToShow: Format[]; // Uses the new Format type
    selectedAudioItag: number | null;
    setSelectedAudioItag: (itag: number | null) => void;
    selectedAudioFormat: 'm4a' | 'opus';
    setSelectedAudioFormat: (format: 'm4a' | 'opus') => void;
    sectionTitle?: string;
    dictionary: any; 
}

function DownloadOptionsFields({
    selectedDownloadType, setSelectedDownloadType,
    videoFormatsToShow, selectedVideoItag, setSelectedVideoItag,
    audioFormatsToShow, selectedAudioItag, setSelectedAudioItag,
    selectedAudioFormat, setSelectedAudioFormat, sectionTitle, dictionary
}: DownloadOptionsProps) {

    const handleVideoItagChange = (value: string) => setSelectedVideoItag(value ? parseInt(value) : null);
    const handleAudioItagChange = (value: string) => setSelectedAudioItag(value ? parseInt(value) : null);

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-background/30">
            {sectionTitle && <h4 className="text-md font-semibold mb-3">{sectionTitle}</h4>}
            <div>
                <FormLabel className="text-base font-medium">{dictionary.downloadTypeLabel}</FormLabel>
                <RadioGroup value={selectedDownloadType} onValueChange={(value) => setSelectedDownloadType(value as any)} className="flex gap-4 mt-2">
                    <FormItem className="flex items-center space-x-2"><RadioGroupItem value="videoaudio" id="type-va" /><FormLabel htmlFor="type-va">{dictionary.videoAudioLabel}</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2"><RadioGroupItem value="videoonly" id="type-vo" /><FormLabel htmlFor="type-vo">{dictionary.videoOnlyLabel}</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2"><RadioGroupItem value="audioonly" id="type-ao" /><FormLabel htmlFor="type-ao">{dictionary.audioOnlyLabel}</FormLabel></FormItem>
                </RadioGroup>
            </div>

            {selectedDownloadType !== 'audioonly' && (
                <div>
                    <FormLabel htmlFor="video-quality-select" className="text-base font-medium">{dictionary.videoQualityLabel}</FormLabel>
                    <Select value={selectedVideoItag?.toString() || ""} onValueChange={handleVideoItagChange} name="video-quality-select" disabled={videoFormatsToShow.length === 0}>
                        <SelectTrigger className="h-11 mt-1" id="video-quality-select"><SelectValue placeholder={dictionary.selectVideoQualityPlaceholder} /></SelectTrigger>
                        <SelectContent>
                            {videoFormatsToShow.map((format) => (
                                <SelectItem key={`v-${format.itag}`} value={format.itag.toString()}>
                                    {format.qualityLabel || "N/A"} ({format.container || 'N/A'})
                                    {format.fps ? `, ${format.fps}fps` : ''}
                                    {format.hasAudio !== undefined ? `, Audio: ${format.hasAudio ? 'Yes' : 'No'}` : ''}
                                </SelectItem>
                            ))}
                            {videoFormatsToShow.length === 0 && <SelectItem value="disabled" disabled>{dictionary.noVideoFormats}</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {selectedDownloadType !== 'videoonly' && (
                <div>
                    <FormLabel htmlFor="audio-quality-select" className="text-base font-medium">{dictionary.audioQualityLabel}</FormLabel>
                    <Select value={selectedAudioItag?.toString() || ""} onValueChange={handleAudioItagChange} name="audio-quality-select" disabled={audioFormatsToShow.length === 0}>
                        <SelectTrigger className="h-11 mt-1" id="audio-quality-select"><SelectValue placeholder={dictionary.selectAudioQualityPlaceholder} /></SelectTrigger>
                        <SelectContent>
                            {audioFormatsToShow.map((format) => (
                                <SelectItem key={`a-${format.itag}`} value={format.itag.toString()}>
                                    {format.qualityLabel || `${format.audioBitrate || 'N/A'}kbps`} ({format.container || 'N/A'})
                                </SelectItem>
                            ))}
                            {audioFormatsToShow.length === 0 && <SelectItem value="disabled" disabled>{dictionary.noAudioFormats}</SelectItem>}
                        </SelectContent>
                    </Select>
                     <div className="mt-2">
                        <FormLabel className="text-sm font-medium text-muted-foreground">{dictionary.audioContainerPreferenceLabel || "Preferred Audio Container"}</FormLabel>
                         <RadioGroup value={selectedAudioFormat} onValueChange={(value) => setSelectedAudioFormat(value as 'm4a'|'opus')} className="flex gap-4 mt-1">
                            <FormItem className="flex items-center space-x-2"><RadioGroupItem value="m4a" id="format-m4a" /><FormLabel htmlFor="format-m4a" className="text-sm">M4A (AAC)</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><RadioGroupItem value="opus" id="format-opus" /><FormLabel htmlFor="format-opus" className="text-sm">Opus</FormLabel></FormItem>
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground mt-1">{dictionary.audioContainerNote}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
