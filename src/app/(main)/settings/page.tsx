// src/app/(main)/settings/page.tsx
"use client"; 

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PaletteIcon, CheckIcon, InfoIcon, Trash2Icon, DatabaseIcon, FolderDownIcon, DownloadCloudIcon, ListChecksIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useWebTorrent } from "@/contexts/WebTorrentContext";
import { useToast } from "@/hooks/use-toast";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
const DEFAULT_PRIMARY_ACCENT_COLOR_OPTION = PRIMARY_ACCENT_COLORS[0];

interface HighlightAccentOption {
  name: string;
  hex: string;
  accentHsl: string;
  accentForegroundHsl: string;
}

const HIGHLIGHT_ACCENT_COLORS: HighlightAccentOption[] = [
  { name: "Muted Gold", hex: "#D4AF37", accentHsl: "45 65% 52%", accentForegroundHsl: "43 74% 15%" },
  { name: "Emerald Green", hex: "#2ECC71", accentHsl: "145 63% 49%", accentForegroundHsl: "0 0% 98%" },
  { name: "Sky Blue", hex: "#3498DB", accentHsl: "207 70% 53%", accentForegroundHsl: "0 0% 98%" },
  { name: "Ruby Red", hex: "#E74C3C", accentHsl: "6 78% 57%", accentForegroundHsl: "0 0% 98%" },
  { name: "Amethyst Purple", hex: "#9B59B6", accentHsl: "283 39% 53%", accentForegroundHsl: "0 0% 98%" },
  { name: "Sun Yellow", hex: "#F1C40F", accentHsl: "48 93% 50%", accentForegroundHsl: "0 0% 7%" },
];
const DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION = HIGHLIGHT_ACCENT_COLORS[0];

const DOWNLOAD_QUALITY_OPTIONS = [
  { value: "1080p", label: "1080p (Full HD)" },
  { value: "720p", label: "720p (HD)" },
  { value: "480p", label: "480p (SD)" },
  { value: "any", label: "Any Available" },
];
const DEFAULT_DOWNLOAD_QUALITY = DOWNLOAD_QUALITY_OPTIONS[0].value;


export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedPrimaryAccentHex, setSelectedPrimaryAccentHex] = useState<string>(DEFAULT_PRIMARY_ACCENT_COLOR_OPTION.hex);
  const [selectedHighlightAccentHex, setSelectedHighlightAccentHex] = useState<string>(DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION.hex);
  const [preferredDownloadQuality, setPreferredDownloadQuality] = useState<string>(DEFAULT_DOWNLOAD_QUALITY);

  const { clearDownloadHistory } = useWebTorrent();
  const { toast } = useToast();

  const applyThemeColors = useCallback((primaryColor?: PrimaryAccentColorOption, highlightColor?: HighlightAccentOption) => {
    if (typeof document === 'undefined') return;
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
    if (typeof localStorage === 'undefined') return;

    const savedPrimaryAccentHex = localStorage.getItem("chillymovies-primary-accent-color");
    const savedHighlightAccentHex = localStorage.getItem("chillymovies-highlight-accent-color");
    const savedPreferredQuality = localStorage.getItem("chillymovies-preferred-download-quality");

    const initialPrimaryColor = PRIMARY_ACCENT_COLORS.find(c => c.hex === savedPrimaryAccentHex) || DEFAULT_PRIMARY_ACCENT_COLOR_OPTION;
    const initialHighlightColor = HIGHLIGHT_ACCENT_COLORS.find(c => c.hex === savedHighlightAccentHex) || DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION;
    const initialPreferredQuality = DOWNLOAD_QUALITY_OPTIONS.find(q => q.value === savedPreferredQuality)?.value || DEFAULT_DOWNLOAD_QUALITY;
    
    setSelectedPrimaryAccentHex(initialPrimaryColor.hex);
    setSelectedHighlightAccentHex(initialHighlightColor.hex);
    setPreferredDownloadQuality(initialPreferredQuality);
    applyThemeColors(initialPrimaryColor, initialHighlightColor);
  }, [applyThemeColors]);
  
  const handlePrimaryAccentColorChange = useCallback((color: PrimaryAccentColorOption) => {
    setSelectedPrimaryAccentHex(color.hex);
    const currentHighlightColor = HIGHLIGHT_ACCENT_COLORS.find(c => c.hex === selectedHighlightAccentHex) || DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION;
    applyThemeColors(color, currentHighlightColor);
    if (mounted && typeof localStorage !== 'undefined') localStorage.setItem("chillymovies-primary-accent-color", color.hex);
  }, [mounted, applyThemeColors, selectedHighlightAccentHex]);

  const handleHighlightAccentColorChange = useCallback((color: HighlightAccentOption) => {
    setSelectedHighlightAccentHex(color.hex);
    const currentPrimaryColor = PRIMARY_ACCENT_COLORS.find(c => c.hex === selectedPrimaryAccentHex) || DEFAULT_PRIMARY_ACCENT_COLOR_OPTION;
    applyThemeColors(currentPrimaryColor, color);
    if (mounted && typeof localStorage !== 'undefined') localStorage.setItem("chillymovies-highlight-accent-color", color.hex);
  }, [mounted, applyThemeColors, selectedPrimaryAccentHex]);

  const handlePreferredQualityChange = (qualityValue: string) => {
    setPreferredDownloadQuality(qualityValue);
    if (mounted && typeof localStorage !== 'undefined') localStorage.setItem("chillymovies-preferred-download-quality", qualityValue);
    toast({
      title: "Preference Saved",
      description: `Preferred download quality set to ${DOWNLOAD_QUALITY_OPTIONS.find(q=>q.value === qualityValue)?.label || qualityValue}.`
    })
  };

  const handleClearHistory = () => {
    clearDownloadHistory();
    toast({
      title: "Download History Cleared",
      description: "Your download history has been successfully cleared.",
    });
  };

  if (!mounted) {
    return null; // Or a loading spinner
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PaletteIcon className="h-6 w-6 text-accent" /> Appearance</CardTitle>
          <CardDescription>Customize the primary and highlight accent colors. Changes are saved automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <h4 className="text-base font-medium">Primary Accent Color</h4>
            <div className="flex flex-wrap gap-3 pt-1">
              {PRIMARY_ACCENT_COLORS.map(color => (
                <Button key={color.hex} variant="outline" size="icon" style={{ backgroundColor: color.hex }} 
                  className={cn("w-10 h-10 rounded-full border-2 transition-all", selectedPrimaryAccentHex === color.hex ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : "border-transparent hover:border-muted-foreground/30")}
                  onClick={() => handlePrimaryAccentColorChange(color)} aria-label={`Set primary to ${color.name}`}>
                  {selectedPrimaryAccentHex === color.hex && <CheckIcon className="h-5 w-5" style={{ color: `hsl(${color.primaryForegroundHsl})` }} />}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-base font-medium">Highlight Accent Color</h4>
            <div className="flex flex-wrap gap-3 pt-1">
              {HIGHLIGHT_ACCENT_COLORS.map(color => (
                <Button key={color.hex} variant="outline" size="icon" style={{ backgroundColor: color.hex }} 
                  className={cn("w-10 h-10 rounded-full border-2 transition-all", selectedHighlightAccentHex === color.hex ? "ring-2 ring-offset-2 ring-offset-background ring-accent" : "border-transparent hover:border-muted-foreground/30")}
                  onClick={() => handleHighlightAccentColorChange(color)} aria-label={`Set highlight to ${color.name}`}>
                  {selectedHighlightAccentHex === color.hex && <CheckIcon className="h-5 w-5" style={{ color: `hsl(${color.accentForegroundHsl})` }} />}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-start p-3 rounded-md bg-muted/50 border border-dashed border-border">
            <InfoIcon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Color choices are saved in your browser and applied instantly.</p>
          </div>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DownloadCloudIcon className="h-6 w-6 text-primary" /> Download Preferences</CardTitle>
          <CardDescription>Configure your download settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 p-4 border rounded-lg">
             <div className="flex items-start gap-3">
                <FolderDownIcon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                    <h4 className="text-base font-medium">Download Location</h4>
                    <p className="text-sm text-muted-foreground">
                        All downloads are handled by your web browser. Files are typically saved to your browser&apos;s default &lsquo;Downloads&rsquo; folder.
                        You can change this default location in your browser&apos;s settings. This application cannot directly control the download path due to browser security restrictions.
                        Each download may also prompt you with a &quot;Save As&quot; dialog depending on your browser configuration.
                    </p>
                </div>
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <ListChecksIcon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
              <div>
                <Label htmlFor="preferred-quality-select" className="text-base font-medium block mb-1.5">Preferred Download Quality</Label>
                <Select value={preferredDownloadQuality} onValueChange={handlePreferredQualityChange}>
                  <SelectTrigger id="preferred-quality-select" className="h-11 w-full sm:w-64">
                    <SelectValue placeholder="Select preferred quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOWNLOAD_QUALITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  This sets your general preference for new downloads (e.g., for TV series episodes or movies). Actual availability depends on the source and may be overridden by specific quality selectors on download pages.
                </p>
              </div>
            </div>
          </div>
           <div className="flex items-start p-3 rounded-md bg-muted/50 border border-dashed border-border">
            <InfoIcon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
                The app attempts to download all items added to the queue. For best performance, manage the number of active large downloads, as many simultaneous connections can impact browser and network speed.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DatabaseIcon className="h-6 w-6 text-primary" /> Data Management</CardTitle>
          <CardDescription>Manage locally stored application data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <h4 className="text-base font-medium">Download History</h4>
              <p className="text-sm text-muted-foreground">Clears all recorded download history from your browser.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2Icon className="mr-2 h-4 w-4"/> Clear History</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete your entire download history. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory}>Yes, clear history</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
           <div className="flex items-start p-3 rounded-md bg-muted/50 border border-dashed border-border">
            <InfoIcon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
                Download history and preferences are stored locally in your browser. Clearing history here will remove it permanently from this browser.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
