// src/app/[locale]/(main)/layout.tsx
"use client"; 

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClapperboardIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { WebTorrentProvider } from "@/contexts/WebTorrentContext"; 
import type { Locale } from "@/config/i18n.config"; 

interface MainLayoutProps {
  children: React.ReactNode;
  params: { locale: Locale }; 
}

export default function MainLayout({
  children,
  params, 
}: MainLayoutProps) {
  const pathname = usePathname(); 

  // The AppSidebar derives locale from pathname internally
  // Children pages will receive params.locale correctly from Next.js

  return (
    <WebTorrentProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen bg-background">
          <AppSidebar /> 
          <SidebarInset className="flex-1 flex flex-col overflow-hidden">
              <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/95 backdrop-blur-md px-4 md:hidden">
                <SidebarTrigger className="md:hidden" /> 
                <ClapperboardIcon className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">ChillyMovies</h1>
              </header>
              <ScrollArea className="flex-1 w-full scrollbar-thin"> {/* Added scrollbar-thin */}
                <div 
                  key={pathname} // Keyed to re-trigger animations on path change
                  className="animate-page-content-load p-4 sm:p-6 md:p-8 lg:p-10 w-full"
                >
                  {children}
                </div>
              </ScrollArea>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </WebTorrentProvider>
  );
}