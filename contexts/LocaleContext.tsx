import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Locale, getLocale, setLocale as setI18nLocale } from '@/lib/i18n';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);
const LOCALE_STORAGE_KEY = 'cepte_cari_locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  useEffect(() => {
    let mounted = true;

    const loadLocale = async () => {
      try {
        const storedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (mounted && (storedLocale === 'tr' || storedLocale === 'en')) {
          setI18nLocale(storedLocale);
          setLocaleState(storedLocale);
        }
      } catch {
        // Fall back to Turkish when storage is unavailable.
      }
    };

    void loadLocale();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (nextLocale: Locale) => {
        setI18nLocale(nextLocale);
        setLocaleState(nextLocale);
        void AsyncStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      },
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }

  return context;
};
