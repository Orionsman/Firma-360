import { useEffect, useState } from 'react';
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
import { ArrowRight, LockKeyhole } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

export default function ResetPassword() {
  const { session, updatePassword } = useAuth();
  const { theme } = useAppTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!session) {
      setErrorMessage(t.auth.reset.linkInvalid);
    }
  }, [session]);

  const handleReset = async () => {
    setErrorMessage('');
    setMessage('');

    if (!password || !confirmPassword) {
      setErrorMessage(t.auth.reset.fieldsRequired);
      return;
    }

    if (password.length < 6) {
      setErrorMessage(t.auth.register.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t.auth.reset.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setMessage(t.auth.reset.success);
      setTimeout(() => {
        router.replace('/login');
      }, 1200);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : t.auth.reset.failed
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
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>
            <LockKeyhole size={28} color={theme.colors.primary} />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t.auth.reset.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {t.auth.reset.subtitle}
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

          {!!message ? (
            <View
              style={[
                styles.messageBox,
                {
                  backgroundColor: theme.colors.primarySoft,
                  borderColor: theme.colors.success,
                },
              ]}
            >
              <Text style={[styles.messageText, { color: theme.colors.success }]}>
                {message}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            {t.auth.reset.newPassword}
          </Text>
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

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            {t.auth.reset.confirmPassword}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder={t.auth.reset.confirmPassword}
            placeholderTextColor={theme.colors.textSoft}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleReset}
            disabled={loading || !session}
          >
            <Text style={styles.buttonText}>
              {loading ? t.auth.reset.saving : t.auth.reset.action}
            </Text>
            {!loading ? <ArrowRight size={18} color="#fff" /> : null}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={[styles.backLink, { color: theme.colors.primaryStrong }]}>
              {t.auth.reset.backToLogin}
            </Text>
          </TouchableOpacity>
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
    paddingBottom: 56,
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    ...typography.title,
    fontSize: 24,
  },
  subtitle: {
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
  backLink: {
    ...typography.heading,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 18,
  },
});
