// src/config/i18n.config.ts
export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'sw'], // English and Swahili
} as const;

export type Locale = (typeof i18n)['locales'][number];
