import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import type { Locale } from '@/config/i18n.config';
import { ThemeProvider } from '@/contexts/ThemeContext';

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['300', '400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: 'ChillyMovies Downloader',
  description: 'Download movies and TV series with a premium experience.',
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: Locale };
}

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<RootLayoutProps>) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${poppins.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
