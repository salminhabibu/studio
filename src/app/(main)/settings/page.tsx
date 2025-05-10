// src/app/(main)/settings/page.tsx
"use client"; // Required for useState, useEffect, and DOM manipulation

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
import { FolderOpenIcon, PaletteIcon, WifiIcon, BellIcon, CheckIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// Define AccentColorOption interface and ACCENT_COLORS array
interface AccentColorOption {
  name: string;
  hex: string;
  primaryHsl: string;
  primaryForegroundHsl: string; // Made non-optional for clarity, ensure all colors have it
}

const ACCENT_COLORS: AccentColorOption[] = [
  { name: "Royal Purple", hex: "#7B2CBF", primaryHsl: "279 63% 46%", primaryForegroundHsl: "0 0% 98%" },
  { name: "Muted Gold", hex: "#D4AF37", primaryHsl: "45 65% 52%", primaryForegroundHsl: "43 74% 15%" }, // Dark text for gold
  { name: "Deep Blue", hex: "#1A237E", primaryHsl: "233 63% 30%", primaryForegroundHsl: "0 0% 98%" },
  { name: "Crimson Red", hex: "#E53E3E", primaryHsl: "0 74% 57%", primaryForegroundHsl: "0 0% 98%" },
  { name: "Forest Green", hex: "#38A169", primaryHsl: "145 49% 47%", primaryForegroundHsl: "0 0% 98%" },
  { name: "Ocean Blue", hex: "#3182CE", primaryHsl: "208 60% 50%", primaryForegroundHsl: "0 0% 98%" },
  { name: "Sunset Orange", hex: "#DD6B20", primaryHsl: "26 74% 49%", primaryForegroundHsl: "0 0% 98%" },
];

const DEFAULT_PRIMARY_COLOR_OPTION = ACCENT_COLORS[0]; // Royal Purple

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedAccentHex, setSelectedAccentHex] = useState<string>(DEFAULT_PRIMARY_COLOR_OPTION.hex);

  const applyAccentColor = useCallback((colorOption: AccentColorOption) => {
    document.documentElement.style.setProperty('--primary', colorOption.primaryHsl);
    document.documentElement.style.setProperty('--primary-foreground', colorOption.primaryForegroundHsl);
    // Optionally, update --ring if it should match the primary accent
    // For simplicity, --ring currently remains as defined in globals.css or updates if --primary is used for it
  }, []);

  // Effect to load from localStorage and apply on mount
  useEffect(() => {
    setMounted(true);
    const savedAccentHex = localStorage.getItem("chillymovies-accent-color");
    const initialColor = ACCENT_COLORS.find(c => c.hex === savedAccentHex) || DEFAULT_PRIMARY_COLOR_OPTION;
    
    setSelectedAccentHex(initialColor.hex);
    applyAccentColor(initialColor);
  }, [applyAccentColor]);
  
  const handleAccentColorChange = useCallback((color: AccentColorOption) => {
    setSelectedAccentHex(color.hex);
    applyAccentColor(color);
    if (mounted) {
        localStorage.setItem("chillymovies-accent-color", color.hex);
    }
  }, [mounted, applyAccentColor]);

  // Render skeleton or minimal content until mounted to prevent hydration issues with localStorage
  // For this example, we'll allow the brief flash if localStorage differs from default.
  // if (!mounted) {
  //   return <div className="space-y-8 max-w-3xl mx-auto"><h1 className="text-3xl font-semibold tracking-tight">Loading Settings...</h1></div>; 
  // }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      {/* General Section */}
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

      {/* Appearance Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="h-6 w-6 text-accent" /> {/* This icon uses --accent (Muted Gold by default) */}
            Appearance
          </CardTitle>
          <CardDescription>Customize the primary accent color of the application. Changes are applied live and saved automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="accent-color-selector">Primary Accent Color</Label>
             <div id="accent-color-selector" className="flex flex-wrap gap-3 pt-1">
                {ACCENT_COLORS.map(color => (
                  <Button 
                    key={color.hex} 
                    variant="outline" 
                    size="icon" 
                    style={{ backgroundColor: color.hex }} 
                    className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all duration-150 ease-in-out flex items-center justify-center",
                        selectedAccentHex === color.hex ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : "border-transparent hover:border-muted-foreground/30",
                    )}
                    onClick={() => handleAccentColorChange(color)}
                    aria-label={`Set accent color to ${color.name}`}
                  >
                    {selectedAccentHex === color.hex && (
                      <CheckIcon className="h-5 w-5" style={{ color: `hsl(${color.primaryForegroundHsl})` }} />
                    )}
                  </Button>
                ))}
             </div>
            <p className="text-sm text-muted-foreground pt-2">Your choice is saved automatically and applied instantly.</p>
          </div>
        </CardContent>
      </Card>
      
      <Separator />

      {/* Network Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><WifiIcon className="h-6 w-6 text-primary" /> Network</CardTitle>
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

      {/* Notifications Section */}
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BellIcon className="h-6 w-6 text-primary" /> Notifications</CardTitle>
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
        <Button size="lg" onClick={() => alert("General settings would be saved here. Accent color changes are already live and persisted in local storage.")}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
