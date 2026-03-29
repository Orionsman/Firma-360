import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { AppTheme, ThemeMode, themes } from '@/lib/theme';

interface ThemeContextType {
  mode: ThemeMode;
  theme: AppTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [manualMode, setManualMode] = useState<ThemeMode | null>(null);

  const mode = manualMode ?? (deviceScheme === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => themes[mode], [mode]);

  const value = useMemo(
    () => ({
      mode,
      theme,
      toggleTheme: () =>
        setManualMode((current) => {
          const currentMode = current ?? (deviceScheme === 'dark' ? 'dark' : 'light');
          return currentMode === 'dark' ? 'light' : 'dark';
        }),
    }),
    [deviceScheme, mode, theme]
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
