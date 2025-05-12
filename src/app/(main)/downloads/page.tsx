// src/app/(main)/downloads/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    DownloadCloudIcon, PlayCircleIcon, PauseCircleIcon, XCircleIcon, 
    FolderOpenIcon, Trash2Icon, RefreshCwIcon, HistoryIcon, 
    ListChecksIcon, FileTextIcon, Loader2Icon, CheckCircle2Icon, 
    AlertTriangleIcon, InfoIcon, ServerIcon, WifiOffIcon, PowerOffIcon
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWebTorrent } from "@/contexts/WebTorrentContext";
import type { TorrentProgress, HistoryItem, TorrentFile as WebTorrentTorrentFile, TorrentProgressStatus } from "@/lib/webtorrent-service";
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
import type { ConceptualAria2Task, Aria2DownloadItemDisplay } from "@/types/download";

const ARIA2_TASKS_STORAGE_KEY = 'chillymovies-aria2-tasks';


export default function DownloadsPage() {
  const {
    torrents: activeWebTorrents,
    history: webTorrentHistory,
    removeTorrent,
    pauseTorrent,
    resumeTorrent,
    getTorrentInstance,
    getLargestFileForStreaming,
    clearDownloadHistory,
    removeDownloadFromHistory,
    addTorrent: addWebTorrent,
    isClientReady
  } = useWebTorrent();
  const { toast } = useToast();

  const [conceptualAria2TasksStore, setConceptualAria2TasksStore] = useState<ConceptualAria2Task[]>([]);
  const [displayedAria2Downloads, setDisplayedAria2Downloads] = useState<Aria2DownloadItemDisplay[]>([]);
  const [isLoadingAria2, setIsLoadingAria2] = useState(false);

  const loadConceptualTasksFromStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedTasksString = localStorage.getItem(ARIA2_TASKS_STORAGE_KEY);
      const storedTasks: ConceptualAria2Task[] = storedTasksString ? JSON.parse(storedTasksString) : [];
      setConceptualAria2TasksStore(storedTasks);
      console.log("[DownloadsPage] Loaded conceptual Aria2 tasks from storage:", storedTasks.length);
      // Initialize displayedAria2Downloads based on stored tasks
      setDisplayedAria2Downloads(storedTasks.map(task => ({
        taskId: task.taskId,
        name: task.name,
        status: 'connecting', 
        progress: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        totalLength: 0, 
        completedLength: 0, 
        quality: task.quality,
        addedTime: task.addedTime,
      })));
    }
  }, []);

  useEffect(() => {
    loadConceptualTasksFromStorage();
  }, [loadConceptualTasksFromStorage]);

  useEffect(() => {
    const fetchAria2Statuses = async () => {
      if (conceptualAria2TasksStore.length === 0) {
        if(displayedAria2Downloads.length > 0) setDisplayedAria2Downloads([]);
        return;
      }
      
      // console.log("[DownloadsPage] Polling Aria2 statuses for", conceptualAria2TasksStore.length, "tasks.");
      setIsLoadingAria2(true); // Potentially set this only if it's the first poll or few items
      const newDisplayedDownloads: Aria2DownloadItemDisplay[] = [...displayedAria2Downloads]; // Work on a copy

      let madeChanges = false;

      for (const conceptualTask of conceptualAria2TasksStore) {
        try {
          const response = await fetch(`/api/aria2/status/${conceptualTask.taskId}`);
          if (response.ok) {
            const statusData = await response.json();
            const existingIndex = newDisplayedDownloads.findIndex(d => d.taskId === conceptualTask.taskId);
            
            const displayItem: Aria2DownloadItemDisplay = {
              taskId: conceptualTask.taskId,
              name: statusData.bitTorrent?.info?.name || conceptualTask.name,
              status: statusData.status,
              progress: (parseInt(statusData.completedLength) / parseInt(statusData.totalLength)) * 100 || 0,
              downloadSpeed: parseInt(statusData.downloadSpeed) || 0,
              uploadSpeed: parseInt(statusData.uploadSpeed) || 0,
              totalLength: parseInt(statusData.totalLength) || 0,
              completedLength: parseInt(statusData.completedLength) || 0,
              connections: parseInt(statusData.connections) || 0,
              downloadUrl: statusData.status === 'complete' ? `/api/aria2/file/${conceptualTask.taskId}/${encodeURIComponent(statusData.bitTorrent?.info?.name || conceptualTask.name)}.txt` : undefined,
              errorCode: statusData.errorCode,
              errorMessage: statusData.errorMessage,
              quality: conceptualTask.quality,
              addedTime: conceptualTask.addedTime,
            };

            if (existingIndex > -1) {
              if (JSON.stringify(newDisplayedDownloads[existingIndex]) !== JSON.stringify(displayItem)) {
                newDisplayedDownloads[existingIndex] = displayItem;
                madeChanges = true;
              }
            } else {
              newDisplayedDownloads.push(displayItem);
              madeChanges = true;
            }
          } else {
            console.warn(`[DownloadsPage] Failed to fetch status for Aria2 task ${conceptualTask.taskId}, status: ${response.status}`);
             const existingIndex = newDisplayedDownloads.findIndex(d => d.taskId === conceptualTask.taskId);
             if (existingIndex > -1 && newDisplayedDownloads[existingIndex].status !== 'error') {
                newDisplayedDownloads[existingIndex].status = 'error';
                newDisplayedDownloads[existingIndex].errorMessage = `Failed to poll (status ${response.status})`;
                madeChanges = true;
             } else if (existingIndex === -1) {
                 newDisplayedDownloads.push({
                    taskId: conceptualTask.taskId, name: conceptualTask.name, status: 'error', progress: 0,downloadSpeed: 0, uploadSpeed: 0,errorMessage: `Failed to poll (status ${response.status})`, quality: conceptualTask.quality, addedTime: conceptualTask.addedTime,
                });
                madeChanges = true;
             }
          }
        } catch (error) {
          console.error(`[DownloadsPage] Network error fetching Aria2 status for ${conceptualTask.taskId}:`, error);
           const existingIndex = newDisplayedDownloads.findIndex(d => d.taskId === conceptualTask.taskId);
           if (existingIndex > -1 && newDisplayedDownloads[existingIndex].status !== 'error') {
              newDisplayedDownloads[existingIndex].status = 'error';
              newDisplayedDownloads[existingIndex].errorMessage = "Polling network error";
              madeChanges = true;
           } else if (existingIndex === -1) {
              newDisplayedDownloads.push({
                taskId: conceptualTask.taskId, name: conceptualTask.name, status: 'error', progress: 0, downloadSpeed: 0, uploadSpeed: 0, errorMessage: "Polling network error", quality: conceptualTask.quality, addedTime: conceptualTask.addedTime,
              });
              madeChanges = true;
           }
        }
      }
      if (madeChanges) {
        setDisplayedAria2Downloads(newDisplayedDownloads.sort((a,b) => (b.addedTime || 0) - (a.addedTime || 0) ));
      }
      setIsLoadingAria2(false);
    };

    if (conceptualAria2TasksStore.length > 0) {
        fetchAria2Statuses(); 
        const interval = setInterval(fetchAria2Statuses, 5000); // Poll every 5s
        return () => clearInterval(interval);
    } else {
        if (displayedAria2Downloads.length > 0) setDisplayedAria2Downloads([]); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptualAria2TasksStore]); 

  const getStatusInfo = (status: TorrentProgressStatus | HistoryItem['status'] | Aria2DownloadItemDisplay['status'], noPeersReason?: string) => {
    switch (status) {
      case "downloading":
      case "active": 
        return { badge: <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">Downloading</Badge>, icon: <Loader2Icon className="h-4 w-4 text-blue-400 animate-spin" /> };
      case "paused":
        return { badge: <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">Paused</Badge>, icon: <PauseCircleIcon className="h-4 w-4 text-yellow-400" /> };
      case "completed":
      case "done":
      case "seeding": 
      case "complete": 
        return { badge: <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Completed</Badge>, icon: <CheckCircle2Icon className="h-4 w-4 text-green-400" /> };
      case "failed":
      case "error":
        return { badge: <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Failed</Badge>, icon: <AlertTriangleIcon className="h-4 w-4 text-red-400" /> };
      case "connecting":
      case "metadata":
      case "waiting": 
        return { badge: <Badge variant="outline" className="animate-pulse">Connecting...</Badge>, icon: <Loader2Icon className="h-4 w-4 text-muted-foreground animate-spin" /> };
      case "stalled":
        return { badge: <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30">Stalled</Badge>, icon: <PowerOffIcon className="h-4 w-4 text-orange-400" /> };
      case "no_peers":
        return { badge: <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30" title={noPeersReason}>No Peers</Badge>, icon: <WifiOffIcon className="h-4 w-4 text-gray-400" /> };
      case "removed":
        return { badge: <Badge variant="outline">Removed</Badge>, icon: <Trash2Icon className="h-4 w-4 text-muted-foreground" /> };
      default:
        return { badge: <Badge variant="outline">Unknown ({status})</Badge>, icon: <InfoIcon className="h-4 w-4 text-muted-foreground" /> };
    }
  };

  const handlePlayWebTorrent = async (torrentIdOrMagnet: string, isMagnet = false) => {
    toast({ title: "Preparing Stream", description: "Attempting to stream the largest file..." });
    let infoHash = torrentIdOrMagnet;
    
    if (isMagnet) {
        let torrent = getTorrentInstance(torrentIdOrMagnet); 
        if (!torrent) { 
            const allActive = activeWebTorrents.find(t => t.torrentId === torrentIdOrMagnet || t.torrentId.startsWith(torrentIdOrMagnet.substring(0,20))); // check magnet too
            if (allActive) torrent = getTorrentInstance(allActive.torrentId);
        }

        if (!torrent) { 
            console.log(`[DownloadsPage] Torrent for magnet ${torrentIdOrMagnet.substring(0,20)}... not active, attempting to re-add for streaming.`);
            const newTorrent = await addWebTorrent(torrentIdOrMagnet, "Streaming item (from history)"); 
            if (!newTorrent || !newTorrent.infoHash) {
                toast({ title: "Stream Failed", description: "Could not start torrent for streaming. Ensure it's a valid magnet with seeders.", variant: "destructive" });
                return;
            }
            infoHash = newTorrent.infoHash;
        } else {
          infoHash = torrent.infoHash;
        }
    }
    
    let attempt = 0;
    const maxAttempts = 30; // Wait up to 30 seconds
    while(attempt < maxAttempts) { 
        const currentTorrentInstance = getTorrentInstance(infoHash);
        if (currentTorrentInstance && currentTorrentInstance.ready && currentTorrentInstance.files.length > 0) break;
        console.log(`[DownloadsPage] Waiting for torrent ${infoHash.substring(0,8)} to be ready... Attempt ${attempt+1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempt++;
    }

    const streamData = await getLargestFileForStreaming(infoHash);
    if (streamData && streamData.streamUrl) {
      console.log("[DownloadsPage] Stream URL for WebTorrent:", streamData.streamUrl);
      toast({ title: "Streaming Ready", description: `Opening player for ${streamData.file.name}.` });
      window.open(streamData.streamUrl, '_blank');
    } else {
      toast({ title: "Stream Failed", description: "Could not prepare the file for streaming. Ensure torrent has files, is active, and has seeders.", variant: "destructive" });
    }
  };
  
  const handleRetryWebTorrentDownload = async (item: HistoryItem) => {
    if (item.magnetURI) {
      try {
        console.log(`[DownloadsPage] Retrying WebTorrent download for: ${item.name}, Magnet: ${item.magnetURI.substring(0,30)}...`);
        const torrent = await addWebTorrent(item.magnetURI, item.name, item.itemId);
        if (torrent) {
          toast({ title: "Retrying Download", description: `Adding ${item.name} back to WebTorrent queue.`});
          removeDownloadFromHistory(item.infoHash); // Remove from history to avoid duplicates if it becomes active
        } else {
          // This case might mean it was already active or another issue.
          toast({ title: "Retry Not Needed/Issue", description: `${item.name} might already be active or an error occurred during re-add. Check active downloads.`, variant: "default"});
        }
      } catch (error) {
        console.error("[DownloadsPage] Error retrying WebTorrent download:", error);
        toast({ title: "Retry Error", description: `An unexpected error occurred: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive"});
      }
    } else {
      toast({ title: "Retry Failed", description: "Magnet URI not found for this item.", variant: "destructive"});
    }
  };

  const handleRemoveWebTorrent = async (torrentId: string) => {
    try {
      await removeTorrent(torrentId);
      toast({title: "WebTorrent Removed", description: "The torrent has been removed from active queue."});
    } catch (error) {
      console.error("[DownloadsPage] Error removing WebTorrent:", error);
      toast({title: "Removal Error", description: "Could not remove the WebTorrent.", variant: "destructive"});
    }
  }

  const handlePauseAria2 = (taskId: string) => { 
    // Actual pause would be an API call: await fetch(`/api/aria2/pause/${taskId}`, { method: 'POST' });
    toast({title: "Aria2 Action", description: `Pausing task ${taskId} (conceptual). Real backend action needed.`});
    setDisplayedAria2Downloads(prev => prev.map(d => d.taskId === taskId ? {...d, status: 'paused'} : d));
  };
  const handleResumeAria2 = (taskId: string) => { 
    // Actual resume: await fetch(`/api/aria2/resume/${taskId}`, { method: 'POST' });
    toast({title: "Aria2 Action", description: `Resuming task ${taskId} (conceptual). Real backend action needed.`});
    setDisplayedAria2Downloads(prev => prev.map(d => d.taskId === taskId ? {...d, status: 'active'} : d));
  };
  const handleRemoveAria2 = (taskId: string) => {
    // Actual removal: await fetch(`/api/aria2/remove/${taskId}`, { method: 'POST' });
    if (typeof window !== 'undefined') {
      const currentTasks: ConceptualAria2Task[] = JSON.parse(localStorage.getItem(ARIA2_TASKS_STORAGE_KEY) || '[]');
      const updatedTasks = currentTasks.filter(task => task.taskId !== taskId);
      localStorage.setItem(ARIA2_TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
      setConceptualAria2TasksStore(updatedTasks); 
      setDisplayedAria2Downloads(prev => prev.filter(d => d.taskId !== taskId));
      toast({title: "Aria2 Task Removed", description: `Conceptual task ${taskId} removed from local tracking. Real backend action needed to stop server download.`});
    }
  };
  const handleOpenAria2File = (downloadUrl?: string) => {
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        toast({title: "Opening File", description: `Attempting to download placeholder from ${downloadUrl}`});
      } else {
        toast({title: "Aria2 File Error", description: "Download URL not available or task not complete.", variant: "destructive"});
      }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Downloads</h1>
          <p className="text-muted-foreground mt-1">Manage your active and completed downloads.</p>
        </div>
        {!isClientReady && <Badge variant="destructive" className="animate-pulse p-2 text-sm">WebTorrent Client Initializing...</Badge>}
      </div>

      <Tabs defaultValue="webtorrent_active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-x-1.5 rounded-lg p-1.5 bg-muted h-auto md:h-12 text-base">
          <TabsTrigger value="webtorrent_active" className="h-full py-2.5 px-2 md:px-3">WebTorrents</TabsTrigger>
          <TabsTrigger value="server_downloads" className="h-full py-2.5 px-2 md:px-3">Server (Aria2)</TabsTrigger>
          <TabsTrigger value="history" className="h-full py-2.5 px-2 md:px-3 col-span-2 md:col-span-1">History</TabsTrigger>
        </TabsList>

        <TabsContent value="webtorrent_active" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader><CardTitle>Active WebTorrents</CardTitle></CardHeader>
            <CardContent className="p-0">
              {activeWebTorrents.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {activeWebTorrents.map((download) => {
                    const { badge: statusBadge, icon: statusIcon } = getStatusInfo(download.status, download.noPeersReason);
                    return (
                      <div key={download.torrentId} className="p-4 md:p-6 hover:bg-muted/30">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-grow min-w-0">
                            <h3 className="font-semibold text-md md:text-lg truncate mb-1" title={download.customName || download.torrentId}>{download.customName || 'Fetching name...'}</h3>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">{statusIcon}{statusBadge}</span>
                              <span>{formatBytes(download.downloaded)} / {download.length ? formatBytes(download.length) : 'N/A'}</span>
                              {(download.status === 'downloading' || download.status === 'connecting' || download.status === 'metadata') && download.downloadSpeed > 0 && (
                                <><span className="hidden sm:inline">&bull;</span><span>{formatBytes(download.downloadSpeed)}/s</span></>
                              )}
                              {download.status === 'downloading' && download.remainingTime !== undefined && Number.isFinite(download.remainingTime) && download.remainingTime > 0 && (
                                <><span className="hidden sm:inline">&bull;</span><span>ETA: {new Date(download.remainingTime).toISOString().substr(11, 8)}</span></>
                              )}
                              <span className="hidden sm:inline">&bull;</span><span>Peers: {download.peers}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
                            {(download.status === 'downloading' || download.status === 'connecting' || download.status === 'metadata' || download.status === 'stalled' || download.status === 'no_peers') && (
                              <Button variant="ghost" size="icon" aria-label="Pause" onClick={() => pauseTorrent(download.torrentId)}><PauseCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {download.status === 'paused' && (
                              <Button variant="ghost" size="icon" aria-label="Resume" onClick={() => resumeTorrent(download.torrentId)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {(download.status === 'done' || download.status === 'seeding' || (download.status === 'downloading' && download.progress > 0.01)) && (
                              <Button variant="ghost" size="icon" aria-label="Play/Stream" onClick={() => handlePlayWebTorrent(download.torrentId)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" aria-label="Remove" onClick={() => handleRemoveWebTorrent(download.torrentId)}><XCircleIcon className="h-5 w-5" /></Button>
                          </div>
                        </div>
                        <Progress value={download.progress * 100} className="mt-3 h-1.5 md:h-2" indicatorClassName={
                            download.status === 'paused' ? 'bg-yellow-500' : 
                            (download.status === 'error' || download.status === 'failed') ? 'bg-red-500' : 
                            (download.status === 'done' || download.status === 'seeding' ) ? 'bg-green-500' : 
                            (download.status === 'stalled' || download.status === 'no_peers') ? 'bg-orange-500' :
                            'bg-primary'} />
                        {download.status === 'no_peers' && download.noPeersReason && <p className="text-xs text-orange-400 mt-1">{download.noPeersReason}</p>}
                        {download.status === 'stalled' && <p className="text-xs text-orange-400 mt-1">Download stalled. Check connection or seeders.</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <DownloadCloudIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">No Active WebTorrents</h3>
                  {isClientReady ? 
                    <Button variant="outline" className="mt-4" asChild><Link href="/home">Find Something to Download</Link></Button> 
                    : <p className="text-muted-foreground mt-2">WebTorrent client is initializing. Please wait...</p> 
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server_downloads" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader>
              <CardTitle>Server Downloads (Aria2 - Simulated)</CardTitle>
              <CardDescription className="text-xs">This section simulates downloads managed by a backend server like Aria2. For actual server downloads, a separate backend server setup is required.</CardDescription>
            </CardHeader>
             <CardContent className="p-0">
              {isLoadingAria2 && displayedAria2Downloads.length === 0 && (
                <div className="text-center py-12 px-6"><Loader2Icon className="mx-auto h-12 w-12 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Loading server download statuses (simulated)...</p></div>
              )}
              {!isLoadingAria2 && displayedAria2Downloads.length === 0 && (
                 <div className="text-center py-12 px-6">
                  <ServerIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">No Active Server Downloads (Simulated)</h3>
                  <p className="text-muted-foreground mt-1">Downloads sent to the server will appear here once initiated.</p>
                </div>
              )}
              {displayedAria2Downloads.length > 0 && (
                 <div className="divide-y divide-border/30">
                  {displayedAria2Downloads.map((download) => {
                     const { badge: statusBadge, icon: statusIcon } = getStatusInfo(download.status);
                     return (
                       <div key={download.taskId} className="p-4 md:p-6 hover:bg-muted/30">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                           <div className="flex-grow min-w-0">
                             <h3 className="font-semibold text-md md:text-lg truncate mb-1" title={download.name}>{download.name}</h3>
                             <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                               <span className="flex items-center gap-1.5">{statusIcon}{statusBadge}</span>
                               {download.quality && <span>{download.quality}</span>}
                               <span className="hidden sm:inline">&bull;</span>
                               <span>{formatBytes(download.completedLength || 0)} / {download.totalLength ? formatBytes(download.totalLength) : 'N/A'}</span>
                               {download.status === 'active' && download.downloadSpeed > 0 && <span>{formatBytes(download.downloadSpeed)}/s</span>}
                               {download.status === 'active' && download.connections !== undefined && <><span className="hidden sm:inline">&bull;</span>Peers: {download.connections}</>}
                             </div>
                           </div>
                           <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
                             {download.status === 'active' && <Button variant="ghost" size="icon" title="Pause (Conceptual)" onClick={() => handlePauseAria2(download.taskId)}><PauseCircleIcon className="h-5 w-5" /></Button>}
                             {download.status === 'paused' && <Button variant="ghost" size="icon" title="Resume (Conceptual)" onClick={() => handleResumeAria2(download.taskId)}><PlayCircleIcon className="h-5 w-5" /></Button>}
                             {download.status === 'complete' && download.downloadUrl && <Button variant="ghost" size="icon" title="Download File (Placeholder)" onClick={() => handleOpenAria2File(download.downloadUrl)}><FolderOpenIcon className="h-5 w-5" /></Button>}
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" title="Remove Task (Conceptual)" onClick={() => handleRemoveAria2(download.taskId)}><XCircleIcon className="h-5 w-5" /></Button>
                           </div>
                         </div>
                         <Progress value={download.progress} className="mt-3 h-1.5 md:h-2" indicatorClassName={download.status === 'paused' ? 'bg-yellow-500' : (download.status === 'error') ? 'bg-red-500' : (download.status === 'complete') ? 'bg-green-500' : 'bg-primary'}/>
                         {download.errorMessage && <p className="text-xs text-destructive mt-1">{download.errorMessage}</p>}
                       </div>
                     );
                  })}
                 </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Download History</CardTitle>
                {webTorrentHistory.length > 0 && (
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
              {webTorrentHistory.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {webTorrentHistory.map(item => {
                    const { badge: statusBadge, icon: statusIcon } = getStatusInfo(item.status);
                    return (
                      <div key={item.infoHash} className={`p-4 md:p-6 hover:bg-muted/30 ${item.status === 'failed' || item.status === 'error' || item.status === 'stalled' ? 'opacity-70' : ''}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-grow min-w-0">
                            <h3 className="font-semibold text-md md:text-lg truncate mb-1" title={item.name}>{item.name}</h3>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">{statusIcon}{statusBadge}</span>
                              <span>Added: {new Date(item.addedDate).toLocaleDateString()}</span>
                              {item.completedDate && <><span className="hidden sm:inline">&bull;</span><span>Finished: {new Date(item.completedDate).toLocaleDateString()}</span></>}
                              {item.size && <><span className="hidden sm:inline">&bull;</span><span>Size: {formatBytes(item.size)}</span></>}
                            </div>
                            {item.lastError && <p className="text-xs text-destructive mt-1">Error: {item.lastError}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
                            {(item.status === 'completed') && item.magnetURI && ( // Keep 'done' for backward compatibility if any old history items exist with it
                                <Button variant="ghost" size="icon" title="Stream/Play again" onClick={() => handlePlayWebTorrent(item.magnetURI, true)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {(item.status === 'failed' || item.status === 'error' || item.status === 'stalled') && item.magnetURI && (
                              <Button variant="ghost" size="icon" title="Retry Download" onClick={() => handleRetryWebTorrentDownload(item)}><RefreshCwIcon className="h-5 w-5" /></Button>
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
                  <p className="text-muted-foreground mt-1">Completed, failed, or removed downloads will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
