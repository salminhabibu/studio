// src/app/(main)/layout.tsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SparklesIcon } from "lucide-react"; // Added for consistency if ChillyMovies text removed

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}> {/* Desktop first, sidebar open by default */}
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border/60 bg-background/90 backdrop-blur-md px-4 md:hidden">
              <SidebarTrigger className="md:hidden" /> 
              <SparklesIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">ChillyMovies</h1>
            </header>
            <ScrollArea className="flex-1 p-6 md:p-8 lg:p-10"> {/* Increased padding */}
              {children}
            </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
