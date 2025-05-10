// src/app/(main)/settings/page.tsx
"use client"; 

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
import { FolderOpenIcon, PaletteIcon, WifiIcon, BellIcon, CheckIcon, InfoIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PrimaryAccentColorOption {
  name: string;
  hex: string;
  primaryHsl: string;
  primaryForegroundHsl: string;
  ringHsl: string; 
}

const PRIMARY_ACCENT_COLORS: PrimaryAccentColorOption[] = [
  { name: "Royal Purple", hex: "#7B2CBF", primaryHsl: "279 63% 46%", primaryForegroundHsl: "0 0% 98%", ringHsl: "279 63% 50%" },
  { name: "Muted Gold", hex: "#D4AF37", primaryHsl: "45 65% 52%", primaryForegroundHsl: "43 74% 15%", ringHsl: "45 65% 56%" }, 
  { name: "Deep Blue", hex: "#1A237E", primaryHsl: "233 63% 30%", primaryForegroundHsl: "0 0% 98%", ringHsl: "233 63% 34%" },
  { name: "Crimson Red", hex: "#E53E3E", primaryHsl: "0 74% 57%", primaryForegroundHsl: "0 0% 98%", ringHsl: "0 74% 61%" },
  { name: "Forest Green", hex: "#38A169", primaryHsl: "145 49% 47%", primaryForegroundHsl: "0 0% 98%", ringHsl: "145 49% 51%" },
  { name: "Ocean Blue", hex: "#3182CE", primaryHsl: "208 60% 50%", primaryForegroundHsl: "0 0% 98%", ringHsl: "208 60% 54%" },
  { name: "Sunset Orange", hex: "#DD6B20", primaryHsl: "26 74% 49%", primaryForegroundHsl: "0 0% 98%", ringHsl: "26 74% 53%" },
];
const DEFAULT_PRIMARY_ACCENT_COLOR_OPTION = PRIMARY_ACCENT_COLORS[0]; // Royal Purple

interface HighlightAccentOption {
  name: string;
  hex: string;
  accentHsl: string;
  accentForegroundHsl: string;
}

const HIGHLIGHT_ACCENT_COLORS: HighlightAccentOption[] = [
  { name: "Muted Gold", hex: "#D4AF37", accentHsl: "45 65% 52%", accentForegroundHsl: "43 74% 15%" }, // Default from globals.css
  { name: "Emerald Green", hex: "#2ECC71", accentHsl: "145 63% 49%", accentForegroundHsl: "0 0% 98%" },
  { name: "Sky Blue", hex: "#3498DB", accentHsl: "207 70% 53%", accentForegroundHsl: "0 0% 98%" },
  { name: "Ruby Red", hex: "#E74C3C", accentHsl: "6 78% 57%", accentForegroundHsl: "0 0% 98%" },
  { name: "Amethyst Purple", hex: "#9B59B6", accentHsl: "283 39% 53%", accentForegroundHsl: "0 0% 98%" },
  { name: "Sun Yellow", hex: "#F1C40F", accentHsl: "48 93% 50%", accentForegroundHsl: "0 0% 7%" },
];
const DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION = HIGHLIGHT_ACCENT_COLORS[0]; // Muted Gold


export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedPrimaryAccentHex, setSelectedPrimaryAccentHex] = useState<string>(DEFAULT_PRIMARY_ACCENT_COLOR_OPTION.hex);
  const [selectedHighlightAccentHex, setSelectedHighlightAccentHex] = useState<string>(DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION.hex);

  const applyThemeColors = useCallback((primaryColor?: PrimaryAccentColorOption, highlightColor?: HighlightAccentOption) => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--primary', primaryColor.primaryHsl);
      document.documentElement.style.setProperty('--primary-foreground', primaryColor.primaryForegroundHsl);
      document.documentElement.style.setProperty('--ring', primaryColor.ringHsl);
    }
    if (highlightColor) {
      document.documentElement.style.setProperty('--accent', highlightColor.accentHsl);
      document.documentElement.style.setProperty('--accent-foreground', highlightColor.accentForegroundHsl);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedPrimaryAccentHex = localStorage.getItem("chillymovies-primary-accent-color");
    const savedHighlightAccentHex = localStorage.getItem("chillymovies-highlight-accent-color");

    const initialPrimaryColor = PRIMARY_ACCENT_COLORS.find(c => c.hex === savedPrimaryAccentHex) || DEFAULT_PRIMARY_ACCENT_COLOR_OPTION;
    const initialHighlightColor = HIGHLIGHT_ACCENT_COLORS.find(c => c.hex === savedHighlightAccentHex) || DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION;
    
    setSelectedPrimaryAccentHex(initialPrimaryColor.hex);
    setSelectedHighlightAccentHex(initialHighlightColor.hex);
    
    applyThemeColors(initialPrimaryColor, initialHighlightColor);
  }, [applyThemeColors]);
  
  const handlePrimaryAccentColorChange = useCallback((color: PrimaryAccentColorOption) => {
    setSelectedPrimaryAccentHex(color.hex);
    const currentHighlightColor = HIGHLIGHT_ACCENT_COLORS.find(c => c.hex === selectedHighlightAccentHex) || DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION;
    applyThemeColors(color, currentHighlightColor);
    if (mounted) {
        localStorage.setItem("chillymovies-primary-accent-color", color.hex);
    }
  }, [mounted, applyThemeColors, selectedHighlightAccentHex]);

  const handleHighlightAccentColorChange = useCallback((color: HighlightAccentOption) => {
    setSelectedHighlightAccentHex(color.hex);
    const currentPrimaryColor = PRIMARY_ACCENT_COLORS.find(c => c.hex === selectedPrimaryAccentHex) || DEFAULT_PRIMARY_ACCENT_COLOR_OPTION;
    applyThemeColors(currentPrimaryColor, color);
    if (mounted) {
        localStorage.setItem("chillymovies-highlight-accent-color", color.hex);
    }
  }, [mounted, applyThemeColors, selectedPrimaryAccentHex]);


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
            <PaletteIcon className="h-6 w-6 text-accent" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the primary and highlight accent colors of the application. Changes are applied live and saved automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Primary Accent Color */}
          <div className="space-y-3">
            <Label htmlFor="primary-accent-color-selector" className="text-base font-medium">Primary Accent Color</Label>
            <p className="text-sm text-muted-foreground">Controls the main interactive elements like buttons and active states.</p>
             <div id="primary-accent-color-selector" className="flex flex-wrap gap-3 pt-1">
                {PRIMARY_ACCENT_COLORS.map(color => (
                  <Button 
                    key={color.hex} 
                    variant="outline" 
                    size="icon" 
                    style={{ backgroundColor: color.hex }} 
                    className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all duration-150 ease-in-out flex items-center justify-center",
                        selectedPrimaryAccentHex === color.hex ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : "border-transparent hover:border-muted-foreground/30",
                    )}
                    onClick={() => handlePrimaryAccentColorChange(color)}
                    aria-label={`Set primary accent color to ${color.name}`}
                  >
                    {selectedPrimaryAccentHex === color.hex && (
                      <CheckIcon className="h-5 w-5" style={{ color: `hsl(${color.primaryForegroundHsl})` }} />
                    )}
                  </Button>
                ))}
             </div>
          </div>

          {/* Highlight Accent Color */}
          <div className="space-y-3">
            <Label htmlFor="highlight-accent-color-selector" className="text-base font-medium">Highlight Accent Color</Label>
            <p className="text-sm text-muted-foreground">Used for secondary highlights, special indicators, and some icons.</p>
             <div id="highlight-accent-color-selector" className="flex flex-wrap gap-3 pt-1">
                {HIGHLIGHT_ACCENT_COLORS.map(color => (
                  <Button 
                    key={color.hex} 
                    variant="outline" 
                    size="icon" 
                    style={{ backgroundColor: color.hex }} 
                    className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all duration-150 ease-in-out flex items-center justify-center",
                        selectedHighlightAccentHex === color.hex ? "ring-2 ring-offset-2 ring-offset-background ring-accent" : "border-transparent hover:border-muted-foreground/30",
                    )}
                    onClick={() => handleHighlightAccentColorChange(color)}
                    aria-label={`Set highlight accent color to ${color.name}`}
                  >
                    {selectedHighlightAccentHex === color.hex && (
                      <CheckIcon className="h-5 w-5" style={{ color: `hsl(${color.accentForegroundHsl})` }} />
                    )}
                  </Button>
                ))}
             </div>
          </div>
          <div className="flex items-start p-3 rounded-md bg-muted/50 border border-dashed border-border">
            <InfoIcon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
                Your color choices are saved automatically in your browser and applied instantly.
            </p>
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
        <Button size="lg" onClick={() => alert("General settings (excluding appearance) would be saved here. Appearance changes are already live and persisted in local storage.")}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
