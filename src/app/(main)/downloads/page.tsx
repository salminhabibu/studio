// src/app/(main)/downloads/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DownloadCloudIcon, PlayCircleIcon, PauseCircleIcon, XCircleIcon, FolderOpenIcon, Trash2Icon, RefreshCwIcon, HistoryIcon, ListChecksIcon, ArrowUpDownIcon, FileTextIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function DownloadsPage() {
  const activeDownloads = [
    { id: 1, name: "Epic Movie Adventure The Lost Horizon.mkv", progress: 65, speed: "2.5 MB/s", eta: "5 min", status: "downloading" as const, size: "1.2 GB / 2.0 GB" },
    { id: 2, name: "Popular TV Show S01E01 Pilot Episode.mp4", progress: 30, speed: "1.2 MB/s", eta: "12 min", status: "downloading" as const, size: "300 MB / 1.0 GB" },
    { id: 6, name: "Sci-Fi Short Film The Glitch.webm", progress: 85, speed: "0.8 MB/s", eta: "2 min", status: "paused" as const, size: "170 MB / 200 MB" },
  ];

  const completedDownloads = [
    { id: 3, name: "Another Great Film The Director's Cut.mp4", status: "completed" as const, date: "2024-07-20", size: "3.5 GB" },
    { id: 4, name: "Documentary Series Part 1 The Beginning.avi", status: "completed" as const, date: "2024-07-19", size: "1.8 GB" },
    { id: 5, name: "Failed Download Attempt Corrupted File.webm", status: "failed" as const, date: "2024-07-18", size: "N/A" },
  ];

  const getStatusBadge = (status: "downloading" | "paused" | "completed" | "failed") => {
    switch (status) {
      case "downloading":
        return <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">Downloading</Badge>;
      case "paused":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">Paused</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Downloads</h1>
          <p className="text-muted-foreground mt-1">
            Manage your active and completed downloads.
          </p>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-x-1.5 rounded-lg p-1.5 bg-muted">
          <TabsTrigger value="active" className="px-6 py-2.5 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
            <DownloadCloudIcon className="h-5 w-5" /> Active Downloads
          </TabsTrigger>
          <TabsTrigger value="history" className="px-6 py-2.5 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" /> Download History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-8">
          <Card className="shadow-2xl border-border/40 overflow-hidden">
            <CardHeader className="bg-card/50 p-6 border-b border-border/30">
              <CardTitle className="text-2xl font-semibold flex items-center">
                <ListChecksIcon className="mr-3 h-6 w-6 text-primary" />
                Active Queue
              </CardTitle>
              <CardDescription>Downloads currently in progress or paused.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {activeDownloads.length > 0 ? (
                <div className="divide-y divide-border/30">
                {activeDownloads.map((download, index) => (
                  <div key={download.id} className="p-6 hover:bg-muted/30 transition-colors duration-150">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-grow min-w-0"> 
                        <div className="flex items-center gap-3 mb-1.5">
                          <FileTextIcon className="h-6 w-6 text-muted-foreground/80 flex-shrink-0" />
                          <h3 className="font-semibold text-lg truncate" title={download.name}>{download.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground ml-9">
                          {getStatusBadge(download.status)}
                          <span className="hidden sm:inline">&bull;</span>
                          <span className="hidden sm:inline">{download.size}</span>
                          {download.status === 'downloading' && (
                            <>
                              <span className="hidden sm:inline">&bull;</span>
                              <span>{download.speed}</span>
                              <span className="hidden sm:inline">&bull;</span>
                              <span>{download.eta}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 mt-3 sm:mt-0 self-start sm:self-center">
                        {download.status === 'downloading' && (
                          <Button variant="ghost" size="icon" aria-label="Pause" className="hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300">
                            <PauseCircleIcon className="h-6 w-6" />
                          </Button>
                        )}
                        {download.status === 'paused' && (
                           <Button variant="ghost" size="icon" aria-label="Resume" className="hover:bg-green-500/10 text-green-400 hover:text-green-300">
                            <PlayCircleIcon className="h-6 w-6" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Cancel">
                          <XCircleIcon className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                    <Progress 
                      value={download.progress} 
                      className="mt-4 h-2" 
                      indicatorClassName={download.status === 'paused' ? 'bg-yellow-500' : 'bg-primary'} 
                    />
                  </div>
                ))}
                </div>
              ) : (
                <div className="text-center py-16 px-6">
                  <DownloadCloudIcon className="mx-auto h-20 w-20 text-muted-foreground/50 mb-6" />
                  <h3 className="text-2xl font-semibold text-muted-foreground">Your Active Downloads Queue is Empty</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Start adding movies or TV series to see them here. They will appear once processing begins.
                  </p>
                  <Button variant="outline" className="mt-6">Find Something to Download</Button>
                </div>
              )}
            </CardContent>
            {activeDownloads.length > 0 && (
              <CardFooter className="p-6 bg-card/50 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-sm text-muted-foreground">Manage all active downloads.</p>
                <div className="flex gap-3">
                  <Button variant="outline">Pause All</Button>
                  <Button variant="destructive">Cancel All</Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-8">
          <Card className="shadow-2xl border-border/40 overflow-hidden">
            <CardHeader className="bg-card/50 p-6 border-b border-border/30">
              <CardTitle className="text-2xl font-semibold flex items-center">
                <HistoryIcon className="mr-3 h-6 w-6 text-primary" />
                Download History
              </CardTitle>
              <CardDescription>Review your past download activity.
                 <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <ArrowUpDownIcon className="mr-2 h-4 w-4" /> Sort by Date
                    </Button>
                    <Button variant="outline" size="sm">
                        Filter by Status
                    </Button>
                 </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {completedDownloads.length > 0 ? (
                <div className="divide-y divide-border/30">
                {completedDownloads.map(download => (
                  <div key={download.id} className={`p-6 hover:bg-muted/30 transition-colors duration-150 ${download.status === 'failed' ? 'bg-destructive/5 hover:bg-destructive/10' : ''}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                       <div className="flex-grow min-w-0"> 
                        <div className="flex items-center gap-3 mb-1.5">
                          <FileTextIcon className="h-6 w-6 text-muted-foreground/80 flex-shrink-0" />
                          <h3 className="font-semibold text-lg truncate" title={download.name}>{download.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground ml-9">
                           {getStatusBadge(download.status)}
                           <span className="hidden sm:inline">&bull;</span>
                           <span>{download.date}</span>
                           <span className="hidden sm:inline">&bull;</span>
                           <span>{download.size}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 mt-3 sm:mt-0 self-start sm:self-center">
                        {download.status === 'completed' && (
                          <Button variant="ghost" size="icon" aria-label="Open folder" className="hover:bg-accent/10 text-accent hover:text-accent/80">
                            <FolderOpenIcon className="h-6 w-6" />
                          </Button>
                        )}
                        {download.status === 'failed' && (
                          <Button variant="ghost" size="icon" aria-label="Retry download" className="hover:bg-primary/10 text-primary hover:text-primary/80">
                            <RefreshCwIcon className="h-6 w-6" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete from history">
                          <Trash2Icon className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              ) : (
                <div className="text-center py-16 px-6">
                  <HistoryIcon className="mx-auto h-20 w-20 text-muted-foreground/50 mb-6" />
                  <h3 className="text-2xl font-semibold text-muted-foreground">No Download History</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Completed or failed downloads will appear here.
                  </p>
                </div>
              )}
            </CardContent>
             {completedDownloads.length > 0 && (
              <CardFooter className="p-6 bg-card/50 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-3">
                 <p className="text-sm text-muted-foreground">Manage your download history.</p>
                <Button variant="destructive">Clear History</Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
