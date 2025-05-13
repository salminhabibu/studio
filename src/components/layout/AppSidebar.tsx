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
  LanguagesIcon // Added LanguagesIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select components

const navItems = [
  { href: "/home", label: "Home", icon: HomeIcon, langKey: "sidebar.home" },
  { href: "/youtube-downloader", label: "YouTube Downloader", icon: YoutubeIcon, langKey: "sidebar.youtubeDownloader" },
  { href: "/movies", label: "Movies", icon: FilmIcon, langKey: "sidebar.movies" },
  { href: "/tv-series", label: "TV Series", icon: Tv2Icon, langKey: "sidebar.tvSeries" },
  { href: "/downloads", label: "Downloads", icon: DownloadCloudIcon, langKey: "sidebar.downloads" },
  { href: "/settings", label: "Settings", icon: SettingsIcon, langKey: "sidebar.settings" },
  { href: "/about", label: "About", icon: InfoIcon, langKey: "sidebar.about" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open, setOpen, isMobile } = useSidebar();

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

  // Placeholder for locale and dictionary
  const currentLocale = pathname.split('/')[1] || 'en';
  const t = (key: string) => {
    // In a real app, this would use a proper i18n library
    // For design purposes, we'll map based on current navItems or return key
    const item = navItems.find(nav => nav.langKey === key);
    if (item) return item.label; // Fallback to English label for design
    if (key === 'sidebar.language') return "Language";
    if (key === 'sidebar.english') return "English";
    if (key === 'sidebar.swahili') return "Kiswahili";
    if (key === 'sidebar.collapse') return "Collapse";
    if (key === 'sidebar.expand') return "Expand";
    return key;
  };


  const handleLanguageChange = (newLocale: string) => {
    // Functionality to change language (e.g., redirect) will be implemented later.
    // For now, it's just for design.
    const currentPathSegments = pathname.split('/');
    // If the first segment is a known locale, replace it. Otherwise, prepend.
    if (navItems.some(item => currentPathSegments[1] === item.href.split('/')[1]) || ['en', 'sw'].includes(currentPathSegments[1])) {
         currentPathSegments[1] = newLocale;
    } else {
        currentPathSegments.splice(1,0, newLocale);
    }
    const newPath = currentPathSegments.join('/') || `/${newLocale}/home`;
    // window.location.href = newPath; // This would trigger full page reload and locale change
    console.log(`Language change design: Target path ${newPath}`);
  };


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
        <SidebarMenu>
          {navItems.map((item) => {
            // Adjust isActive check for locale
            const baseHref = item.href; // e.g., /home
            const localizedHref = `/${currentLocale}${baseHref}`;
            const isActive = pathname === localizedHref || (baseHref !== "/home" && pathname.startsWith(localizedHref));
            return (
              <SidebarMenuItem key={item.label} className="mb-1">
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{ children: t(item.langKey), side: "right", align: "center" }}
                  className={cn(
                    "justify-start h-11 rounded-lg text-sm",
                    "focus-visible:ring-sidebar-ring focus-visible:ring-offset-0 focus-visible:ring-offset-sidebar-background"
                  )}
                >
                  <Link href={localizedHref} className="flex items-center gap-3 px-3">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{t(item.langKey)}</span>
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
            aria-label={open ? t('sidebar.collapse') : t('sidebar.expand')}
          >
            <ToggleIcon className="h-5 w-5 flex-shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden ml-3">{open ? t('sidebar.collapse') : t('sidebar.expand')}</span>
          </Button>
        )}
        {/* Language Switcher */}
        <div className={cn(
          "flex items-center gap-2 pt-1",
          open || isMobile ? "justify-start" : "justify-center group-data-[collapsible=icon]:py-2" // Adjust padding for icon only state
        )}>
          <LanguagesIcon className="h-5 w-5 text-sidebar-foreground flex-shrink-0" 
            title={t('sidebar.language')}
          />
          <div className={cn("flex-grow", open || isMobile ? "block" : "group-data-[collapsible=icon]:hidden")}>
            <Select 
              defaultValue={currentLocale} 
              onValueChange={(value) => handleLanguageChange(value)}
            >
              <SelectTrigger 
                className="h-9 text-xs w-full bg-sidebar-background border-sidebar-border/50 hover:border-sidebar-border focus:ring-sidebar-ring focus:ring-1 focus:ring-offset-0"
                aria-label={t('sidebar.language')}
              >
                <SelectValue placeholder={t('sidebar.language')} />
              </SelectTrigger>
              <SelectContent side="top" align="start">
                <SelectItem value="en">{t('sidebar.english')}</SelectItem>
                <SelectItem value="sw">{t('sidebar.swahili')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

