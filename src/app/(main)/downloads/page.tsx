// src/app/(main)/downloads/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    DownloadCloudIcon, PlayCircleIcon, PauseCircleIcon, XCircleIcon, 
    FolderOpenIcon, Trash2Icon, RefreshCwIcon, HistoryIcon, 
    ListChecksIcon, FileTextIcon, Loader2Icon, CheckCircle2Icon, 
    AlertTriangleIcon, InfoIcon, ServerIcon
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWebTorrent } from "@/contexts/WebTorrentContext";
import { TorrentProgress, HistoryItem, TorrentFile as WebTorrentTorrentFile } from "@/lib/webtorrent-service";
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

// Conceptual type for Aria2 download items
interface Aria2DownloadItem {
  taskId: string;
  name: string;
  status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';
  progress: number; // 0-100
  downloadSpeed: number; // bytes/s
  uploadSpeed: number; // bytes/s
  totalLength?: number;
  completedLength?: number;
  connections?: number;
  downloadUrl?: string; // Available when complete
  errorCode?: string;
  errorMessage?: string;
}


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

  // Conceptual state for Aria2 downloads
  const [aria2Downloads, setAria2Downloads] = useState<Aria2DownloadItem[]>([]);
  const [isLoadingAria2, setIsLoadingAria2] = useState(false);


  // Conceptual: Fetch Aria2 download statuses
  useEffect(() => {
    const fetchAria2Statuses = async () => {
      setIsLoadingAria2(true);
      try {
        // In a real app, you'd fetch all active task IDs, then poll status for each
        // For now, this is a placeholder.
        // const response = await fetch('/api/aria2/tasks'); 
        // const data = await response.json();
        // setAria2Downloads(data.tasks || []);
        console.log("Conceptual: Fetching Aria2 statuses (not implemented)");
      } catch (error) {
        console.error("Error fetching Aria2 statuses:", error);
      } finally {
        setIsLoadingAria2(false);
      }
    };
    // fetchAria2Statuses();
    // const interval = setInterval(fetchAria2Statuses, 5000); // Poll every 5s
    // return () => clearInterval(interval);
  }, []);


  const getStatusInfo = (status: TorrentProgress['status'] | HistoryItem['status'] | Aria2DownloadItem['status']) => {
    switch (status) {
      case "downloading":
      case "active": // For Aria2
        return { badge: <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">Downloading</Badge>, icon: <Loader2Icon className="h-4 w-4 text-blue-400 animate-spin" /> };
      case "paused":
        return { badge: <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">Paused</Badge>, icon: <PauseCircleIcon className="h-4 w-4 text-yellow-400" /> };
      case "completed":
      case "done":
      case "seeding": // WebTorrent specific
      case "complete": // Aria2 specific
        return { badge: <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Completed</Badge>, icon: <CheckCircle2Icon className="h-4 w-4 text-green-400" /> };
      case "failed":
      case "error":
        return { badge: <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Failed</Badge>, icon: <AlertTriangleIcon className="h-4 w-4 text-red-400" /> };
      case "connecting":
      case "metadata":
      case "waiting": // Aria2 specific
        return { badge: <Badge variant="outline" className="animate-pulse">Connecting...</Badge>, icon: <Loader2Icon className="h-4 w-4 text-muted-foreground animate-spin" /> };
      case "removed":
        return { badge: <Badge variant="outline">Removed</Badge>, icon: <Trash2Icon className="h-4 w-4 text-muted-foreground" /> };
      default:
        return { badge: <Badge variant="outline">Unknown</Badge>, icon: <InfoIcon className="h-4 w-4 text-muted-foreground" /> };
    }
  };

  const handlePlayWebTorrent = async (torrentIdOrMagnet: string, isMagnet = false) => {
    toast({ title: "Preparing Stream", description: "Attempting to stream the largest file..." });
    let infoHash = torrentIdOrMagnet;
    
    if (isMagnet) {
        let torrent = getTorrentInstance(torrentIdOrMagnet); // Try by magnet first
        if (!torrent) { // If not found by magnet, try by infoHash if it was one
            const allActive = activeWebTorrents.find(t => t.torrentId === torrentIdOrMagnet);
            if (allActive) torrent = getTorrentInstance(allActive.torrentId);
        }

        if (!torrent) { // If still not found, and it's a magnet from history, try adding it
            console.log(`[DownloadsPage] Torrent for magnet ${torrentIdOrMagnet} not active, attempting to re-add for streaming.`);
            const newTorrent = await addWebTorrent(torrentIdOrMagnet, "Streaming item (from history)"); 
            if (!newTorrent || !newTorrent.infoHash) {
                toast({ title: "Stream Failed", description: "Could not start torrent for streaming.", variant: "destructive" });
                return;
            }
            infoHash = newTorrent.infoHash;
        } else {
          infoHash = torrent.infoHash;
        }
    }
    
    // Wait for torrent to be ready
    let attempt = 0;
    while(attempt < 10) { // Max 10 attempts (e.g. 10 seconds)
        const currentTorrentInstance = getTorrentInstance(infoHash);
        if (currentTorrentInstance && currentTorrentInstance.ready) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempt++;
    }

    const streamData = await getLargestFileForStreaming(infoHash);
    if (streamData && streamData.streamUrl) {
      console.log("[DownloadsPage] Stream URL for WebTorrent:", streamData.streamUrl);
      toast({ title: "Streaming Ready", description: `Opening player for ${streamData.file.name}.` });
      window.open(streamData.streamUrl, '_blank');
    } else {
      toast({ title: "Stream Failed", description: "Could not prepare the file for streaming. Ensure torrent has files and is active.", variant: "destructive" });
    }
  };
  
  const handleRetryWebTorrentDownload = async (item: HistoryItem) => {
    if (item.magnetURI) {
      try {
        const torrent = await addWebTorrent(item.magnetURI, item.name, item.itemId);
        if (torrent) {
          toast({ title: "Retrying Download", description: `Adding ${item.name} back to WebTorrent queue.`});
          removeDownloadFromHistory(item.infoHash); // Remove from history as it's now active
        } else {
          toast({ title: "Retry Issue", description: `Could not add ${item.name}. It might already be active or an error occurred.`, variant: "default"});
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
      await removeTorrent(torrentId); // This will also update history status to 'removed'
      toast({title: "WebTorrent Removed", description: "The torrent has been removed from active queue."});
    } catch (error) {
      console.error("[DownloadsPage] Error removing WebTorrent:", error);
      toast({title: "Removal Error", description: "Could not remove the WebTorrent.", variant: "destructive"});
    }
  }

  // Conceptual Aria2 actions
  const handlePauseAria2 = (taskId: string) => { console.log("Pause Aria2 task:", taskId); toast({title: "Aria2 Action", description: `Pausing task ${taskId} (conceptual).`})};
  const handleResumeAria2 = (taskId: string) => { console.log("Resume Aria2 task:", taskId); toast({title: "Aria2 Action", description: `Resuming task ${taskId} (conceptual).`})};
  const handleRemoveAria2 = (taskId: string) => { console.log("Remove Aria2 task:", taskId); toast({title: "Aria2 Action", description: `Removing task ${taskId} (conceptual).`})};
  const handleOpenAria2File = (downloadUrl?: string) => {
      if (downloadUrl) window.open(downloadUrl, '_blank');
      else toast({title: "Aria2 File Error", description: "Download URL not available.", variant: "destructive"});
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Downloads</h1>
          <p className="text-muted-foreground mt-1">Manage your active and completed downloads.</p>
        </div>
        {!isClientReady && <Badge variant="destructive">WebTorrent Client Initializing...</Badge>}
      </div>

      <Tabs defaultValue="webtorrent_active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-x-1.5 rounded-lg p-1.5 bg-muted h-auto md:h-12 text-base">
          <TabsTrigger value="webtorrent_active" className="h-full py-2">WebTorrents</TabsTrigger>
          <TabsTrigger value="server_downloads" className="h-full py-2">Server (Aria2)</TabsTrigger>
          <TabsTrigger value="history" className="h-full py-2 col-span-2 md:col-span-1">Download History</TabsTrigger>
        </TabsList>

        {/* WebTorrent Active Downloads */}
        <TabsContent value="webtorrent_active" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader><CardTitle>Active WebTorrents</CardTitle></CardHeader>
            <CardContent className="p-0">
              {activeWebTorrents.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {activeWebTorrents.map((download) => {
                    const { badge: statusBadge, icon: statusIcon } = getStatusInfo(download.status);
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
                            {(download.status === 'downloading' || download.status === 'connecting' || download.status === 'metadata') && (
                              <Button variant="ghost" size="icon" aria-label="Pause" onClick={() => pauseTorrent(download.torrentId)}><PauseCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {download.status === 'paused' && (
                              <Button variant="ghost" size="icon" aria-label="Resume" onClick={() => resumeTorrent(download.torrentId)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {(download.status === 'done' || download.status === 'seeding' || (download.status === 'downloading' && download.progress > 0.01)) && ( // Allow play if some progress
                              <Button variant="ghost" size="icon" aria-label="Play/Stream" onClick={() => handlePlayWebTorrent(download.torrentId)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" aria-label="Remove" onClick={() => handleRemoveWebTorrent(download.torrentId)}><XCircleIcon className="h-5 w-5" /></Button>
                          </div>
                        </div>
                        <Progress value={download.progress * 100} className="mt-3 h-1.5 md:h-2" indicatorClassName={download.status === 'paused' ? 'bg-yellow-500' : (download.status === 'error' || download.status === 'failed') ? 'bg-red-500' : (download.status === 'done' || download.status === 'seeding' ) ? 'bg-green-500' : 'bg-primary'} />
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

        {/* Server (Aria2) Downloads - Conceptual */}
        <TabsContent value="server_downloads" className="mt-8">
          <Card className="shadow-lg border-border/40 overflow-hidden">
            <CardHeader><CardTitle>Server Downloads (Aria2 - Conceptual)</CardTitle></CardHeader>
             <CardContent className="p-0">
              {aria2Downloads.length > 0 ? (
                 <div className="divide-y divide-border/30">
                  {aria2Downloads.map((download) => {
                     const { badge: statusBadge, icon: statusIcon } = getStatusInfo(download.status);
                     return (
                       <div key={download.taskId} className="p-4 md:p-6 hover:bg-muted/30">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                           <div className="flex-grow min-w-0">
                             <h3 className="font-semibold text-md md:text-lg truncate mb-1" title={download.name}>{download.name}</h3>
                             <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                               <span className="flex items-center gap-1.5">{statusIcon}{statusBadge}</span>
                               <span>{formatBytes(download.completedLength || 0)} / {download.totalLength ? formatBytes(download.totalLength) : 'N/A'}</span>
                               {download.downloadSpeed > 0 && <span>{formatBytes(download.downloadSpeed)}/s</span>}
                               {download.connections !== undefined && <span>Connections: {download.connections}</span>}
                             </div>
                           </div>
                           <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
                             {download.status === 'active' && <Button variant="ghost" size="icon" onClick={() => handlePauseAria2(download.taskId)}><PauseCircleIcon className="h-5 w-5" /></Button>}
                             {download.status === 'paused' && <Button variant="ghost" size="icon" onClick={() => handleResumeAria2(download.taskId)}><PlayCircleIcon className="h-5 w-5" /></Button>}
                             {download.status === 'complete' && download.downloadUrl && <Button variant="ghost" size="icon" onClick={() => handleOpenAria2File(download.downloadUrl)}><FolderOpenIcon className="h-5 w-5" /></Button>}
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleRemoveAria2(download.taskId)}><XCircleIcon className="h-5 w-5" /></Button>
                           </div>
                         </div>
                         <Progress value={download.progress} className="mt-3 h-1.5 md:h-2" />
                         {download.errorMessage && <p className="text-xs text-destructive mt-1">{download.errorMessage}</p>}
                       </div>
                     );
                  })}
                 </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <ServerIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">No Active Server Downloads</h3>
                  <p className="text-muted-foreground mt-1">Downloads managed by the server (e.g., Aria2) will appear here.</p>
                  {/* Add button to trigger server-side download if applicable */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Download History */}
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
                      <div key={item.infoHash} className={`p-4 md:p-6 hover:bg-muted/30 ${item.status === 'failed' || item.status === 'error' ? 'opacity-70' : ''}`}>
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
                            {(item.status === 'completed' || item.status === 'done') && item.magnetURI && (
                                <Button variant="ghost" size="icon" title="Stream/Play again" onClick={() => handlePlayWebTorrent(item.magnetURI, true)}><PlayCircleIcon className="h-5 w-5" /></Button>
                            )}
                            {(item.status === 'failed' || item.status === 'error') && item.magnetURI && (
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

