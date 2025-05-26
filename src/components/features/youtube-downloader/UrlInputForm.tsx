// src/components/features/youtube-downloader/UrlInputForm.tsx
"use client";

import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Assuming YouTubeUrlFormValues is defined in the parent and form is of this type
interface YouTubeUrlFormValues {
  url: string;
}

interface UrlInputFormProps {
  form: UseFormReturn<YouTubeUrlFormValues>; // Use the specific form type
  isLoadingInfo: boolean;
  onSearchSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>; // Adjusted for handleSubmit
  dictionary: any; // Consider more specific type if possible
  currentUrl: string; // To disable button if url is empty
}

export function UrlInputForm({
  form,
  isLoadingInfo,
  onSearchSubmit,
  dictionary,
  currentUrl,
}: UrlInputFormProps) {
  return (
    <Card className="shadow-xl border-border/50 max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">{dictionary.inputCardTitle}</CardTitle>
        <CardDescription>{dictionary.inputCardDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSearchSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">{dictionary.urlInputLabel}</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder={dictionary.urlInputPlaceholder} {...field} className="h-12 text-base flex-grow" />
                    </FormControl>
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="h-12 px-5" 
                      disabled={isLoadingInfo || !form.formState.isValid || !currentUrl.trim()}
                    >
                      {isLoadingInfo ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <SearchIcon className="h-5 w-5" />}
                      <span className="ml-2 hidden sm:inline">{dictionary.fetchInfoButton}</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
