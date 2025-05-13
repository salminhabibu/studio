// src/lib/getDictionary.ts
import type { Locale } from '@/config/i18n.config';

// We define a type for our dictionary structure for better type safety.
// You can expand this as your application grows.
export interface Dictionary {
  [key: string]: any; // Allow nested structure
}

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  sw: () => import('@/dictionaries/sw.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const loadDictionary = dictionaries[locale] || dictionaries.en; // Fallback to 'en'
  try {
    return await loadDictionary();
  } catch (error) {
    console.error(`Error loading dictionary for locale "${locale}":`, error);
    // Fallback to English dictionary in case of an error with a specific locale
    if (locale !== 'en') {
      console.warn('Falling back to English dictionary.');
      return await dictionaries.en();
    }
    // If English dictionary itself fails, throw error or return empty object
    throw new Error(`Failed to load critical dictionary for locale "${locale}"`);
    // Or return {}; 
  }
};
