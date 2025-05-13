// src/app/[locale]/(main)/about/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LightbulbIcon, ListChecksIcon, RocketIcon, InfoIcon, BookOpenIcon, UsersIcon, GlobeIcon } from "lucide-react";
import { getDictionary } from "@/lib/getDictionary";
import type { Locale } from "@/config/i18n.config";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Suspense } from "react";

interface AboutPageProps {
  params: { locale: Locale };
}

async function AboutContent({ locale }: { locale: Locale }) {
  const dictionary = await getDictionary(locale);
  const t = dictionary.aboutPage;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <InfoIcon className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold tracking-tight">{t.mainTitle}</h1>
        <p className="text-xl text-muted-foreground mt-2">{t.mainSubtitle}</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LightbulbIcon className="h-6 w-6 text-accent" /> {t.missionStory.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-foreground/80 space-y-3">
          <p>{t.missionStory.p1}</p>
          <p>{t.missionStory.p2}</p>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecksIcon className="h-6 w-6 text-accent" /> {t.keyFeatures.title}</CardTitle>
          <CardDescription>{t.keyFeatures.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-3 text-foreground/80">
            {t.keyFeatures.featuresList.map((feature: string, index: number) => (
              <li key={index} dangerouslySetInnerHTML={{ __html: feature }}></li>
            ))}
          </ul>
        </CardContent>
      </Card>
      
      <Separator />

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpenIcon className="h-6 w-6 text-accent" /> {t.gettingStarted.title}</CardTitle>
          <CardDescription>{t.gettingStarted.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-foreground/80">
          {t.gettingStarted.steps.map((step: {title: string, content: string}, index: number) => (
             <div key={index}>
                <h4 className="font-semibold text-lg mb-1">{index + 1}. {step.title}</h4>
                <p>{step.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RocketIcon className="h-6 w-6 text-accent" /> {t.versionNext.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-foreground/80 space-y-3">
          <p><strong>{t.versionNext.currentVersionLabel}:</strong> {t.versionNext.currentVersion}</p>
          <p><strong>{t.versionNext.roadmapLabel}:</strong> {t.versionNext.roadmapP1}</p>
          <ul className="list-disc list-inside ml-4">
            {t.versionNext.roadmapItems.map((item: string, index: number) => (
                <li key={index}>{item}</li>
            ))}
          </ul>
          <p>{t.versionNext.stayTuned}</p>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UsersIcon className="h-6 w-6 text-accent" /> {t.techAttributions.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-foreground/80 space-y-3">
          <p>{t.techAttributions.intro}</p>
          <ul className="list-disc list-inside ml-4">
             {t.techAttributions.techList.map((tech: {item: string, value: string}, index: number) => (
                <li key={index}><strong>{tech.item}:</strong> {tech.value}</li>
            ))}
          </ul>
          <p className="mt-4" dangerouslySetInnerHTML={{ __html: t.techAttributions.outro }} />
        </CardContent>
      </Card>
    </div>
  );
}

function AboutPageSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-pulse">
      <div className="text-center mb-12">
        <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
        <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
        <Skeleton className="h-6 w-1/2 mx-auto mt-1" />
      </div>
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mb-1" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


export default async function AboutPage({ params: { locale } }: AboutPageProps) {
  return (
    <Suspense fallback={<AboutPageSkeleton />}>
      <AboutContent locale={locale} />
    </Suspense>
  );
}
