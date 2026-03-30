import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext';

function AppNavigator() {
  const { mode } = useAppTheme();
  const { locale } = useLocale();

  return (
    <>
      <Stack key={locale} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="account-deletion" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
