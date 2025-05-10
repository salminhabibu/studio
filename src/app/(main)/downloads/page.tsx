// src/app/(main)/downloads/page.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    DownloadCloudIcon, PlayCircleIcon, PauseCircleIcon, XCircleIcon, 
    FolderOpenIcon, Trash2Icon, RefreshCwIcon, HistoryIcon, 
    ListChecksIcon, FileTextIcon, Loader2Icon, CheckCircle2Icon, AlertTriangleIcon, InfoIcon
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWebTorrent } from "@/contexts/WebTorrentContext";
import { TorrentProgress, HistoryItem, TorrentFile as WebTorrentTorrentFile } from "@/lib/webtorrent-service"; // Corrected import for TorrentFile type
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DownloadsPage() {
  const {
    torrents: activeDownloads,
    history: downloadHistory,
    removeTorrent,
    pauseTorrent,
    resumeTorrent,
    getTorrentInstance,
    getLargestFileForStreaming,
    clearDownloadHistory,
    removeDownloadFromHistory,
    addTorrent 
  } = useWebTorrent();
  const { toast } = useToast();

  const getStatusInfo = (status: TorrentProgress['status'] | HistoryItem['status']) => {
    switch (status) {
      case "downloading":
        return { badge: <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">Downloading</Badge> };
      case "paused":
        return { badge: <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">Paused</Badge> };
      case "completed":
      case "done":
      case "seeding":
        return { badge: <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Completed</Badge> };
      case "failed":
      case "error":
        return { badge: <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Failed</Badge> };
      case "connecting":
        return { badge: <Badge variant="outline" className="animate-pulse">Connecting...</Badge> };
      case "removed":
        return { badge: <Badge variant="outline">Removed</Badge> };
      case "active": 
         return { badge: <Badge variant="outline">In Queue</Badge> };
      default:
        return { badge: <Badge variant="outline">Unknown</Badge> };
    }
  };

  const handlePlay = async (torrentIdOrMagnet: string, isMagnet = false) => {
    toast({ title: "Preparing Stream", description: "Attempting to stream the largest file..." });
    let infoHash = torrentIdOrMagnet;
    
    if (isMagnet) {
        let torrent = getTorrentInstance(torrentIdOrMagnet);
        if (!torrent) {
            const newTorrent = await addTorrent(torrentIdOrMagnet, "Streaming item"); 
            if (!newTorrent || !newTorrent.infoHash) {
                toast({ title: "Stream Failed", description: "Could not start torrent for streaming.", variant: "destructive" });
                return;
            }
            infoHash = newTorrent.infoHash;
             // Wait a moment for metadata to be fetched if it's a new torrent
            await new Promise(resolve => setTimeout(resolve, 3000)); // Increased timeout slightly
        } else {
          infoHash = torrent.infoHash;
        }
    }
    // Ensure torrent is ready by re-fetching after potential add.
    const torrentInstance = getTorrentInstance(infoHash);
    if (!torrentInstance || !torrentInstance.ready) {
      toast({ title: "Stream Preparation", description: "Waiting for torrent metadata...", variant: "default" });
      await new Promise(resolve => {
        const checkReady = setInterval(() => {
          const updatedTorrent = getTorrentInstance(infoHash);
          if (updatedTorrent && updatedTorrent.ready) {
            clearInterval(checkReady);
            resolve(true);
          }
        }, 1000);
        setTimeout(() => { // Timeout for waiting
          clearInterval(checkReady);
          resolve(false);
        }, 15000); // Wait up to 15 seconds
      });
    }


    const streamData = await getLargestFileForStreaming(infoHash);
    if (streamData && streamData.streamUrl) {
      console.log("[DownloadsPage] Stream URL:", streamData.streamUrl);
      toast({ title: "Streaming Ready", description: `Opening player for ${streamData.file.name}.` });
      window.open(streamData.streamUrl, '_blank');
    } else {
      toast({ title: "Stream Failed", description: "Could not prepare the file for streaming. Ensure torrent has files and is active.", variant: "destructive" });
    }
  };
  
  const handleRetryDownload = async (item: HistoryItem) => {
    if (item.magnetURI) {
      try {
        const torrent = await addTorrent(item.magnetURI, item.name, item.itemId);
        if (torrent) {
          toast({ title: "Retrying Download", description: `Adding ${item.name} back to active queue.`});
        } else {
          toast({ title: "Retry Issue", description: `Could not add ${item.name}. It might already be active or an error occurred.`, variant: "default"});
        }
      } catch (error) {
        console.error("[DownloadsPage] Error retrying download:", error);
        toast({ title: "Retry Error", description: "An unexpected error occurred.", variant: "destructive"});
      }
    } else {
      toast({ title: "Retry Failed", description: "Magnet URI not found for this item.", variant: "destructive"});
    }
  };

  const handleRemoveTorrent = async (torrentId: string) => {
    try {
      await removeTorrent(torrentId);
      toast({title: "Torrent Removed", description: "The torrent has been removed from the active queue and history (if applicable)."});
    } catch (error) {
      console.error("[DownloadsPage] Error removing torrent:", error);
      toast({title: "Removal Error", description: "Could not remove the torrent.", variant: "destructive"});
    }
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Downloads</h1>
          <p className="text-muted-foreground mt-1">Manage your active and completed downloads.</p>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-x-1.5 rounded-lg p-1.5 bg-muted h-12 text-base">
          <TabsTrigger value="active" className="h-full">Active Downloads</TabsTrigger>
          <TabsTrigger value="history" className="h-full">Download History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader><CardTitle>Active Queue</CardTitle></CardHeader>
            <CardContent className="p-0">
              {activeDownloads.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {activeDownloads.map((download) => {
                    const { badge: statusBadge } = getStatusInfo(download.status);
                    const torrentInstance = getTorrentInstance(download.torrentId);
                    return (
                      <div key={download.torrentId} className="p-4 md:p-6 hover:bg-muted/30">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-grow min-w-0">
                            <h3 className="font-semibold text-md md:text-lg truncate mb-1" title={download.customName || download.torrentId}>{download.customName || 'Fetching name...'}</h3>
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs md:text-sm text-muted-foreground">
                              {statusBadge}
                              <span>&bull;</span>
                              <span>{formatBytes(download.downloaded)} / {download.length ? formatBytes(download.length) : 'N/A'}</span>
                              {(download.status === 'downloading' || download.status === 'connecting') && download.downloadSpeed > 0 && (
                                <><span className="hidden sm:inline">&bull;</span><span>{formatBytes(download.downloadSpeed)}/s</span></>
                              )}
                              {download.status === 'downloading' && download.remainingTime !== undefined && Number.isFinite(download.remainingTime) && download.remainingTime > 0 && (
                                <><span className="hidden sm:inline">&bull;</span><span>ETA: {new Date(download.remainingTime).toISOString().substr(11, 8)}</span></>
                              )}
                              <span className="hidden sm:inline">&bull;</span><span>Peers: {download.peers}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
                            {(download.status === 'downloading' || download.status === 'connecting') && (
                              <Button variant="ghost" size="icon" aria-label="Pause" onClick={() => pauseTorrent(download.torrentId)}><PauseCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {download.status === 'paused' && (
                              <Button variant="ghost" size="icon" aria-label="Resume" onClick={() => resumeTorrent(download.torrentId)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {(download.status === 'done' || download.status === 'seeding' || (torrentInstance && torrentInstance.files.length > 0 && torrentInstance.ready)) && (
                              <Button variant="ghost" size="icon" aria-label="Play/Stream" onClick={() => handlePlay(download.torrentId)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" aria-label="Remove" onClick={() => handleRemoveTorrent(download.torrentId)}><XCircleIcon className="h-5 w-5" /></Button>
                          </div>
                        </div>
                        <Progress value={download.progress * 100} className="mt-3 h-1.5 md:h-2" indicatorClassName={download.status === 'paused' ? 'bg-yellow-500' : download.status === 'error' ? 'bg-red-500' : (download.status === 'done' || download.status === 'seeding' ) ? 'bg-green-500' : 'bg-primary'} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <DownloadCloudIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">Active Downloads Queue is Empty</h3>
                  <Button variant="outline" className="mt-4" asChild><Link href="/home">Find Something to Download</Link></Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Download History</CardTitle>
                {downloadHistory.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm"><Trash2Icon className="mr-2 h-4 w-4"/> Clear All History</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete your entire download history. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={clearDownloadHistory}>Confirm Clear</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardHeader>
            <CardContent className="p-0">
              {downloadHistory.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {downloadHistory.map(item => {
                    const { badge: statusBadge } = getStatusInfo(item.status);
                    return (
                      <div key={item.infoHash} className={`p-4 md:p-6 hover:bg-muted/30 ${item.status === 'failed' ? 'opacity-70' : ''}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-grow min-w-0">
                            <h3 className="font-semibold text-md md:text-lg truncate mb-1" title={item.name}>{item.name}</h3>
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs md:text-sm text-muted-foreground">
                              {statusBadge}
                              <span>&bull;</span>
                              <span>Added: {new Date(item.addedDate).toLocaleDateString()}</span>
                              {item.completedDate && <><span className="hidden sm:inline">&bull;</span><span>Finished: {new Date(item.completedDate).toLocaleDateString()}</span></>}
                              {item.size && <><span className="hidden sm:inline">&bull;</span><span>Size: {formatBytes(item.size)}</span></>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
                            {item.status === 'completed' && item.magnetURI && (
                                <Button variant="ghost" size="icon" title="Stream/Play again" onClick={() => handlePlay(item.magnetURI, true)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {item.status === 'failed' && item.magnetURI && (
                              <Button variant="ghost" size="icon" title="Retry Download" onClick={() => handleRetryDownload(item)}><RefreshCwIcon className="h-5 w-5" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" title="Remove from History" onClick={() => removeDownloadFromHistory(item.infoHash)}><Trash2Icon className="h-5 w-5" /></Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <HistoryIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">No Download History</h3>
                  <p className="text-muted-foreground mt-1">Completed or failed downloads will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
