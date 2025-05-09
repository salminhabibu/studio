// src/app/(main)/layout.tsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

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
            {/* Optional: Header within the main content area, could include breadcrumbs or SidebarTrigger for mobile */}
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6 md:hidden">
              {/* Mobile sidebar trigger - uses Sheet */}
              <SidebarTrigger className="md:hidden" /> 
              <h1 className="text-lg font-semibold">ChillyMovies</h1>
            </header>
            <ScrollArea className="flex-1 p-4 md:p-6 lg:p-8">
              {children}
            </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
