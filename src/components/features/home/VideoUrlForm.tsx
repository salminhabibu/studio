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
import { useState } from "react";
import { handleVideoUrlValidation } from "@/lib/actions/video.actions";
import { Loader2, CheckCircle, XCircle, YoutubeIcon, DownloadCloudIcon } from "lucide-react";

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

export function VideoUrlForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VideoUrlFormValues>({
    resolver: zodResolver(videoUrlFormSchema),
    defaultValues: {
      url: "",
    },
  });

  async function onSubmit(data: VideoUrlFormValues) {
    setIsSubmitting(true);
    try {
      const result = await handleVideoUrlValidation(data);
      if (result.isValid) {
        toast({
          title: "YouTube URL Validated",
          description: `Ready to download: ${result.feedback}`,
          variant: "default",
          action: <CheckCircle className="text-green-500" />,
        });
        // Proceed with download logic or display options
        console.log("Video URL is valid and ready for download:", data.url);
      } else {
        toast({
          title: "Invalid YouTube URL",
          description: result.feedback,
          variant: "destructive",
          action: <XCircle className="text-white" />, 
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while validating the YouTube link. Please try again.",
        variant: "destructive",
      });
      console.error("Validation error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

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
                <div className="relative">
                   {/* LinkIcon changed to YoutubeIcon for better context */}
                  <Input 
                    placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ" 
                    {...field} 
                    className="h-12 text-base pl-10" 
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full h-12">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <>
              <DownloadCloudIcon className="mr-2 h-5 w-5" />
              Initiate Download
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
