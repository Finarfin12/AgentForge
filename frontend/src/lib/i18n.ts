import en from '@/locales/en.json';
import id from '@/locales/id.json';

const locales: Record<string, Record<string, string>> = { en, id };
export const supportedLangs = Object.keys(locales);

export function translate(lang: string, key: string, fallback?: string): string {
  return locales[lang]?.[key] || locales['en']?.[key] || fallback || key;
}
