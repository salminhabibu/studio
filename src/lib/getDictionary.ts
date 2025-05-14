// src/lib/getDictionary.ts
import type { Locale } from '@/config/i18n.config';
import { i18n } from '@/config/i18n.config'; // Import i18n for defaultLocale

// We define a type for our dictionary structure for better type safety.
export interface Dictionary {
  [key: string]: any; // Allow nested structure
}

// Type for the function that loads a dictionary module
type DictionaryLoader = () => Promise<{ default: Dictionary }>;

// Explicitly type the dictionaries object
const dictionaries: Record<Locale, DictionaryLoader> = {
  en: () => import('@/dictionaries/en.json') as unknown as DictionaryLoader,
  sw: () => import('@/dictionaries/sw.json') as unknown as DictionaryLoader,
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const loader = dictionaries[locale] || dictionaries[i18n.defaultLocale];
  try {
    const module = await loader();
    return module.default;
  } catch (error) {
    console.error(`Error loading dictionary for locale "${locale}":`, error);
    // Fallback to default locale dictionary in case of an error
    if (locale !== i18n.defaultLocale) {
      console.warn(`Falling back to ${i18n.defaultLocale} dictionary.`);
      try {
        const fallbackModule = await dictionaries[i18n.defaultLocale]();
        return fallbackModule.default;
      } catch (fallbackError) {
        console.error(`Error loading fallback ${i18n.defaultLocale} dictionary:`, fallbackError);
        // If default dictionary also fails, throw error or return empty object
        throw new Error(`Failed to load critical dictionary for locale "${locale}" and fallback "${i18n.defaultLocale}"`);
      }
    }
    // If default dictionary itself fails (when locale is defaultLocale)
    throw new Error(`Failed to load critical dictionary for locale "${locale}"`);
  }
};