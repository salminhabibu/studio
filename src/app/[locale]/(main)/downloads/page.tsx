// src/app/[locale]/(main)/downloads/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useDownload } from '@/contexts/DownloadContext';
import { DownloadTask } from '@/types/download';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PauseIcon,
  PlayIcon,
  XCircleIcon,
  Loader2Icon,
  DownloadCloudIcon, // Added for the new form
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Added for the new form
import { useToast } from '@/hooks/use-toast'; // Added for notifications
// import { getDictionary } from '@/lib/getDictionary'; // Localization can be added later

// Zod schema for the new download form
const directDownloadSchema = z.object({
  link: z.string().min(1, { message: "Link cannot be empty." })
    .regex(/^(magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32,}|(https?|ftp):\/\/[^\s/$.?#].[^\s]*)$/i, 
           { message: "Invalid magnet link or URL format." }),
  customTitle: z.string().optional(),
});

type DirectDownloadFormValues = z.infer<typeof directDownloadSchema>;

export default function DownloadsPage(/*{ params: { locale } }: { params: { locale: string } }*/) {
  const { activeTasks, _simulateProgress, refreshTaskStatus, pauseDownload, resumeDownload, cancelDownload } = useDownload();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const [isSubmittingDirectDownload, setIsSubmittingDirectDownload] = useState(false);
  // const dictionary = await getDictionary(locale); // Placeholder for localization

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DirectDownloadFormValues>({
    resolver: zodResolver(directDownloadSchema),
  });

  const onDirectDownloadSubmit: SubmitHandler<DirectDownloadFormValues> = async (data) => {
    setIsSubmittingDirectDownload(true);
    const payload = {
      title: data.customTitle || "Direct Download", // Default title if not provided
      type: "movie", // Placeholder type as per instructions
      source: data.link,
      metadata: {
        isDirectInput: true,
        originalUrl: data.link,
      },
      // destinationPath: `downloads/direct/` // Server can decide or use a default
    };

    try {
      const response = await fetch('/api/aria2/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (response.ok && (result.gid || result.taskId)) { // Aria2 uses 'gid'
        toast({
          title: "Download Started", // Placeholder text
          description: `Task "${payload.title}" added. GID: ${result.gid || result.taskId}`,
        });
        reset(); // Reset form fields
        // Optionally, trigger a refresh of active tasks if not automatically handled by context
        if (typeof refreshTaskStatus === 'function') { // Assuming DownloadContext might not have refreshTaskStatus for all tasks list
            // This might need a more global refresh mechanism if the context doesn't auto-update on new tasks from external sources
        }
      } else {
        toast({
          title: "Error Starting Download", // Placeholder text
          description: result.error || "Failed to start download on server.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting direct download:", error);
      toast({
        title: "API Error", // Placeholder text
        description: "Could not communicate with the download server.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDirectDownload(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8"> {/* Increased overall spacing */}
      
      {/* Add New Download Section */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Add New Download</CardTitle> {/* Placeholder text */}
          <CardDescription>Enter a magnet link or direct file URL to start a new download.</CardDescription> {/* Placeholder text */}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onDirectDownloadSubmit)} className="space-y-4">
            <div>
              <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Magnet Link or File URL {/* Placeholder text */}
              </label>
              <Input
                id="link"
                type="text"
                placeholder="magnet:?xt=urn:btih:..."
                {...register("link")}
                className={errors.link ? "border-red-500" : ""}
              />
              {errors.link && <p className="text-xs text-red-600 mt-1">{errors.link.message}</p>}
            </div>
            <div>
              <label htmlFor="customTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custom Title (Optional) {/* Placeholder text */}
              </label>
              <Input
                id="customTitle"
                type="text"
                placeholder="My Awesome Download"
                {...register("customTitle")}
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingDirectDownload}>
              {isSubmittingDirectDownload ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DownloadCloudIcon className="mr-2 h-4 w-4" />
              )}
              Start Download {/* Placeholder text */}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div> {/* Wrapper for Active Downloads heading and list/card */}
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4 tracking-tight">Active Downloads</h2> {/* Changed h1 to h2 for semantic structure */}

        {activeTasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-lg text-muted-foreground">No active downloads.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Downloads added via the API will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTasks.map((task: DownloadTask) => (
              <Card key={task.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardHeader>
                  <CardTitle className="truncate text-lg sm:text-xl" title={task.title}>
                    {task.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    ID: {task.id} | Type: <Badge variant="outline" className="text-xs px-1.5 py-0.5">{task.type}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 flex-grow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm">Status: <Badge variant={
                      task.status === 'completed' ? 'default' :
                      task.status === 'error' ? 'destructive' :
                      task.status === 'paused' ? 'secondary' :
                      'outline'
                    } className="capitalize text-xs px-1.5 py-0.5">{task.status}</Badge></span>
                    <span className="text-xs sm:text-sm font-medium">{task.progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={task.progress} className="w-full h-1.5 sm:h-2" />
                  
                  <div className="text-xs text-muted-foreground space-y-0.5 mt-2">
                    {task.fileSize !== null && typeof task.fileSize === 'number' && (
                      <p>Size: {(task.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                    )}
                    {task.downloadedSize > 0 && (
                       <p>Downloaded: {(task.downloadedSize / (1024 * 1024)).toFixed(2)} MB</p>
                    )}
                    {task.speed !== null && typeof task.speed === 'number' && task.status === 'downloading' && (
                      <p>Speed: {(task.speed / (1024)).toFixed(2)} KB/s</p>
                    )}
                    {task.eta !== null && typeof task.eta === 'number' && task.status === 'downloading' && task.eta > 0 && (
                      <p>ETA: {Math.round(task.eta)}s</p>
                    )}
                  </div>

                  {task.destinationPath && (
                    <p className="text-xs text-muted-foreground truncate pt-1" title={task.destinationPath}>
                      Path: {task.destinationPath}
                    </p>
                  )}
                  
                  {task.error && (
                    <div className="mt-2 p-1.5 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-700 font-semibold">Error:</p>
                      <p className="text-xs text-red-600 break-words">{task.error}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end flex-wrap gap-2 pt-3 border-t bg-slate-50/50 dark:bg-slate-800/20 p-3">
                  {task.status === 'downloading' && (
                    <Button variant="outline" size="xs" onClick={async () => {
                      setLoadingStates(prev => ({ ...prev, [`pause-${task.id}`]: true }));
                      await pauseDownload(task.id);
                      setLoadingStates(prev => ({ ...prev, [`pause-${task.id}`]: false }));
                    }} disabled={loadingStates[`pause-${task.id}`]}>
                      {loadingStates[`pause-${task.id}`] ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <PauseIcon className="h-3 w-3" />}
                      <span className="ml-1">Pause</span>
                    </Button>
                  )}
                  {task.status === 'paused' && (
                    <Button variant="outline" size="xs" onClick={async () => {
                      setLoadingStates(prev => ({ ...prev, [`resume-${task.id}`]: true }));
                      await resumeDownload(task.id);
                      setLoadingStates(prev => ({ ...prev, [`resume-${task.id}`]: false }));
                    }} disabled={loadingStates[`resume-${task.id}`]}>
                      {loadingStates[`resume-${task.id}`] ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <PlayIcon className="h-3 w-3" />}
                      <span className="ml-1">Resume</span>
                    </Button>
                  )}
                  {['downloading', 'paused', 'waiting', 'error'].includes(task.status) && (
                    <Button variant="destructive" size="xs" onClick={async () => {
                      setLoadingStates(prev => ({ ...prev, [`cancel-${task.id}`]: true }));
                      await cancelDownload(task.id);
                      // No need to setLoading false here if task is removed from list by cancelDownload
                    }} disabled={loadingStates[`cancel-${task.id}`]}>
                      {loadingStates[`cancel-${task.id}`] ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <XCircleIcon className="h-3 w-3" />}
                      <span className="ml-1">Cancel</span>
                    </Button>
                  )}
                  {task.status === 'downloading' && ( // Simulate Progress button (can be removed)
                    <Button variant="outline" size="xs" onClick={() => _simulateProgress(task.id)} className="hidden sm:flex">
                      Simulate Progress
                    </Button>
                  )}
                  <Button variant="ghost" size="xs" onClick={() => refreshTaskStatus(task.id)} disabled={Object.values(loadingStates).some(s => s)}>
                    Refresh
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
