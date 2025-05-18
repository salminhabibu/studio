// src/app/[locale]/(main)/settings/page.tsx
"use client"; 

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PaletteIcon, CheckIcon, InfoIcon, Trash2Icon, DatabaseIcon, PlayCircleIcon, ListChecksIcon, ClapperboardIcon } from "lucide-react"; // Changed FolderDownIcon to PlayCircleIcon
import { useState, useEffect, useCallback, use } from "react";
import { cn } from "@/lib/utils";
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
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary'; 
import { Loader2Icon } from "lucide-react";


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

const STREAMING_QUALITY_OPTIONS = [
  { value: "1080p", labelKey: "quality1080p" },
  { value: "720p", labelKey: "quality720p" },
  { value: "480p", labelKey: "quality480p" },
  { value: "any", labelKey: "qualityAny" }, // Corresponds to "Best Available"
];
const DEFAULT_STREAMING_QUALITY = STREAMING_QUALITY_OPTIONS[0].value;

interface SettingsPageProps {
  params: { locale: Locale }; 
}

export default function SettingsPage(props: SettingsPageProps) {
  const { locale } = use(props.params); 

  const [mounted, setMounted] = useState(false);
  const [selectedPrimaryAccentHex, setSelectedPrimaryAccentHex] = useState<string>(DEFAULT_PRIMARY_ACCENT_COLOR_OPTION.hex);
  const [selectedHighlightAccentHex, setSelectedHighlightAccentHex] = useState<string>(DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION.hex);
  const [preferredStreamingQuality, setPreferredStreamingQuality] = useState<string>(DEFAULT_STREAMING_QUALITY);
  const [dictionary, setDictionary] = useState<any>(null);

  // Removed useWebTorrent and clearDownloadHistory as it's download-specific
  const { toast } = useToast();

  useEffect(() => {
    const fetchDictionary = async () => {
      if (locale) { 
        const dict = await getDictionary(locale);
        setDictionary(dict.settingsPage);
      }
    };
    fetchDictionary();
  }, [locale]);

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
    const savedPreferredQuality = localStorage.getItem("chillymovies-preferred-streaming-quality"); // Updated key

    const initialPrimaryColor = PRIMARY_ACCENT_COLORS.find(c => c.hex === savedPrimaryAccentHex) || DEFAULT_PRIMARY_ACCENT_COLOR_OPTION;
    const initialHighlightColor = HIGHLIGHT_ACCENT_COLORS.find(c => c.hex === savedHighlightAccentHex) || DEFAULT_HIGHLIGHT_ACCENT_COLOR_OPTION;
    const initialPreferredQuality = STREAMING_QUALITY_OPTIONS.find(q => q.value === savedPreferredQuality)?.value || DEFAULT_STREAMING_QUALITY;
    
    setSelectedPrimaryAccentHex(initialPrimaryColor.hex);
    setSelectedHighlightAccentHex(initialHighlightColor.hex);
    setPreferredStreamingQuality(initialPreferredQuality);
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
    setPreferredStreamingQuality(qualityValue);
    if (mounted && typeof localStorage !== 'undefined') localStorage.setItem("chillymovies-preferred-streaming-quality", qualityValue); // Updated key
    toast({
      title: dictionary?.toastPreferenceSavedTitle || "Preference Saved",
      description: `${dictionary?.toastPreferenceQualitySet || "Preferred streaming quality set to"} ${dictionary?.streamingPrefs?.[STREAMING_QUALITY_OPTIONS.find(q=>q.value === qualityValue)?.labelKey || qualityValue] || qualityValue}.`
    })
  };

  const handleClearPlaybackHistory = () => { // Renamed from handleClearHistory
    // Placeholder for actual playback history clearing logic
    localStorage.removeItem("chillymovies-playback-history"); // Example key
    toast({
      title: dictionary?.toastHistoryClearedTitle || "Playback History Cleared",
      description: dictionary?.toastHistoryClearedDesc || "Your playback history has been successfully cleared (once implemented).",
    });
  };

  if (!mounted || !dictionary || !locale) { 
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight">{dictionary.mainTitle}</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PaletteIcon className="h-6 w-6 text-accent" /> {dictionary.appearance.title}</CardTitle>
          <CardDescription>{dictionary.appearance.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <h4 className="text-base font-medium">{dictionary.appearance.primaryAccentLabel}</h4>
            <div className="flex flex-wrap gap-3 pt-1">
              {PRIMARY_ACCENT_COLORS.map(color => (
                <Button key={color.hex} variant="outline" size="icon" style={{ backgroundColor: color.hex }} 
                  className={cn("w-10 h-10 rounded-full border-2 transition-all", selectedPrimaryAccentHex === color.hex ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : "border-transparent hover:border-muted-foreground/30")}
                  onClick={() => handlePrimaryAccentColorChange(color)} aria-label={`${dictionary.appearance.setPrimaryLabel} ${color.name}`}>
                  {selectedPrimaryAccentHex === color.hex && <CheckIcon className="h-5 w-5" style={{ color: `hsl(${color.primaryForegroundHsl})` }} />}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-base font-medium">{dictionary.appearance.highlightAccentLabel}</h4>
            <div className="flex flex-wrap gap-3 pt-1">
              {HIGHLIGHT_ACCENT_COLORS.map(color => (
                <Button key={color.hex} variant="outline" size="icon" style={{ backgroundColor: color.hex }} 
                  className={cn("w-10 h-10 rounded-full border-2 transition-all", selectedHighlightAccentHex === color.hex ? "ring-2 ring-offset-2 ring-offset-background ring-accent" : "border-transparent hover:border-muted-foreground/30")}
                  onClick={() => handleHighlightAccentColorChange(color)} aria-label={`${dictionary.appearance.setHighlightLabel} ${color.name}`}>
                  {selectedHighlightAccentHex === color.hex && <CheckIcon className="h-5 w-5" style={{ color: `hsl(${color.accentForegroundHsl})` }} />}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-start p-3 rounded-md bg-muted/50 border border-dashed border-border">
            <InfoIcon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">{dictionary.appearance.note}</p>
          </div>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          {/* Changed icon and text to reflect streaming */}
          <CardTitle className="flex items-center gap-2"><ClapperboardIcon className="h-6 w-6 text-primary" /> {dictionary.streamingPrefs.title}</CardTitle>
          <CardDescription>{dictionary.streamingPrefs.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Removed Download Location section as it's not relevant for streaming */}
          
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <ListChecksIcon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
              <div>
                {/* Updated Label and Select for streaming quality */}
                <Label htmlFor="preferred-streaming-quality-select" className="text-base font-medium block mb-1.5">{dictionary.streamingPrefs.qualityTitle}</Label>
                <Select value={preferredStreamingQuality} onValueChange={handlePreferredQualityChange}>
                  <SelectTrigger id="preferred-streaming-quality-select" className="h-11 w-full sm:w-64">
                    <SelectValue placeholder={dictionary.streamingPrefs.qualityPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {STREAMING_QUALITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{dictionary.streamingPrefs[option.labelKey] || option.labelKey}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {dictionary.streamingPrefs.qualityDescription}
                </p>
              </div>
            </div>
          </div>
           <div className="flex items-start p-3 rounded-md bg-muted/50 border border-dashed border-border">
            <InfoIcon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
                {dictionary.streamingPrefs.performanceNote}
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DatabaseIcon className="h-6 w-6 text-primary" /> {dictionary.dataManagement.title}</CardTitle>
          <CardDescription>{dictionary.dataManagement.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              {/* Updated text for playback history */}
              <h4 className="text-base font-medium">{dictionary.dataManagement.playbackHistoryTitle}</h4>
              <p className="text-sm text-muted-foreground">{dictionary.dataManagement.playbackHistoryDescription}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2Icon className="mr-2 h-4 w-4"/> {dictionary.dataManagement.clearPlaybackHistoryButton}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{dictionary.dataManagement.alertTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {dictionary.dataManagement.alertDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{dictionary.dataManagement.alertCancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearPlaybackHistory}>{dictionary.dataManagement.alertConfirm}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
           <div className="flex items-start p-3 rounded-md bg-muted/50 border border-dashed border-border">
            <InfoIcon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
                {dictionary.dataManagement.storageNote}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
