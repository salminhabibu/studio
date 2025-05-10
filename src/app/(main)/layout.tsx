// src/app/(main)/layout.tsx
"use client"; // Required for usePathname and WebTorrentProvider

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClapperboardIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { WebTorrentProvider } from "@/contexts/WebTorrentContext"; // Import the provider

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <WebTorrentProvider> { /* Wrap with WebTorrentProvider */}
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col overflow-hidden">
              <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/90 backdrop-blur-md px-4 md:hidden">
                <SidebarTrigger className="md:hidden" /> 
                <ClapperboardIcon className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">ChillyMovies</h1>
              </header>
              <ScrollArea className="flex-1">
                <div 
                  key={pathname}
                  className="animate-page-content-load p-6 md:p-8 lg:p-10"
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
