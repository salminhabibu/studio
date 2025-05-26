// Intended path: src/app/[locale]/(main)/settings/page.tsx
// Created here due to tool limitations with special characters in paths.
'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { MoonIcon, SunIcon, Trash2Icon } from 'lucide-react'; // Added Trash2Icon
import { useEffect, useState } from 'react';
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary';
import { use } from 'react';
import { Button } from '@/components/ui/button'; // Added Button
import { useToast } from '@/hooks/use-toast'; // Added useToast

interface SettingsPageProps {
  // Assuming params will be available even if not in the [locale] path for now
  // This might need adjustment depending on how routing/locale is handled for this temporary path
  params: Promise<{ locale?: Locale }>; 
}

export default function SettingsPage(props: SettingsPageProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast(); // Initialized useToast
  const [isMounted, setIsMounted] = useState(false);

  const resolvedParams = use(props.params);
  const locale = resolvedParams.locale || 'en'; // Default to 'en' if locale is not in params
  const [dictionary, setDictionary] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    const fetchDict = async () => {
      const dict = await getDictionary(locale);
      setDictionary(dict.settingsPage);
    };
    fetchDict();
  }, [locale]);

  if (!isMounted || !dictionary) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 space-y-8">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label htmlFor="theme-toggle" className="text-base">Loading...</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    ); 
  }

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const handleClearDiscoveryCache = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('chillymovies-movies-discovery-state');
      sessionStorage.removeItem('chillymovies-tvseries-discovery-state');
      toast({
        title: dictionary.cacheManagement?.clearedToast?.title || "Cache Cleared",
        description: dictionary.cacheManagement?.clearedToast?.description || "Movie and TV discovery cache has been cleared.",
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0 space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">{dictionary.mainTitle || "Settings"}</h1>
      
      {/* Appearance Card */}
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>{dictionary.appearance?.title || "Appearance"}</CardTitle>
          <CardDescription>{dictionary.appearance?.description || "Customize the look and feel of the application."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              {theme === 'dark' ? <MoonIcon className="h-5 w-5 text-muted-foreground" /> : <SunIcon className="h-5 w-5 text-muted-foreground" />}
              <Label htmlFor="theme-toggle" className="text-base">
                {theme === 'dark' ? (dictionary.appearance?.darkMode || "Dark Mode") : (dictionary.appearance?.lightMode || "Light Mode")}
              </Label>
            </div>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeChange}
              aria-label="Toggle theme"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management Card */}
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>{dictionary.cacheManagement?.title || "Data Management"}</CardTitle>
          <CardDescription>{dictionary.cacheManagement?.description || "Manage application data and cache."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="clear-cache-button" className="text-base font-medium">
                {dictionary.cacheManagement?.clearDiscoveryCache?.label || "Clear Discovery Cache"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {dictionary.cacheManagement?.clearDiscoveryCache?.description || "This will reset your filters and scroll position on the Movies and TV Series pages."}
              </p>
            </div>
            <Button id="clear-cache-button" onClick={handleClearDiscoveryCache} variant="outline">
              <Trash2Icon className="mr-2 h-4 w-4" />
              {dictionary.cacheManagement?.clearDiscoveryCache?.buttonText || "Clear"}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
