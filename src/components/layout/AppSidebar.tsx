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
  InfoIcon // Added for About page
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home & Search", icon: HomeIcon },
  { href: "/movies", label: "Movies", icon: FilmIcon },
  { href: "/tv-series", label: "TV Series", icon: Tv2Icon },
  { href: "/downloads", label: "Downloads", icon: DownloadCloudIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  { href: "/about", label: "About", icon: InfoIcon }, // Added About page
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open, setOpen, isMobile } = useSidebar();

  const handleToggle = () => {
    if (!isMobile) {
      setOpen(!open);
    }
    // Mobile toggle is handled by Sheet behavior in Sidebar component
  };
  
  let ToggleIcon: LucideIcon;
  if (open) {
    ToggleIcon = PanelLeftCloseIcon;
  } else {
    ToggleIcon = PanelRightCloseIcon;
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
        <Link href="/home" className="flex items-center gap-3 overflow-hidden" aria-label="ChillyMovies Home">
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
            const isActive = pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));
            return (
              <SidebarMenuItem key={item.label} className="mb-1">
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{ children: item.label, side: "right", align: "center" }}
                  className={cn(
                    "justify-start h-11 rounded-lg text-sm",
                    "focus-visible:ring-sidebar-ring focus-visible:ring-offset-0 focus-visible:ring-offset-sidebar-background"
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-3 px-3">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!isMobile && (
          <Button 
            variant="ghost" 
            onClick={handleToggle} 
            className="w-full justify-start group-data-[collapsible=icon]:justify-center h-11 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ToggleIcon className="h-5 w-5 flex-shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden ml-3">{open ? "Collapse" : "Expand"}</span>
          </Button>
        )}
        {/* Removed GitHub link button */}
      </SidebarFooter>
    </Sidebar>
  );
}
