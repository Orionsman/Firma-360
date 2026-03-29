export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  colors: {
    background: string;
    backgroundSecondary: string;
    surface: string;
    surfaceMuted: string;
    surfaceElevated: string;
    text: string;
    textMuted: string;
    textSoft: string;
    border: string;
    primary: string;
    primaryStrong: string;
    primarySoft: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    dangerSoft: string;
    shadow: string;
  };
};

export const themes: Record<ThemeMode, AppTheme> = {
  light: {
    mode: 'light',
    colors: {
      background: '#F5F7FF',
      backgroundSecondary: '#EEF2FF',
      surface: '#FFFFFF',
      surfaceMuted: '#F2F6FF',
      surfaceElevated: '#FCFDFF',
      text: '#16203B',
      textMuted: '#5B6785',
      textSoft: '#8993AD',
      border: '#D7DDF2',
      primary: '#1967FF',
      primaryStrong: '#6B3DF6',
      primarySoft: '#E8ECFF',
      accent: '#23D5E8',
      success: '#1FBF75',
      warning: '#FFB84D',
      danger: '#C95C54',
      dangerSoft: '#F7E3E1',
      shadow: 'rgba(23, 33, 74, 0.14)',
    },
  },
  dark: {
    mode: 'dark',
    colors: {
      background: '#120A2E',
      backgroundSecondary: '#1A0D45',
      surface: '#1D1440',
      surfaceMuted: '#251A52',
      surfaceElevated: '#2B2060',
      text: '#F4F7FF',
      textMuted: '#CDD6F7',
      textSoft: '#9FAAD3',
      border: '#3B2E76',
      primary: '#35C5FF',
      primaryStrong: '#8A4DFF',
      primarySoft: '#2B1E60',
      accent: '#22E4D6',
      success: '#3DDC97',
      warning: '#FFC65A',
      danger: '#FF8B94',
      dangerSoft: '#432241',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
};
