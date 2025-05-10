// src/app/(main)/layout.tsx
"use client"; // Required for usePathname

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClapperboardIcon } from "lucide-react"; // Changed from SparklesIcon
import { usePathname } from "next/navigation"; // Import usePathname

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // Get current pathname

  return (
    <SidebarProvider defaultOpen={true}> {/* Desktop first, sidebar open by default */}
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
            <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/90 backdrop-blur-md px-4 md:hidden">
              <SidebarTrigger className="md:hidden" /> 
              <ClapperboardIcon className="h-6 w-6 text-primary" /> {/* Changed from SparklesIcon */}
              <h1 className="text-xl font-semibold text-foreground">ChillyMovies</h1>
            </header>
            <ScrollArea className="flex-1"> {/* Removed padding from here */}
              <div 
                key={pathname} // Re-trigger animation on route change
                className="animate-page-content-load p-6 md:p-8 lg:p-10" // Added padding here and animation class
              >
                {children}
              </div>
            </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
