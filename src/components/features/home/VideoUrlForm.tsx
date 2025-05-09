// src/components/features/home/VideoUrlForm.tsx
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
import { useState, useEffect, useCallback } from "react";
import { handleVideoUrlValidation } from "@/lib/actions/video.actions";
import { Loader2, CheckCircle, XCircle, YoutubeIcon, DownloadCloudIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

const videoUrlFormSchema = z.object({
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

type VideoUrlFormValues = z.infer<typeof videoUrlFormSchema>;

// Helper function to extract YouTube video ID
function getYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Standard watch URLs
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v');
    }
    // Shortened URLs
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.substring(1).split('?')[0]; // Remove query params like ?si=...
    }
    // Shorts URLs
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/shorts/')) {
        const parts = urlObj.pathname.split('/shorts/');
        if (parts[1]) return parts[1].split('?')[0];
    }
    // Embed URLs
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
        const parts = urlObj.pathname.split('/embed/');
        if (parts[1]) return parts[1].split('?')[0];
    }
    return null;
  } catch (e) {
    // console.error("Error parsing YouTube URL:", e); // Can be noisy during typing
    return null;
  }
}

export function VideoUrlForm() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false); // For any async operation
  const [videoId, setVideoId] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("1080p");
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>("video");

  const form = useForm<VideoUrlFormValues>({
    resolver: zodResolver(videoUrlFormSchema),
    defaultValues: { url: "" },
    mode: "onBlur", // Validate URL field onBlur initially
  });

  const currentUrl = form.watch("url");
  const debouncedUrl = useDebounce(currentUrl, 750); // Debounce for live preview logic

  const processUrlForPreview = useCallback(async (urlToProcess: string) => {
    if (!urlToProcess.trim()) {
      setVideoId(null);
      return;
    }
    
    const parsedSchema = videoUrlFormSchema.safeParse({ url: urlToProcess });
    if (!parsedSchema.success) {
        if (videoId) setVideoId(null); // Clear preview if URL becomes invalid during typing
        return;
    }

    setIsProcessing(true);
    // No need to clear videoId here, getYouTubeVideoId will return null if not valid,
    // and then setVideoId(null) will be called.

    try {
      const extractedVideoId = getYouTubeVideoId(urlToProcess);
      setVideoId(extractedVideoId); // This will show preview if ID found, or clear it if null
                                    // No AI validation for instant preview for better UX
    } catch (error) {
      console.error("Error processing URL for preview:", error);
      setVideoId(null); // Clear on error
    } finally {
      setIsProcessing(false);
    }
  }, [videoId]); // videoId in deps to allow clearing it

  useEffect(() => {
    processUrlForPreview(debouncedUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUrl]); // processUrlForPreview is memoized, direct inclusion in deps is fine


  async function onSubmit(data: VideoUrlFormValues) {
    if (!videoId) {
      // Attempt to process URL one last time on submit if no videoId yet (e.g., if debounce didn't catch it or user was too fast)
      setIsProcessing(true);
      const extractedId = getYouTubeVideoId(data.url);
      setIsProcessing(false);
      if (!extractedId) {
        toast({
            title: "Invalid YouTube URL",
            description: "Please enter a valid YouTube URL to load a video.",
            variant: "destructive",
            action: <XCircle className="text-white" />,
        });
        setVideoId(null);
        return;
      }
      // If ID extracted here, it means preview might not have shown yet
      // We could setVideoId(extractedId) here, but it might be better to ensure preview is shown first.
      // For now, if we reach here without a videoId from preview logic, it implies an issue.
      // The button's disabled state should ideally prevent this.
      // This block primarily handles the case where the button was somehow enabled without a videoId.
       toast({
        title: "No Video Loaded",
        description: "Please ensure the YouTube video preview is showing before downloading.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
        // Perform full AI validation on submit
        const validationResult = await handleVideoUrlValidation({ url: data.url });
        if (!validationResult.isValid || getYouTubeVideoId(data.url) !== videoId) {
             setVideoId(null);
             form.setValue("url", data.url, { shouldValidate: true }); // Re-validate to show error if needed
             toast({
                title: "URL Validation Failed",
                description: validationResult.feedback || "The video URL is invalid or does not match the preview.",
                variant: "destructive",
                action: <XCircle className="text-white" />,
             });
             setIsProcessing(false);
             return;
        }

        console.log("Attempting to download:", {
            url: data.url,
            quality: selectedQuality,
            type: downloadType,
            videoId: videoId,
            title: validationResult.feedback // Assuming feedback might contain title or info
        });
        toast({
            title: "Download Initiated (Mock)",
            description: `Preparing ${downloadType} of "${validationResult.feedback || 'video'}" in ${selectedQuality}.`,
            variant: "default",
            action: <CheckCircle className="text-green-500" />,
        });
    } catch (error) {
        toast({
          title: "Download Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
    } finally {
        setIsProcessing(false);
    }
  }
  
  const qualityOptions = ["1080p", "720p", "480p", "360p"];
  const downloadTypeOptions = [
    { label: "Video", value: "video" as const },
    { label: "Audio Only", value: "audio" as const },
  ];

  const isSubmitDisabled = isProcessing || !form.formState.isValid || (!!currentUrl && !videoId);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base flex items-center">
                <YoutubeIcon className="h-5 w-5 mr-2 text-red-500" />
                YouTube Video Link
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  {...field}
                  className="h-12 text-base"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isProcessing && !videoId && currentUrl.length > 0 && (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading video preview...
          </div>
        )}

        {videoId && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted shadow-inner">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                key={videoId} 
              ></iframe>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel htmlFor="quality-select">Quality</FormLabel>
                <Select value={selectedQuality} onValueChange={setSelectedQuality} name="quality-select">
                  <SelectTrigger className="h-11" id="quality-select">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {qualityOptions.map((quality) => (
                      <SelectItem key={quality} value={quality}>
                        {quality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="type-select">Download Type</FormLabel>
                <Select value={downloadType} onValueChange={(value) => setDownloadType(value as 'video' | 'audio')} name="type-select">
                  <SelectTrigger className="h-11" id="type-select">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {downloadTypeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            </div>
          </div>
        )}

        <Button 
            type="submit" 
            disabled={isSubmitDisabled}
            size="lg" 
            className="w-full h-12"
        >
          {isProcessing && videoId ? ( // Show processing only if it's for download, not preview
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <>
              <DownloadCloudIcon className="mr-2 h-5 w-5" />
              Download {downloadType === 'audio' ? 'Audio' : 'Video'}
            </>
          )}
        </Button>
      </form>
      <style jsx global>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Form>
  );
}
