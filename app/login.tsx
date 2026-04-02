import { useState } from 'react';
import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FirmaLogo } from '@/components/FirmaLogo';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn } = useAuth();
  const { theme } = useAppTheme();

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage(t.auth.login.emailRequired);
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : t.auth.login.failed
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <LinearGradient
        colors={[theme.colors.primaryStrong, theme.colors.primary]}
        style={styles.topGlow}
      >
        <View style={styles.glowOrbPrimary} />
        <View style={styles.glowOrbSecondary} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.heroLogoShell, { backgroundColor: theme.colors.primarySoft }]}>
              <FirmaLogo size="md" showWordmark={false} />
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{t.auth.appName}</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                {t.auth.appSubtitle}
              </Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.colors.primarySoft }]}>
            <ShieldCheck size={16} color={theme.colors.primary} />
            <Text style={[styles.badgeText, { color: theme.colors.text }]}>
              {t.auth.login.secureEntry}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <Text style={[styles.formTitle, { color: theme.colors.text }]}>{t.auth.login.title}</Text>
          <Text style={[styles.formSubtitle, { color: theme.colors.textMuted }]}>
            {t.auth.login.subtitle}
          </Text>

          {!!errorMessage ? (
            <View
              style={[
                styles.messageBox,
                {
                  backgroundColor: theme.colors.dangerSoft,
                  borderColor: theme.colors.danger,
                },
              ]}
            >
              <Text style={[styles.messageText, { color: theme.colors.danger }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.email}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder={t.auth.login.emailPlaceholder}
            placeholderTextColor={theme.colors.textSoft}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.password}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder={t.auth.login.passwordPlaceholder}
            placeholderTextColor={theme.colors.textSoft}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t.auth.login.signingIn : t.auth.login.signIn}
            </Text>
            {!loading ? <ArrowRight size={18} color="#fff" /> : null}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSoft }]}>
              {t.auth.login.noAccount}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={[styles.link, { color: theme.colors.primaryStrong }]}>
                {t.auth.login.register}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    overflow: 'hidden',
  },
  glowOrbPrimary: {
    position: 'absolute',
    top: -34,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  glowOrbSecondary: {
    position: 'absolute',
    bottom: -46,
    left: -26,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(34,228,214,0.14)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heroCard: {
    marginTop: 30,
    marginBottom: 26,
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 7,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroLogoShell: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 6,
  },
  title: {
    ...typography.title,
    fontSize: 33,
    lineHeight: 40,
    letterSpacing: -0.3,
    includeFontPadding: false,
    flexShrink: 1,
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    marginTop: 5,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },
  badgeText: {
    ...typography.label,
    fontSize: 13,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  formTitle: {
    ...typography.title,
    fontSize: 24,
  },
  formSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 18,
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  messageText: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  label: {
    ...typography.label,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 15,
    fontSize: 15,
  },
  button: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.heading,
    color: '#fff',
    fontSize: 16,
  },
  footer: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    ...typography.body,
    fontSize: 14,
  },
  link: {
    ...typography.heading,
    fontSize: 14,
  },
});
