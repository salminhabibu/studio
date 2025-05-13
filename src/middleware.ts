// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import Negotiator from 'negotiator';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import { i18n } from '@/config/i18n.config';

function getLocaleFromRequest(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages(
    i18n.locales as string[]
  );

  return matchLocale(languages, i18n.locales as string[], i18n.defaultLocale);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if there is any supported locale in the pathname
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getLocaleFromRequest(request);

    // Add the locale prefix to the path
    let newPath = `/${locale}${pathname}`;
    if (pathname === '/') {
        newPath = `/${locale}/home`; // Default to home page for root access
    }
    
    return NextResponse.redirect(
      new URL(newPath, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: [
    '/((?!api|_next/static|_next/image|images|fonts|favicon.ico|.*\\..*).*)', // Ignore files with extensions
  ],
};
