// src/components/features/home/YouTubeDownloaderForm.tsx
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
import { useState, useEffect } from "react";
import { Loader2, DownloadCloudIcon, YoutubeIcon, SearchIcon, XCircleIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Label } from "@/components/ui/label";

const youtubeUrlFormSchema = z.object({
  url: z.string().url({ message: "Please enter a valid YouTube URL." })
  .refine(url => {
    try {
      const { hostname } = new URL(url);
      return hostname.includes("youtube.com") || hostname.includes("youtu.be");
    } catch {
      return false;
    }
  }, "Please enter a valid YouTube URL."),
});

type YouTubeUrlFormValues = z.infer<typeof youtubeUrlFormSchema>;

interface VideoFormat {
  qualityLabel: string; 
  itag: number;
  mimeType?: string;
  container?: string;
  fps?: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
}
interface AudioFormat {
  quality: string; 
  itag: number;
  mimeType?: string;
  container?: string;
  audioBitrate?: number;
}

interface YouTubeVideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  videoFormats: VideoFormat[];
  audioFormats: AudioFormat[];
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v');
    }
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.substring(1).split('?')[0];
    }
     if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/shorts/')) {
        const parts = urlObj.pathname.split('/shorts/');
        if (parts[1]) return parts[1].split('?')[0];
    }
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
        const parts = urlObj.pathname.split('/embed/');
        if (parts[1]) return parts[1].split('?')[0];
    }
    return null;
  } catch {
    return null;
  }
}

function formatDuration(secondsStr: string): string {
    const seconds = parseInt(secondsStr, 10);
    if (isNaN(seconds) || seconds < 0) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}


export function YouTubeDownloaderForm() {
  const { toast } = useToast();
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false);
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [selectedVideoItag, setSelectedVideoItag] = useState<string>("");
  const [selectedAudioItag, setSelectedAudioItag] = useState<string>("");
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  const form = useForm<YouTubeUrlFormValues>({
    resolver: zodResolver(youtubeUrlFormSchema),
    defaultValues: { url: "" },
    mode: "onBlur",
  });

  const currentUrl = form.watch("url");

  useEffect(() => {
    if (!currentUrl.trim()) {
      setVideoInfo(null);
      setPreviewVideoId(null);
      return;
    }
    const validation = youtubeUrlFormSchema.safeParse({ url: currentUrl });
    if (!validation.success) {
        if (videoInfo) setVideoInfo(null);
        if (previewVideoId) setPreviewVideoId(null);
    } else {
        const extractedId = getYouTubeVideoId(currentUrl);
        if (previewVideoId !== extractedId) { 
            setPreviewVideoId(extractedId);
        }
    }
  }, [currentUrl, videoInfo, previewVideoId]);

  const onSearch = async (data: YouTubeUrlFormValues) => {
    setIsLoadingInfo(true);
    setVideoInfo(null); 
    const extractedId = getYouTubeVideoId(data.url);
    setPreviewVideoId(extractedId);


    if (!extractedId) {
        toast({
            title: "Invalid YouTube URL",
            description: "Could not extract video ID from the URL.",
            variant: "destructive",
        });
        setIsLoadingInfo(false);
        return;
    }
    
    try {
      const response = await fetch(`/api/youtube/video-info?url=${encodeURIComponent(data.url)}`);
      const result = await response.json();

      if (!response.ok) {
        toast({ title: "Error", description: result.error || "Failed to fetch video info.", variant: "destructive", action: <XCircleIcon className="text-white" /> });
        setPreviewVideoId(null); 
      } else {
        setVideoInfo(result);
        if (result.videoFormats?.length > 0) setSelectedVideoItag(result.videoFormats[0].itag.toString());
        if (result.audioFormats?.length > 0) setSelectedAudioItag(result.audioFormats[0].itag.toString());
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive", action: <XCircleIcon className="text-white" /> });
      setPreviewVideoId(null);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleDownload = (type: 'video' | 'audio') => {
    if (!videoInfo || !currentUrl) return;

    const itag = type === 'video' ? selectedVideoItag : selectedAudioItag;
    if (!itag) {
      toast({ title: "Select Format", description: `Please select a ${type} quality.`, variant: "destructive" });
      return;
    }

    const downloadUrl = `/api/youtube/download-${type}?url=${encodeURIComponent(currentUrl)}&itag=${itag}&title=${encodeURIComponent(videoInfo.title)}`;
    
    if (type === 'video') setIsDownloadingVideo(true);
    else setIsDownloadingAudio(true);

    window.location.href = downloadUrl;

    setTimeout(() => {
      if (type === 'video') setIsDownloadingVideo(false);
      else setIsDownloadingAudio(false);
      toast({ title: "Download Started", description: `${videoInfo.title} (${type}) should begin downloading shortly.`});
    }, 3000); 
  };

  return (
    <div> {/* Wrapper div to ensure single root for the component, and to house style tag separately */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSearch)} className="space-y-6">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base flex items-center sr-only"> 
                  <YoutubeIcon className="h-5 w-5 mr-2 text-red-500" />
                  YouTube Video Link
                </FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      {...field}
                      className="h-12 text-base flex-grow"
                    />
                  </FormControl>
                  <Button type="submit" size="lg" className="h-12 px-5" disabled={isLoadingInfo || !form.formState.isValid || !currentUrl.trim()}>
                    {isLoadingInfo ? <Loader2 className="h-5 w-5 animate-spin" /> : <SearchIcon className="h-5 w-5" />}
                    <span className="ml-2 hidden sm:inline">Fetch Info</span>
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {isLoadingInfo && !videoInfo && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Fetching video details...
            </div>
          )}
          
          {previewVideoId && !videoInfo && !isLoadingInfo && form.formState.isValid && currentUrl && (
               <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner mt-4">
                  <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=0&modestbranding=1&rel=0`}
                      title="YouTube video player - Preview"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      key={`preview-${previewVideoId}`} 
                  ></iframe>
              </div>
          )}


          {videoInfo && (
            <Card className="animate-fade-in-up shadow-md border-border/30">
              <CardContent className="p-4 md:p-6 grid md:grid-cols-12 gap-4 md:gap-6">
                <div className="md:col-span-5">
                   {previewVideoId && (
                      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner">
                          <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=0&modestbranding=1&rel=0`}
                          title={videoInfo.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          key={`loaded-${previewVideoId}`} 
                          ></iframe>
                      </div>
                   )}
                   {!previewVideoId && videoInfo.thumbnail && ( 
                       <div className="aspect-video w-full overflow-hidden rounded-lg relative bg-muted shadow-inner">
                          <Image src={videoInfo.thumbnail} alt="Video thumbnail" fill objectFit="cover" data-ai-hint="video thumbnail"/>
                       </div>
                   )}
                </div>
                <div className="md:col-span-7 space-y-4">
                  <div>
                      <h3 className="text-lg font-semibold leading-tight" title={videoInfo.title}>{videoInfo.title}</h3>
                      <p className="text-sm text-muted-foreground">By: {videoInfo.author} &bull; Duration: {formatDuration(videoInfo.duration)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="video-quality-select">Video Quality</Label>
                    <Select value={selectedVideoItag} onValueChange={setSelectedVideoItag} name="video-quality-select">
                      <SelectTrigger className="h-11" id="video-quality-select" disabled={videoInfo.videoFormats.length === 0}>
                        <SelectValue placeholder="Select video quality" />
                      </SelectTrigger>
                      <SelectContent>
                        {videoInfo.videoFormats.map((format) => (
                          <SelectItem key={format.itag} value={format.itag.toString()}>
                            {format.qualityLabel} ({format.container}{format.fps ? `, ${format.fps}fps` : ''})
                          </SelectItem>
                        ))}
                        {videoInfo.videoFormats.length === 0 && <SelectItem value="disabled" disabled>No video formats available</SelectItem>}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handleDownload('video')} disabled={isDownloadingVideo || !selectedVideoItag || videoInfo.videoFormats.length === 0} className="w-full h-11">
                      {isDownloadingVideo ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloudIcon className="mr-2 h-5 w-5" />}
                      Download Video
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audio-quality-select">Audio Quality</Label>
                    <Select value={selectedAudioItag} onValueChange={setSelectedAudioItag} name="audio-quality-select" disabled={videoInfo.audioFormats.length === 0}>
                      <SelectTrigger className="h-11" id="audio-quality-select">
                        <SelectValue placeholder="Select audio quality" />
                      </SelectTrigger>
                      <SelectContent>
                        {videoInfo.audioFormats.map((format) => (
                          <SelectItem key={format.itag} value={format.itag.toString()}>
                            {format.quality} ({format.container})
                          </SelectItem>
                        ))}
                        {videoInfo.audioFormats.length === 0 && <SelectItem value="disabled" disabled>No audio formats available</SelectItem>}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handleDownload('audio')} disabled={isDownloadingAudio || !selectedAudioItag || videoInfo.audioFormats.length === 0} className="w-full h-11">
                      {isDownloadingAudio ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloudIcon className="mr-2 h-5 w-5" />}
                      Download Audio
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
      <style jsx global>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
