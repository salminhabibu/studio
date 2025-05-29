"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added for future use
import { useToast } from "@/components/ui/use-toast";

interface DownloadOptions {
  format: "video" | "audio";
  qualityItag?: string; // Store itag for download
}

interface QualityOption {
  itag: string;
  qualityLabel: string;
  container?: string;
}

// Simplified VideoInfo structure based on /api/youtube/info structure
interface VideoInfoFromApi {
  videoDetails?: {
    title?: string;
    thumbnail?: { thumbnails: Array<{ url: string; width: number; height: number }> };
  };
  formats?: {
    video: Array<{ itag: number; qualityLabel: string; mimeType?: string; container?: string }>;
    audio: Array<{ itag: number; mimeType?: string; audioBitrate?: number; container?: string }>;
  };
}


export function YouTubeDownloader() {
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [downloadOptions, setDownloadOptions] = useState<DownloadOptions>({ format: "video" });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState<boolean>(false);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [availableQualities, setAvailableQualities] = useState<QualityOption[]>([]);

  const { toast } = useToast();

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeUrl(event.target.value);
    setAvailableQualities([]);
    setVideoTitle(null);
    if (downloadOptions.qualityItag) {
      setDownloadOptions(prev => ({...prev, qualityItag: undefined}));
    }
  };

  const handleFormatChange = (value: "video" | "audio") => {
    setDownloadOptions({ format: value, qualityItag: undefined }); 
    if (value === "audio") {
      setAvailableQualities([]); 
    }
  };

  const handleQualityChange = (itag: string) => {
    setDownloadOptions({ ...downloadOptions, qualityItag: itag });
  };

  const isValidYoutubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(url);
  };

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(url);
  };

  useEffect(() => {
    const fetchVideoInfo = async () => {
      if (!isValidYoutubeUrl(youtubeUrl)) {
        setAvailableQualities([]);
        setVideoTitle(null);
        return;
      }
      // Only fetch for video format, or if you decide to allow specific audio itag selection later
      if (downloadOptions.format === "video") {
        setIsLoadingInfo(true);
        setAvailableQualities([]);
        try {
          const response = await fetch(`/api/youtube/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: youtubeUrl }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
            throw new Error(errorData.error || `Failed to fetch video info (${response.status})`);
          }
          
          const data: VideoInfoFromApi = await response.json();

          if (data.videoDetails?.title) {
            setVideoTitle(data.videoDetails.title);
          } else {
            setVideoTitle("YouTube Video"); // Default title
          }

          if (data.formats && data.formats.video) {
            const videoQualities: QualityOption[] = data.formats.video
              .filter(f => f.qualityLabel && f.itag) // Ensure qualityLabel and itag exist
              .map(f => ({
                itag: f.itag.toString(),
                qualityLabel: f.qualityLabel,
                container: f.container || f.mimeType?.split('/')[1]?.split(';')[0] || 'mp4', // Extract container
              }))
              .filter((q, index, self) => self.findIndex(s => s.qualityLabel === q.qualityLabel) === index); // Unique by qualityLabel

            setAvailableQualities(videoQualities);
            if (videoQualities.length > 0 && !downloadOptions.qualityItag) {
              // Set a default quality (e.g., the first one) if none is selected
              // setDownloadOptions(prev => ({...prev, qualityItag: videoQualities[0].itag}));
            } else if (videoQualities.length === 0) {
               toast({
                title: "No Video Formats",
                description: "No downloadable video formats found for this URL.",
                variant: "default",
              });
            }
          } else {
            setAvailableQualities([]);
            toast({
              title: "No Video Formats",
              description: "No video format information found.",
              variant: "default",
            });
          }
        } catch (err) {
          const fetchError = err instanceof Error ? err.message : "An unknown error occurred.";
          toast({
            title: "Could not fetch video info",
            description: fetchError,
            variant: "destructive",
          });
          setAvailableQualities([]);
          setVideoTitle(null);
        } finally {
          setIsLoadingInfo(false);
        }
      } else {
        // Clear qualities if format is not video
        setAvailableQualities([]);
        setVideoTitle(null);
      }
    };

    if (youtubeUrl) {
      fetchVideoInfo();
    } else {
      setAvailableQualities([]);
      setVideoTitle(null);
    }
  }, [youtubeUrl, downloadOptions.format, toast]); // Removed downloadOptions.qualityItag from deps to avoid loop

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidYoutubeUrl(youtubeUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL.",
        variant: "destructive",
      });
      return;
    }

    if (downloadOptions.format === "video" && !downloadOptions.qualityItag && availableQualities.length > 0) {
      toast({
        title: "Select Quality",
        description: "Please select a video quality to download.",
        variant: "info",
      });
      return;
    }

    setIsLoading(true);

    const endpoint = downloadOptions.format === "video" 
      ? "/api/youtube/download-video" 
      : "/api/youtube/download-audio";
    
    const body = {
      url: youtubeUrl,
      itag: downloadOptions.qualityItag, // Will be undefined for audio if no specific selection is made
      // Backend will pick best audio if itag is not present for audio type
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // Try to parse error a bit more gracefully
        let errorMessage = `Failed to start download (status: ${response.status})`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
            // If parsing JSON fails, use the response text if available
            const textError = await response.text();
            if (textError) errorMessage = textError;
        }
        setIsLoading(false);
        toast({
          title: "Download Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        
        let filename = videoTitle || "download"; // Use fetched title or default
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?(;|$)/);
        if (filenameMatch && filenameMatch[1]) {
            filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        } else {
          // Construct filename if not in header, using title and format
          const extension = downloadOptions.format === "video" ? (availableQualities.find(q => q.itag === downloadOptions.qualityItag)?.container || "mp4") : "mp3";
          filename = `${filename}.${extension}`;
        }
        
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
        setIsLoading(false);
        toast({
            title: "Download Started",
            description: `Your ${downloadOptions.format} '${filename}' has started downloading.`,
        });
      } else {
        setIsLoading(false);
        // Handle cases where the backend sends a JSON response (e.g., link or status)
        const data = await response.json().catch(() => null);
        if (data && data.message) {
            toast({
                title: "Info",
                description: data.message,
            });
        } else if (data && data.downloadUrl) {
            window.open(data.downloadUrl, '_blank');
             toast({
                title: "Download Ready",
                description: "Your download is ready and should open in a new tab.",
            });
        }
        else {
            toast({
                title: "Unexpected Response",
                description: "The server returned an unexpected response. Download may not have started.",
                variant: "warning",
            });
        }
      }

    } catch (err) {
      setIsLoading(false);
      const fetchError = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({
        title: "Network Error",
        description: `Failed to connect to the server: ${fetchError}`,
        variant: "destructive",
      });
    }
  };

  const currentLoadingState = isLoading ? "Downloading..." : (isLoadingInfo ? "Fetching Info..." : "Download");

  return (
    <Card className="w-full max-w-lg mx-auto my-8">
      <CardHeader>
        <CardTitle>YouTube Video Downloader</CardTitle>
        <CardDescription>
          {videoTitle ? `Downloading: ${videoTitle}` : "Enter a YouTube video URL to download."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="youtube-url">YouTube URL</Label>
            <Input
              id="youtube-url"
              placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              value={youtubeUrl}
              onChange={handleUrlChange}
              disabled={isLoading || isLoadingInfo}
              required
              aria-describedby="url-error"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Download Format</Label>
            <RadioGroup
              value={downloadOptions.format}
              onValueChange={handleFormatChange}
              className="flex pt-1 space-x-4"
              disabled={isLoading || isLoadingInfo}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="video" id="format-video" />
                <Label htmlFor="format-video" className="font-normal">Video</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="audio" id="format-audio" />
                <Label htmlFor="format-audio" className="font-normal">Audio</Label>
              </div>
            </RadioGroup>
          </div>

          {downloadOptions.format === "video" && (
            <div className="space-y-2">
              <Label htmlFor="video-quality">Video Quality</Label>
              <Select 
                value={downloadOptions.qualityItag} 
                onValueChange={handleQualityChange}
                disabled={isLoading || isLoadingInfo || availableQualities.length === 0}
              >
                <SelectTrigger id="video-quality" className="w-full">
                  <SelectValue placeholder={isLoadingInfo ? "Loading qualities..." : (availableQualities.length === 0 ? "No qualities available" : "Select quality")} />
                </SelectTrigger>
                <SelectContent>
                  {availableQualities.map((quality) => (
                    <SelectItem key={quality.itag} value={quality.itag}>
                      {quality.qualityLabel} ({quality.container?.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableQualities.length === 0 && !isLoadingInfo && youtubeUrl && isValidYoutubeUrl(youtubeUrl) && (
                 <p className="text-sm text-muted-foreground pt-1">
                   Could not find specific video quality options. The video might be unavailable or processing.
                 </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-3">
          <Button type="submit" className="w-full" disabled={isLoading || isLoadingInfo || !youtubeUrl || (downloadOptions.format === 'video' && availableQualities.length > 0 && !downloadOptions.qualityItag) }>
            {currentLoadingState}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
