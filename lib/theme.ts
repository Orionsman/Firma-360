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
      primaryStrong: '#1847B7',
      primarySoft: '#E7EEFF',
      accent: '#19B8A6',
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
      background: '#18181B',
      backgroundSecondary: '#1F1F23',
      surface: '#242428',
      surfaceMuted: '#2D2D33',
      surfaceElevated: '#35353D',
      text: '#F5F5F7',
      textMuted: '#C8C8CE',
      textSoft: '#8E8E98',
      border: '#3A3A43',
      primary: '#2A8CFF',
      primaryStrong: '#1D3A72',
      primarySoft: '#203A5C',
      accent: '#47C7B4',
      success: '#33C36B',
      warning: '#FFB547',
      danger: '#FF5D67',
      dangerSoft: '#3A2328',
      shadow: 'rgba(0, 0, 0, 0.38)',
    },
  },
};
