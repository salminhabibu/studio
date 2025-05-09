// src/app/(main)/settings/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpenIcon, PaletteIcon, WifiIcon, BellIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderOpenIcon className="h-6 w-6 text-primary" /> General</CardTitle>
          <CardDescription>Manage your download preferences and application behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="download-location">Download Location</Label>
            <div className="flex items-center gap-2">
              <Input id="download-location" defaultValue="/Users/ChillyUser/Downloads/ChillyMovies" readOnly className="flex-grow" />
              <Button variant="outline" size="icon"><FolderOpenIcon className="h-5 w-5" /></Button>
            </div>
            <p className="text-sm text-muted-foreground">Disk space available: 256 GB</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-quality">Default Download Quality</Label>
            <Select defaultValue="1080p">
              <SelectTrigger id="default-quality">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4k">4K (Best)</SelectItem>
                <SelectItem value="1080p">1080p (Recommended)</SelectItem>
                <SelectItem value="720p">720p (Good)</SelectItem>
                <SelectItem value="480p">480p (Standard)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">This will be the default quality for new downloads.</p>
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="auto-start-downloads" className="text-base">Auto-start Downloads</Label>
              <p className="text-sm text-muted-foreground">Automatically start downloads when added to the queue.</p>
            </div>
            <Switch id="auto-start-downloads" defaultChecked />
          </div>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PaletteIcon className="h-6 w-6 text-accent" /> Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="accent-color">Accent Color (Preview)</Label>
             <div className="flex gap-2">
                {['#7B2CBF', '#D4AF37', '#1A237E', '#E53E3E', '#38A169'].map(color => (
                  <Button key={color} variant="outline" size="icon" style={{ backgroundColor: color }} className="w-10 h-10 border-2 border-transparent focus:border-ring" />
                ))}
             </div>
            <p className="text-sm text-muted-foreground">Accent color customization with live preview (coming soon).</p>
          </div>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><WifiIcon className="h-6 w-6 text-blue-400" /> Network</CardTitle>
          <CardDescription>Configure network settings for downloads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-2">
            <Label htmlFor="max-concurrent-downloads">Max Concurrent Downloads</Label>
            <Input id="max-concurrent-downloads" type="number" defaultValue={3} min={1} max={10} />
            <p className="text-sm text-muted-foreground">Set the maximum number of simultaneous downloads.</p>
          </div>
           <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="use-proxy" className="text-base">Use Proxy Server</Label>
              <p className="text-sm text-muted-foreground">Route download traffic through a proxy server.</p>
            </div>
            <Switch id="use-proxy" />
          </div>
        </CardContent>
      </Card>
      
      <Separator />

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BellIcon className="h-6 w-6 text-yellow-400" /> Notifications</CardTitle>
          <CardDescription>Manage how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="download-complete-notify" className="text-base">Download Complete Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive a notification when a download finishes.</p>
            </div>
            <Switch id="download-complete-notify" defaultChecked/>
          </div>
           <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="download-failed-notify" className="text-base">Download Failed Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive a notification if a download fails.</p>
            </div>
            <Switch id="download-failed-notify" defaultChecked/>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button size="lg">Save Changes</Button>
      </div>
    </div>
  );
}

