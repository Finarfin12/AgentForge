'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from '@/lib/api';
import { translate, supportedLangs } from '@/lib/i18n';

interface LocaleContextType {
  lang: string;
  t: (key: string, fallback?: string) => string;
  refreshLanguage: () => Promise<void>;
}

const LocaleContext = createContext<LocaleContextType>({
  lang: 'en', t: (k) => k,
  refreshLanguage: async () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState('en');

  const loadLang = useCallback(async () => {
    try {
      const s = await api.settings.getKey('language') as any;
      const v = s?.value;
      if (v && supportedLangs.includes(v)) setLang(v);
    } catch {}
  }, []);

  useEffect(() => { loadLang(); }, [loadLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string, fallback?: string) => translate(lang, key, fallback);

  return (
    <LocaleContext.Provider value={{ lang, t, refreshLanguage: loadLang }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
