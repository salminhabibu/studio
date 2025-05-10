// src/app/(main)/about/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LightbulbIcon, ListChecksIcon, RocketIcon, InfoIcon, BookOpenIcon, UsersIcon } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <InfoIcon className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold tracking-tight">About ChillyMovies</h1>
        <p className="text-xl text-muted-foreground mt-2">Your premium gateway to movies and TV series.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LightbulbIcon className="h-6 w-6 text-accent" /> Our Mission & Story</CardTitle>
        </CardHeader>
        <CardContent className="text-foreground/80 space-y-3">
          <p>
            Welcome to ChillyMovies! Our mission is to provide a seamless, elegant, and powerful platform for discovering, managing, and enjoying your favorite movies and TV series. 
            We believe that accessing entertainment should be straightforward and enjoyable, without compromising on quality or features.
          </p>
          <p>
            ChillyMovies was born from a passion for cinema and technology, aiming to create an application that not only looks great but also offers robust functionality for media enthusiasts. 
            Whether you&apos;re looking to download content for offline viewing or manage your watch-list, ChillyMovies is designed to be your go-to companion.
          </p>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecksIcon className="h-6 w-6 text-accent" /> Key Features</CardTitle>
          <CardDescription>Discover what ChillyMovies has to offer.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-3 text-foreground/80">
            <li><strong>Vast Content Library:</strong> Explore a rich collection of movies and TV series powered by The Movie Database (TMDB).</li>
            <li><strong>Live Search:</strong> Instantly find titles, actors, or genres with our responsive live search functionality.</li>
            <li><strong>YouTube Downloader:</strong> Download videos directly from YouTube with options for video quality and audio-only formats. Includes live preview.</li>
            <li><strong>Movie & TV Series Downloads:</strong> Download movies and TV episodes with quality selection using WebTorrent technology.</li>
            <li><strong>Comprehensive Download Management:</strong> Keep track of active downloads and view your download history, all within the app.</li>
            <li><strong>Detailed Information:</strong> Access in-depth details for movies and TV series, including trailers, cast, overviews, and production information.</li>
            <li><strong>Customizable Appearance:</strong> Personalize your ChillyMovies experience with adjustable primary and highlight accent colors.</li>
            <li><strong>Responsive Design:</strong> Enjoy a seamless experience across various desktop resolutions.</li>
            <li><strong>Modern Interface:</strong> A clean, intuitive, and premium-looking dark theme designed for usability and aesthetic appeal.</li>
          </ul>
        </CardContent>
      </Card>
      
      <Separator />

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpenIcon className="h-6 w-6 text-accent" /> Getting Started</CardTitle>
          <CardDescription>A quick guide to using ChillyMovies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-foreground/80">
          <div>
            <h4 className="font-semibold text-lg mb-1">1. Discover Content:</h4>
            <p>Use the "Home & Search" page to find movies or TV series. The live search bar provides instant results as you type. You can also browse popular movies and TV series directly from their respective sections.</p>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-1">2. Download from YouTube:</h4>
            <p>On the "Home & Search" page, paste a YouTube URL into the dedicated section. Fetch info to see a preview and select your desired video or audio quality before downloading.</p>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-1">3. Download Movies & TV Series:</h4>
            <p>Navigate to a movie or TV series detail page. For movies, select your preferred quality and click download. For TV series, browse seasons and episodes, and choose to download individual episodes or entire seasons.</p>
          </div>
           <div>
            <h4 className="font-semibold text-lg mb-1">4. Manage Downloads:</h4>
            <p>Visit the "Downloads" page to see your active downloads and completed/failed items in the history. You can pause, resume, or remove downloads.</p>
          </div>
           <div>
            <h4 className="font-semibold text-lg mb-1">5. Customize Your Experience:</h4>
            <p>Go to "Settings" to change the app&apos;s accent colors and manage other preferences like download quality.</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RocketIcon className="h-6 w-6 text-accent" /> Version & What&apos;s Next</CardTitle>
        </CardHeader>
        <CardContent className="text-foreground/80 space-y-3">
          <p><strong>Current Version:</strong> 1.0.0 (Chilly Premiere)</p>
          <p>
            <strong>Roadmap:</strong> We are continuously working to enhance ChillyMovies. Future updates may include:
          </p>
          <ul className="list-disc list-inside ml-4">
            <li>Advanced filtering and sorting options.</li>
            <li>User accounts and personalized watchlists.</li>
            <li>Expanded download source options.</li>
            <li>Further performance optimizations and UI refinements.</li>
          </ul>
          <p>Stay tuned for more exciting features!</p>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UsersIcon className="h-6 w-6 text-accent" /> Technologies & Attributions</CardTitle>
        </CardHeader>
        <CardContent className="text-foreground/80 space-y-3">
          <p>ChillyMovies is built with modern web technologies, including:</p>
          <ul className="list-disc list-inside ml-4">
            <li><strong>Framework:</strong> Next.js (React)</li>
            <li><strong>Styling:</strong> Tailwind CSS, ShadCN UI</li>
            <li><strong>Icons:</strong> Lucide React</li>
            <li><strong>Video Downloads:</strong> WebTorrent, ytdl-core</li>
            <li><strong>Movie & TV Data:</strong> The Movie Database (TMDB) API</li>
            <li><strong>Torrent Search:</strong> Torrent Search API (for TV episodes)</li>
          </ul>
          <p className="mt-4">
            We extend our gratitude to the developers and communities behind these fantastic tools and services that make ChillyMovies possible.
            All movie and TV series data, including posters and backdrops, are provided by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">TMDB</a>. Please support them.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
