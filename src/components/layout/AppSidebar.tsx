// src/components/layout/AppSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { 
  HomeIcon, 
  FilmIcon, 
  Tv2Icon, 
  DownloadCloudIcon, 
  SettingsIcon, 
  ClapperboardIcon,
  PanelLeftCloseIcon, 
  PanelRightCloseIcon,
  InfoIcon,
  YoutubeIcon,
  LanguagesIcon,
  Loader2Icon // Added Loader2Icon for loading state
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/getDictionary";
import type { Locale } from "@/config/i18n.config";
import GlobalSearch from "@/components/features/search/GlobalSearch"; // Import GlobalSearch

const navItemsConfig = [
  { href: "/home", labelKey: "sidebar.home", icon: HomeIcon, defaultLabel: "Home" },
  { href: "/youtube-downloader", labelKey: "sidebar.youtubeDownloader", icon: YoutubeIcon, defaultLabel: "YouTube Downloader" },
  { href: "/movies", labelKey: "sidebar.movies", icon: FilmIcon, defaultLabel: "Movies" },
  { href: "/tv-series", labelKey: "sidebar.tvSeries", icon: Tv2Icon, defaultLabel: "TV Series" },
  { href: "/downloads", labelKey: "sidebar.downloads", icon: DownloadCloudIcon, defaultLabel: "Downloads" },
  { href: "/settings", labelKey: "sidebar.settings", icon: SettingsIcon, defaultLabel: "Settings" },
  { href: "/about", labelKey: "sidebar.about", icon: InfoIcon, defaultLabel: "About" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open, setOpen, isMobile } = useSidebar();
  const [sidebarDictionary, setSidebarDictionary] = useState<any>(null);
  const [isLoadingDictionary, setIsLoadingDictionary] = useState(true);

  const currentLocale = (pathname.split('/')[1] || 'en') as Locale;

  useEffect(() => {
    const fetchDict = async () => {
      setIsLoadingDictionary(true);
      try {
        const dict = await getDictionary(currentLocale);
        setSidebarDictionary(dict.sidebar);
      } catch (error) {
        console.error("Failed to load sidebar dictionary:", error);
        // Fallback to default labels if dictionary fails for sidebar specifically
        const fallbackDict: any = {};
        navItemsConfig.forEach(item => fallbackDict[item.labelKey.split('.')[1]] = item.defaultLabel);
        fallbackDict['language'] = "Language";
        fallbackDict['english'] = "English";
        fallbackDict['swahili'] = "Swahili";
        fallbackDict['collapse'] = "Collapse";
        fallbackDict['expand'] = "Expand";
        setSidebarDictionary(fallbackDict);
      } finally {
        setIsLoadingDictionary(false);
      }
    };
    fetchDict();
  }, [currentLocale]);

  const handleToggle = () => {
    if (!isMobile) {
      setOpen(!open);
    }
  };
  
  let ToggleIcon: LucideIcon;
  if (open) {
    ToggleIcon = PanelLeftCloseIcon;
  } else {
    ToggleIcon = PanelRightCloseIcon;
  }

  const t = (keySuffix: string, defaultText: string) => {
    if (isLoadingDictionary || !sidebarDictionary) return defaultText; // Show default or loading indicator
    return sidebarDictionary[keySuffix] || defaultText;
  };

  const handleLanguageChange = (newLocale: string) => {
    const currentPathSegments = pathname.split('/');
    currentPathSegments[1] = newLocale; 
    
    const pagePathSegments = currentPathSegments.slice(2);
    let pagePath = pagePathSegments.join('/');
    if (pagePathSegments.length === 0 || (pagePathSegments.length === 1 && pagePathSegments[0] === '')) {
      pagePath = 'home'; // Default to home if no specific page path after locale
    }

    const newPath = `/${newLocale}/${pagePath}`;
    window.location.href = newPath; 
  };

  if (isLoadingDictionary && !sidebarDictionary) {
    return (
      <Sidebar 
        collapsible={isMobile ? "offcanvas" : "icon"} 
        className={cn(
          "border-r-0 shadow-xl bg-sidebar text-sidebar-foreground", 
          "transition-all duration-300 ease-in-out flex flex-col items-center justify-center"
        )}
        style={{ width: open && !isMobile ? 'var(--sidebar-width)' : 'var(--sidebar-width-icon)'}}
      >
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
      </Sidebar>
    );
  }


  return (
    <Sidebar 
      collapsible={isMobile ? "offcanvas" : "icon"} 
      className={cn(
        "border-r-0 shadow-xl bg-sidebar text-sidebar-foreground", 
        "transition-all duration-300 ease-in-out" 
      )}
    >
      <SidebarHeader className="p-4 flex items-center h-20 border-b border-sidebar-border">
        <Link href={`/${currentLocale}/home`} className="flex items-center gap-3 overflow-hidden" aria-label="ChillyMovies Home">
          <ClapperboardIcon className="h-8 w-8 text-primary flex-shrink-0" />
          <h1 className="text-2xl font-semibold text-foreground whitespace-nowrap overflow-hidden">
            <span className="transition-opacity duration-300 group-data-[collapsible=icon]:hidden">
              ChillyMovies
            </span>
          </h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-3 mt-4 flex-grow">
        <div className="mb-4 px-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
          <GlobalSearch />
        </div>
        <SidebarMenu>
          {navItemsConfig.map((item) => {
            const baseHref = item.href;
            const localizedHref = `/${currentLocale}${baseHref}`;
            const isActive = pathname === localizedHref || (baseHref !== "/home" && pathname.startsWith(localizedHref) && pathname.length > localizedHref.length);

            return (
              <SidebarMenuItem key={item.labelKey} className="mb-1">
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{ children: t(item.labelKey.split('.')[1], item.defaultLabel), side: "right", align: "center" }}
                  className={cn(
                    "justify-start h-11 rounded-lg text-sm",
                    "focus-visible:ring-sidebar-ring focus-visible:ring-offset-0 focus-visible:ring-offset-sidebar-background"
                  )}
                >
                  <Link href={localizedHref} className="flex items-center gap-3 px-3">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{t(item.labelKey.split('.')[1], item.defaultLabel)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border space-y-2">
        {!isMobile && (
          <Button 
            variant="ghost" 
            onClick={handleToggle} 
            className="w-full justify-start group-data-[collapsible=icon]:justify-center h-11 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={open ? t('collapse', 'Collapse') : t('expand', 'Expand')}
          >
            <ToggleIcon className="h-5 w-5 flex-shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden ml-3">{open ? t('collapse', 'Collapse') : t('expand', 'Expand')}</span>
          </Button>
        )}
        <div className={cn(
          "flex items-center gap-2 pt-1",
          open || isMobile ? "justify-start" : "justify-center group-data-[collapsible=icon]:py-2"
        )}>
          <LanguagesIcon className="h-5 w-5 text-sidebar-foreground flex-shrink-0" 
            title={t('language', 'Language')}
          />
          <div className={cn("flex-grow", open || isMobile ? "block" : "group-data-[collapsible=icon]:hidden")}>
            <Select 
              defaultValue={currentLocale} 
              onValueChange={(value) => handleLanguageChange(value)}
            >
              <SelectTrigger 
                className="h-9 text-xs w-full bg-sidebar-background border-sidebar-border/50 hover:border-sidebar-border focus:ring-sidebar-ring focus:ring-1 focus:ring-offset-0"
                aria-label={t('language', 'Language')}
              >
                <SelectValue placeholder={t('language', 'Language')} />
              </SelectTrigger>
              <SelectContent side="top" align="start">
                <SelectItem value="en">{t('english', 'English')}</SelectItem>
                <SelectItem value="sw">{t('swahili', 'Swahili')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}