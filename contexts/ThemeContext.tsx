import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, ThemeMode, themes } from '@/lib/theme';

interface ThemeContextType {
  mode: ThemeMode;
  theme: AppTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_MODE_STORAGE_KEY = 'cepte_cari_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [manualMode, setManualMode] = useState<ThemeMode>('light');

  useEffect(() => {
    let mounted = true;

    const loadThemeMode = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);
        if (mounted && (storedMode === 'light' || storedMode === 'dark')) {
          setManualMode(storedMode);
        }
      } catch {
        // Fall back to default light mode when storage is unavailable.
      }
    };

    void loadThemeMode();

    return () => {
      mounted = false;
    };
  }, []);

  const mode = manualMode;
  const theme = useMemo(() => themes[mode], [mode]);

  const value = useMemo(
    () => ({
      mode,
      theme,
      toggleTheme: () =>
        setManualMode((current) => {
          const nextMode = current === 'dark' ? 'light' : 'dark';
          void AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, nextMode);
          return nextMode;
        }),
    }),
    [mode, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }

  return context;
};
