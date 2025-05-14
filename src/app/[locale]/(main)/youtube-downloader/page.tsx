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
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, use } from "react"; // Added use
import { Loader2Icon, DownloadCloudIcon, YoutubeIcon, SearchIcon, ListMusicIcon, VideoIcon, FilmIcon } from "lucide-react"; // Corrected import for Loader2Icon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary'; 

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
  quality: string;
  itag: number;
  mimeType?: string;
  container?: string;
  fps?: number; 
  audioBitrate?: number; 
  hasAudio?: boolean; 
  hasVideo?: boolean; 
}

interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  videoFormats: Format[];
  audioFormats: Format[];
}

interface PlaylistItem extends VideoInfo {
  selected?: boolean; 
}

interface PlaylistInfo {
  title: string;
  author?: string; 
  itemCount: number;
  items: PlaylistItem[];
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

function formatDuration(secondsStr: string, dict: any): string {
    const seconds = parseInt(secondsStr, 10);
    if (isNaN(seconds) || seconds < 0) return dict?.na || "N/A";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    let timeString = "";
    if (hrs > 0) timeString += `${hrs}:`;
    timeString += `${mins.toString().padStart(hrs > 0 ? 2 : 1, '0')}:${secs.toString().padStart(2, '0')}`;
    return timeString;
}

interface YouTubeDownloaderPageProps {
  params: Promise<{ locale: Locale }>; 
}

export default function YouTubeDownloaderPage(props: YouTubeDownloaderPageProps) {
  const resolvedParams = use(props.params); 
  const locale = resolvedParams.locale;

  const { toast } = useToast();
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [currentContent, setCurrentContent] = useState<VideoInfo | PlaylistInfo | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  const [selectedDownloadType, setSelectedDownloadType] = useState<'videoaudio' | 'videoonly' | 'audioonly'>('videoaudio');
  const [selectedVideoItag, setSelectedVideoItag] = useState<string>("");
  const [selectedAudioItag, setSelectedAudioItag] = useState<string>("");
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<'aac' | 'opus'>('aac'); 

  const [playlistItemsSelection, setPlaylistItemsSelection] = useState<Record<string, boolean>>({});
  const [dictionary, setDictionary] = useState<any>(null);

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

    const { videoId, playlistId } = getYouTubeId(data.url);

    let fetchUrl = '/api/youtube/video-info?';
    if (playlistId) {
        fetchUrl += `playlistUrl=${encodeURIComponent(data.url)}`;
    } else if (videoId) {
        fetchUrl += `url=${encodeURIComponent(data.url)}`;
         setPreviewVideoId(videoId);
    } else {
        toast({ title: dictionary?.errorInvalidUrlTitle || "Invalid URL", description: dictionary?.errorInvalidUrlDesc || "Could not identify a video or playlist ID.", variant: "destructive" });
        setIsLoadingInfo(false);
        return;
    }
    
    try {
      const response = await fetch(fetchUrl);
      const result = await response.json();

      if (!response.ok || result.error) {
        const errorDescription = result.error || `${dictionary?.errorFetchStatus || "Failed with status"} ${response.status}.`;
        toast({ title: dictionary?.errorFetchTitle || "Error Fetching Info", description: errorDescription, variant: "destructive" });
        setCurrentContent(null); 
      } else {
        setCurrentContent(result);
        if ('items' in result && result.items.length > 0) { 
          setSelectedVideoItag(result.items[0].videoFormats?.[0]?.itag.toString() || "");
          setSelectedAudioItag(result.items[0].audioFormats?.[0]?.itag.toString() || "");
          setPlaylistItemsSelection(result.items.reduce((acc: Record<string, boolean>, item: PlaylistItem) => {
            acc[item.id] = true; 
            return acc;
          }, {}));
        } else if ('title' in result && !('items' in result)) { 
          setSelectedVideoItag(result.videoFormats?.[0]?.itag.toString() || "");
          setSelectedAudioItag(result.audioFormats?.[0]?.itag.toString() || "");
        }
      }
    } catch (error) {
      toast({ title: dictionary?.errorNetworkTitle || "Network/Parsing Error", description: dictionary?.errorNetworkDesc || "Could not fetch information. Check network or URL.", variant: "destructive" });
      setCurrentContent(null);
    } finally {
      setIsLoadingInfo(false);
    }
  };
  
  const handleDownload = async (videoToDownload?: VideoInfo) => {
    const contentToUse = videoToDownload || (currentContent && !('items' in currentContent) ? currentContent : null);

    if (!contentToUse || !currentUrl) {
      toast({ title: dictionary?.errorNoVideoTitle || "Error", description: dictionary?.errorNoVideoDesc || "No video selected or URL is missing.", variant: "destructive" });
      return;
    }
    
    let itag: string | undefined;
    let downloadApiEndpoint: string;

    if (selectedDownloadType === 'audioonly') {
      itag = selectedAudioItag;
      downloadApiEndpoint = '/api/youtube/download-audio';
    } else { 
      itag = selectedVideoItag;
      downloadApiEndpoint = '/api/youtube/download-video';
    }

    if (!itag) {
      toast({ title: dictionary?.errorSelectFormatTitle || "Select Format", description: `${dictionary?.errorSelectFormatDesc || "Please select a quality for"} ${selectedDownloadType}.`, variant: "destructive" });
      return;
    }

    const sourceUrl = videoToDownload ? `https://www.youtube.com/watch?v=${videoToDownload.id}` : currentUrl;
    const downloadUrl = `${downloadApiEndpoint}?url=${encodeURIComponent(sourceUrl)}&itag=${itag}&title=${encodeURIComponent(contentToUse.title)}&type=${selectedDownloadType}&audioFormat=${selectedAudioFormat}`;
    
    setIsDownloading(true);
    window.location.href = downloadUrl;

    setTimeout(() => {
      setIsDownloading(false);
      toast({ title: dictionary?.downloadStartedTitle || "Download Started", description: `${contentToUse.title} ${dictionary?.downloadStartedDesc || "should begin downloading shortly."}`});
    }, 3000); 
  };

  const handleDownloadPlaylist = async () => {
      if (!currentContent || !('items' in currentContent)) {
          toast({title: dictionary?.errorNoPlaylistTitle || "Error", description: dictionary?.errorNoPlaylistDesc || "No playlist loaded.", variant: "destructive"});
          return;
      }
      const selectedItems = currentContent.items.filter(item => playlistItemsSelection[item.id]);
      if (selectedItems.length === 0) {
          toast({title: dictionary?.errorNoItemsSelectedTitle || "No items selected", description: dictionary?.errorNoItemsSelectedDesc || "Please select at least one video from the playlist to download.", variant: "default"});
          return;
      }

      setIsDownloading(true);
      toast({title: dictionary?.playlistDownloadStartedTitle || "Playlist Download Started", description: `${dictionary?.playlistDownloadStartedDesc || "Starting download for"} ${selectedItems.length} ${dictionary?.items || "items"}.`});

      for (const item of selectedItems) {
          await new Promise(resolve => setTimeout(resolve, 500)); 
          await handleDownload(item); 
      }
  };
  
  const togglePlaylistItemSelection = (itemId: string) => {
    setPlaylistItemsSelection(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const toggleAllPlaylistItems = () => {
    if (!currentContent || !('items' in currentContent)) return;
    const allSelected = currentContent.items.every(item => playlistItemsSelection[item.id]);
    const newSelections: Record<string, boolean> = {};
    currentContent.items.forEach(item => {
      newSelections[item.id] = !allSelected;
    });
    setPlaylistItemsSelection(newSelections);
  };

  const getFilteredFormats = (formats: Format[], type: 'videoaudio' | 'videoonly' | 'audioonly'): Format[] => {
    if (!formats) return [];
    switch (type) {
        case 'videoaudio': return formats.filter(f => f.hasVideo && f.hasAudio);
        case 'videoonly': return formats.filter(f => f.hasVideo && !f.hasAudio); 
        case 'audioonly': return formats.filter(f => f.hasAudio && !f.hasVideo);
        default: return formats;
    }
  };
  
  const videoFormatsToShow = currentContent && 'videoFormats' in currentContent 
    ? getFilteredFormats(currentContent.videoFormats, selectedDownloadType) 
    : (currentContent && 'items' in currentContent && currentContent.items.length > 0 
        ? getFilteredFormats(currentContent.items[0].videoFormats, selectedDownloadType) 
        : []);

  const audioFormatsToShow = currentContent && 'audioFormats' in currentContent
    ? getFilteredFormats(currentContent.audioFormats, 'audioonly') 
    : (currentContent && 'items' in currentContent && currentContent.items.length > 0
        ? getFilteredFormats(currentContent.items[0].audioFormats, 'audioonly')
        : []);

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
            {'title' in currentContent && !('items' in currentContent) && (
              <>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FilmIcon className="h-6 w-6 text-accent"/> {currentContent.title}
                    </CardTitle>
                    <CardDescription>{dictionary.authorLabel}: {currentContent.author} &bull; {dictionary.durationLabel}: {formatDuration(currentContent.duration, dictionary)}</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    {currentContent.thumbnail && (
                        <div className="aspect-video w-full overflow-hidden rounded-lg relative bg-muted shadow-inner">
                            <Image src={currentContent.thumbnail} alt={dictionary.videoThumbnailAlt} fill objectFit="cover" data-ai-hint="video thumbnail"/>
                        </div>
                    )}
                    <div className="space-y-6">
                        <DownloadOptionsFields {...{selectedDownloadType, setSelectedDownloadType, videoFormatsToShow, selectedVideoItag, setSelectedVideoItag, audioFormatsToShow, selectedAudioItag, setSelectedAudioItag, selectedAudioFormat, setSelectedAudioFormat, dictionary }} />
                        <Button onClick={() => handleDownload()} disabled={isDownloading} className="w-full h-12 text-base">
                            {isDownloading ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloudIcon className="mr-2 h-5 w-5" />}
                            {dictionary.downloadButton}
                        </Button>
                    </div>
                </CardContent>
              </>
            )}

            {'items' in currentContent && (
                <>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <ListMusicIcon className="h-6 w-6 text-accent"/> {dictionary.playlistTitleLabel}: {currentContent.title}
                        </CardTitle>
                        <CardDescription>{currentContent.itemCount} {dictionary.videosLabel}. {currentContent.author && `${dictionary.authorLabel}: ${currentContent.author}`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <DownloadOptionsFields {...{selectedDownloadType, setSelectedDownloadType, videoFormatsToShow, selectedVideoItag, setSelectedVideoItag, audioFormatsToShow, selectedAudioItag, setSelectedAudioItag, selectedAudioFormat, setSelectedAudioFormat, dictionary, sectionTitle: dictionary.playlistGlobalSettingsTitle }} />
                        
                        <div className="flex justify-between items-center">
                            <Button onClick={handleDownloadPlaylist} disabled={isDownloading || Object.values(playlistItemsSelection).every(v => !v) } className="h-11">
                                {isDownloading ? <Loader2Icon className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloudIcon className="mr-2 h-5 w-5" />}
                                {dictionary.downloadSelectedButton} ({Object.values(playlistItemsSelection).filter(v => v).length})
                            </Button>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="select-all-playlist"
                                    checked={currentContent.items.length > 0 && currentContent.items.every(item => playlistItemsSelection[item.id])}
                                    onCheckedChange={toggleAllPlaylistItems} />
                                <FormLabel htmlFor="select-all-playlist" className="text-sm font-medium">{dictionary.selectAllLabel}</FormLabel>
                            </div>
                        </div>

                        <ScrollArea className="h-[400px] border rounded-md p-2 bg-muted/30">
                            <div className="space-y-3">
                            {currentContent.items.map((item) => (
                                <Card key={item.id} className="flex items-center gap-3 p-3 bg-card hover:bg-card/80 shadow-sm">
                                    <Checkbox checked={playlistItemsSelection[item.id] || false} onCheckedChange={() => togglePlaylistItemSelection(item.id)} id={`item-${item.id}`} />
                                    <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0 bg-muted/50">
                                        <Image src={item.thumbnail} alt={item.title} fill objectFit="cover" data-ai-hint="video thumbnail small"/>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-semibold truncate" title={item.title}>{item.title}</p>
                                        <p className="text-xs text-muted-foreground">{item.author} &bull; {formatDuration(item.duration, dictionary)}</p>
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
    videoFormatsToShow: Format[];
    selectedVideoItag: string;
    setSelectedVideoItag: (itag: string) => void;
    audioFormatsToShow: Format[];
    selectedAudioItag: string;
    setSelectedAudioItag: (itag: string) => void;
    selectedAudioFormat: 'aac' | 'opus';
    setSelectedAudioFormat: (format: 'aac' | 'opus') => void;
    sectionTitle?: string;
    dictionary: any; 
}

function DownloadOptionsFields({
    selectedDownloadType, setSelectedDownloadType,
    videoFormatsToShow, selectedVideoItag, setSelectedVideoItag,
    audioFormatsToShow, selectedAudioItag, setSelectedAudioItag,
    selectedAudioFormat, setSelectedAudioFormat, sectionTitle, dictionary
}: DownloadOptionsProps) {
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
                    <Select value={selectedVideoItag} onValueChange={setSelectedVideoItag} name="video-quality-select" disabled={videoFormatsToShow.length === 0}>
                        <SelectTrigger className="h-11 mt-1" id="video-quality-select"><SelectValue placeholder={dictionary.selectVideoQualityPlaceholder} /></SelectTrigger>
                        <SelectContent>
                            {videoFormatsToShow.map((format) => (
                                <SelectItem key={`v-${format.itag}`} value={format.itag.toString()}>
                                    {format.quality} ({format.container}{format.fps ? `, ${format.fps}fps` : ''})
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
                    <Select value={selectedAudioItag} onValueChange={setSelectedAudioItag} name="audio-quality-select" disabled={audioFormatsToShow.length === 0}>
                        <SelectTrigger className="h-11 mt-1" id="audio-quality-select"><SelectValue placeholder={dictionary.selectAudioQualityPlaceholder} /></SelectTrigger>
                        <SelectContent>
                            {audioFormatsToShow.map((format) => (
                                <SelectItem key={`a-${format.itag}`} value={format.itag.toString()}>
                                    {format.quality} ({format.container || format.mimeType?.split('/')[1]})
                                </SelectItem>
                            ))}
                            {audioFormatsToShow.length === 0 && <SelectItem value="disabled" disabled>{dictionary.noAudioFormats}</SelectItem>}
                        </SelectContent>
                    </Select>
                     <div className="mt-2">
                        <FormLabel className="text-sm font-medium text-muted-foreground">{dictionary.audioContainerLabel}</FormLabel>
                         <RadioGroup value={selectedAudioFormat} onValueChange={(value) => setSelectedAudioFormat(value as 'aac'|'opus')} className="flex gap-4 mt-1">
                            <FormItem className="flex items-center space-x-2"><RadioGroupItem value="aac" id="format-aac" /><FormLabel htmlFor="format-aac" className="text-sm">{dictionary.aacLabel}</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><RadioGroupItem value="opus" id="format-opus" /><FormLabel htmlFor="format-opus" className="text-sm">{dictionary.opusLabel}</FormLabel></FormItem>
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground mt-1">{dictionary.audioContainerNote}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
