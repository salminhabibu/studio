// src/app/page.tsx
import { redirect } from 'next/navigation';
import { i18n } from '@/config/i18n.config';

export default function RootPage() {
  redirect(`/${i18n.defaultLocale}/home`);
  // This return is technically unreachable due to redirect, but good practice.
  return null; 
}
