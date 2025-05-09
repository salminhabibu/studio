// src/app/(main)/downloads/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DownloadCloudIcon, PlayCircleIcon, PauseCircleIcon, XCircleIcon, FolderOpenIcon, Trash2Icon, RefreshCwIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DownloadsPage() {
  const activeDownloads = [
    { id: 1, name: "Epic Movie Adventure.mkv", progress: 65, speed: "2.5 MB/s", eta: "5 min remaining" },
    { id: 2, name: "Popular TV Show S01E01.mp4", progress: 30, speed: "1.2 MB/s", eta: "12 min remaining" },
  ];

  const completedDownloads = [
    { id: 3, name: "Another Great Film.mp4", status: "Completed", date: "2024-07-20" },
    { id: 4, name: "Documentary Series Part 1.avi", status: "Completed", date: "2024-07-19" },
    { id: 5, name: "Failed Download Attempt.webm", status: "Failed", date: "2024-07-18" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Downloads</h1>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2 md:w-1/2 lg:w-1/3">
          <TabsTrigger value="active">Active Downloads</TabsTrigger>
          <TabsTrigger value="history">Download History</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Downloads</CardTitle>
              <CardDescription>Manage your ongoing downloads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeDownloads.length > 0 ? activeDownloads.map(download => (
                <Card key={download.id} className="p-4 shadow-sm border-border/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg">{download.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{download.speed}</span>
                        <span>&bull;</span>
                        <span>{download.eta}</span>
                      </div>
                      <Progress value={download.progress} className="mt-2 h-3" />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" aria-label="Pause">
                        <PauseCircleIcon className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Resume" disabled>
                        <PlayCircleIcon className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Cancel">
                        <XCircleIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-10">
                  <DownloadCloudIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">No Active Downloads</h3>
                  <p className="text-muted-foreground">Your active download queue is empty.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Download History</CardTitle>
              <CardDescription>View your past downloads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
             {/* Add Sort/Filter options here */}
              {completedDownloads.length > 0 ? completedDownloads.map(download => (
                <Card key={download.id} className={`p-4 shadow-sm border-border/50 ${download.status === 'Failed' ? 'border-destructive/30 bg-destructive/5' : ''}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg">{download.name}</h3>
                      <p className={`text-sm ${download.status === 'Failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        Status: {download.status} - {download.date}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {download.status === 'Completed' && (
                        <Button variant="ghost" size="icon" aria-label="Open folder">
                          <FolderOpenIcon className="h-5 w-5" />
                        </Button>
                      )}
                       {download.status === 'Failed' && (
                        <Button variant="ghost" size="icon" aria-label="Retry download">
                          <RefreshCwIcon className="h-5 w-5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete">
                        <Trash2Icon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )) : (
                 <div className="text-center py-10">
                  <DownloadCloudIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">No Download History</h3>
                  <p className="text-muted-foreground">You haven't downloaded anything yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

