// src/app/[locale]/(main)/downloads/page.tsx
"use client";

import React, { useEffect } from 'react'; // Removed useState, useCallback, use as they are not used here
import { useDownload } from '@/contexts/DownloadContext';
import { DownloadTask } from '@/types/download';
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
// Removed Table components as Card-based layout is used
// import { getDictionary } from '@/lib/getDictionary'; // Not using for this basic version
// import { Loader2Icon } from 'lucide-react'; // Not using for this basic version

// For a real app, you'd likely pass the locale to getDictionary
// interface DownloadsPageProps {
//   params: { locale: string };
// }

// Ensure this matches the actual directory structure for locale, if used
export default function DownloadsPage(/*{ params: { locale } }: { params: { locale: string } }*/) {
  const { activeTasks, _simulateProgress, refreshTaskStatus } = useDownload();
  // const dictionary = await getDictionary(locale); // If using i18n texts

  // Optional: If you want to show a loading state while dictionary loads, or initial tasks
  // if (!activeTasks) { // Or a dedicated loading state from context
  //   return <div className="flex justify-center items-center h-screen"><Loader2Icon className="h-12 w-12 animate-spin text-primary" /></div>;
  // }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-4 tracking-tight">Active Downloads</h1>

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
                    task.status === 'completed' ? 'default' : // Using 'default' for green-like completion
                    task.status === 'error' ? 'destructive' :
                    task.status === 'paused' ? 'secondary' :
                    'outline' // For 'queued', 'initializing', 'downloading'
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
              <CardFooter className="flex justify-end gap-2 pt-3 border-t bg-slate-50/50 dark:bg-slate-800/20 p-3">
                {task.status === 'downloading' && (
                  <Button variant="outline" size="xs" onClick={() => _simulateProgress(task.id)}>
                    Simulate Progress
                  </Button>
                )}
                <Button variant="ghost" size="xs" onClick={() => refreshTaskStatus(task.id)}>
                  Refresh
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
