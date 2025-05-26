// src/app/[locale]/(main)/settings/page.tsx
'use client';

import { useTheme } from '@/contexts/ThemeContext'; // Adjust path if needed
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { MoonIcon, SunIcon } from 'lucide-react'; // Or other appropriate icons
import { useEffect, useState } from 'react';
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary';
import { use } from 'react'; // For promise params

interface SettingsPageProps {
  params: Promise<{ locale: Locale }>;
}

export default function SettingsPage(props: SettingsPageProps) {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false); // To prevent hydration mismatch for switch

  const resolvedParams = use(props.params);
  const locale = resolvedParams.locale;
  const [dictionary, setDictionary] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    const fetchDict = async () => {
      if (locale) {
        const dict = await getDictionary(locale);
        setDictionary(dict.settingsPage);
      }
    };
    fetchDict();
  }, [locale]);

  if (!isMounted || !dictionary) {
    // You can return a loading skeleton here if you prefer
    return null; 
  }

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0 space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">{dictionary.mainTitle || "Settings"}</h1>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>{dictionary.appearance.title || "Appearance"}</CardTitle>
          <CardDescription>{dictionary.appearance.description || "Customize the look and feel of the application."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              {theme === 'dark' ? <MoonIcon className="h-5 w-5 text-muted-foreground" /> : <SunIcon className="h-5 w-5 text-muted-foreground" />}
              <Label htmlFor="theme-toggle" className="text-base">
                {theme === 'dark' ? (dictionary.appearance.darkMode || "Dark Mode") : (dictionary.appearance.lightMode || "Light Mode")}
              </Label>
            </div>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeChange}
              aria-label="Toggle theme"
            />
          </div>
          {/* Add a system theme option later if desired */}
        </CardContent>
      </Card>
      {/* Other settings sections can be added here */}
    </div>
  );
}
