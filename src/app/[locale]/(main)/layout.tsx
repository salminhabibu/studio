// src/app/[locale]/(main)/layout.tsx
"use client"; 

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button"; // Import Button
import { ClapperboardIcon, ArrowLeftIcon } from "lucide-react"; // Import ArrowLeftIcon
import { usePathname, useRouter } from "next/navigation"; // Import useRouter
import { WebTorrentProvider } from "@/contexts/WebTorrentContext";
import { DownloadProvider } from '@/contexts/DownloadContext'; // New import
import type { Locale } from "@/config/i18n.config";
import { useEffect, useState, use } from "react";
import { getDictionary } from "@/lib/getDictionary";

interface MainLayoutProps {
  children: React.ReactNode;
  params: { locale: Locale }; 
}

export default function MainLayout({
  children,
  params, 
}: MainLayoutProps) {
  const pathname = usePathname(); 
  const router = useRouter(); // Initialize router
  const locale = params.locale; 

  const [dictionary, setDictionary] = useState<any>(null);

  useEffect(() => {
    const fetchDict = async () => {
      if (locale) {
        try {
          const dict = await getDictionary(locale);
          setDictionary(dict.mainLayout); 
        } catch (error) {
          console.error("Failed to load mainLayout dictionary:", error);
          // Fallback for critical UI elements if dictionary fails
          setDictionary({ backButtonLabel: "Go back" });
        }
      }
    };
    fetchDict();
  }, [locale]);
  
  return (
    <WebTorrentProvider>
      <DownloadProvider> {/* Add DownloadProvider here */}
        <SidebarProvider defaultOpen={true}>
          <div className="flex min-h-screen bg-background">
            <AppSidebar />
            <SidebarInset className="flex-1 flex flex-col overflow-hidden">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-2 sm:gap-3 border-b border-border/60 bg-background/95 backdrop-blur-md px-3 sm:px-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    aria-label={dictionary?.backButtonLabel || "Go back"}
                    className="text-foreground hover:bg-accent/80 hover:text-accent-foreground flex-shrink-0"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </Button>
                  <SidebarTrigger className="md:hidden flex-shrink-0" />
                  
                  <div className="flex items-center gap-2 overflow-hidden flex-shrink-0">
                    <ClapperboardIcon className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-semibold text-foreground hidden sm:block truncate">ChillyMovies</h1>
                  </div>
                </header>
                <ScrollArea className="flex-1 w-full scrollbar-thin">
                  <div
                    key={pathname}
                    className="animate-page-content-load p-4 sm:p-6 md:p-8 lg:p-10 w-full"
                  >
                    {children}
                  </div>
                </ScrollArea>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </DownloadProvider> {/* Close DownloadProvider here */}
    </WebTorrentProvider>
  );
}
