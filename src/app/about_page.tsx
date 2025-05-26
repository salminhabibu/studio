// Intended for src/app/[locale]/(main)/about/page.tsx
// Worker will create at src/app/about_page.tsx
'use client';

import React, { useState, useEffect, use } from 'react';
import type { Locale } from '@/config/i18n.config';
import { getDictionary } from '@/lib/getDictionary';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'; // CardDescription removed as not used in example for all cards
import { Separator } from '@/components/ui/separator';
import { InfoIcon, CodeIcon, ZapIcon, LifeBuoyIcon, UsersIcon } from 'lucide-react'; // Removed DatabaseZapIcon as it wasn't used in final example

interface AboutPageProps {
  // Assuming params will be available even if not in the [locale] path for now
  // This might need adjustment depending on how routing/locale is handled for this temporary path
  params: Promise<{ locale?: Locale }>; 
}

const APP_VERSION = "1.0.0"; // Hardcode version for now

export default function AboutPage(props: AboutPageProps) {
  const resolvedParams = use(props.params);
  // Default to 'en' if locale is not in params or if resolvedParams is undefined
  const locale = resolvedParams?.locale || 'en'; 
  const [dictionary, setDictionary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDict = async () => {
      setIsLoading(true);
      try {
        const dict = await getDictionary(locale);
        setDictionary(dict.aboutPage);
      } catch (error) {
        console.error("Error fetching dictionary for About Page:", error);
        // Fallback to a very basic dictionary structure or handle error appropriately
        setDictionary({
          mainTitle: "About Chilly Movies",
          description: { title: "What is Chilly Movies?", text: "Error loading description." },
          version: { title: "Version", prefix: "Current Version" },
          acknowledgements: { title: "Acknowledgements" }
        });
      }
      setIsLoading(false);
    };
    fetchDict();
  }, [locale]);

  if (isLoading || !dictionary) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <InfoIcon className="h-12 w-12 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0 space-y-10">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center">
          <LifeBuoyIcon className="h-10 w-10 mr-3" />
          {dictionary.mainTitle || "About Chilly Movies"}
        </h1>
      </header>

      <Card className="max-w-3xl mx-auto shadow-xl border-border/40">
        <CardHeader className="items-center">
          <InfoIcon className="h-12 w-12 text-accent mb-2" />
          <CardTitle className="text-2xl">{dictionary.description?.title || "What is Chilly Movies?"}</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-lg text-foreground/80 leading-relaxed px-6 pb-6">
          <p>{dictionary.description?.text || "Chilly Movies is your ultimate companion for discovering, tracking, and downloading your favorite movies and TV series. Enjoy a seamless experience with integrated download capabilities and smart features."}</p>
        </CardContent>
      </Card>
      
      <Separator className="my-8 max-w-3xl mx-auto" />

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="shadow-lg border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center"><ZapIcon className="h-6 w-6 mr-2 text-primary"/>{dictionary.version?.title || "Version"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{dictionary.version?.prefix || "Current Version"}: {APP_VERSION}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center"><CodeIcon className="h-6 w-6 mr-2 text-primary"/>{dictionary.acknowledgements?.title || "Acknowledgements"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p><span className="font-semibold text-foreground">{dictionary.acknowledgements?.poweredByTMDB || "Movie & TV Data:"}</span> The Movie Database (TMDB) API</p>
            <p><span className="font-semibold text-foreground">{dictionary.acknowledgements?.aiFeaturesByGenkit || "AI Features:"}</span> Google Genkit</p>
            <p><span className="font-semibold text-foreground">{dictionary.acknowledgements?.builtWith || "Framework & UI:"}</span> Next.js, Tailwind CSS, Shadcn/UI</p>
            <p><span className="font-semibold text-foreground">{dictionary.acknowledgements?.downloadManagement || "Download Core:"}</span> Aria2</p>
          </CardContent>
        </Card>
      </div>
      
      {dictionary.contact && (
        <>
          <Separator className="my-8 max-w-3xl mx-auto" />
          <Card className="max-w-3xl mx-auto shadow-xl border-border/40">
            <CardHeader className="items-center">
              <UsersIcon className="h-10 w-10 text-accent mb-2" />
              <CardTitle className="text-2xl">{dictionary.contact.title || "Feedback & Contact"}</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-lg text-foreground/80">
              <p>{dictionary.contact.text || "For feedback or issues, please reach out via our community forum or support email."}</p>
              {/* You could add an actual email link here if desired */}
              {/* <a href="mailto:feedback@chillymovies.example" className="text-primary hover:underline">feedback@chillymovies.example</a> */}
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}
