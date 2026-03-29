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
import { ArrowRight, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FirmaLogo } from '@/components/FirmaLogo';
import { typography } from '@/lib/typography';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { signUp } = useAuth();
  const { theme } = useAppTheme();

  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password || !companyName) {
      setErrorMessage('Lütfen tüm alanları doldurun.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email, password, companyName);

      if (result.requiresEmailConfirmation) {
        setSuccessMessage(
          'Kullanıcı oluşturuldu ancak e-posta doğrulaması açık. E-postanızı doğrulayın veya Supabase Email doğrulamasını kapatın.'
        );
        return;
      }

      setSuccessMessage('Hesabınız oluşturuldu. Ana sayfaya yönlendiriliyorsunuz.');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1200);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Kayıt sırasında bir hata oluştu.'
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
              <FirmaLogo size="sm" showWordmark={false} />
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={[styles.title, { color: theme.colors.text }]}>CepteCari</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                CepteCari ile borç ve alacak takibini kolayca yönetin.
              </Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.colors.primarySoft }]}>
            <Sparkles size={16} color={theme.colors.accent} />
            <Text style={[styles.badgeText, { color: theme.colors.text }]}>
              Dakikalar içinde başlayın
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

          {!!successMessage ? (
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
                {successMessage}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Firma Adı</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="Kaya Ticaret"
            placeholderTextColor={theme.colors.textSoft}
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>E-posta</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="ornek@email.com"
            placeholderTextColor={theme.colors.textSoft}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Şifre</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="En az 6 karakter"
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
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Kaydediliyor...' : 'Kayıt Ol'}</Text>
            {!loading ? <ArrowRight size={18} color="#fff" /> : null}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSoft }]}>
              Zaten hesabın var mı?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.link, { color: theme.colors.primaryStrong }]}>Giriş Yap</Text>
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
    right: -24,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  glowOrbSecondary: {
    position: 'absolute',
    bottom: -48,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(34,228,214,0.12)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heroCard: {
    marginTop: 28,
    marginBottom: 24,
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
    alignItems: 'center',
    gap: 16,
  },
  heroLogoShell: {
    width: 86,
    height: 86,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.hero,
    fontSize: 34,
    lineHeight: 38,
    includeFontPadding: false,
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    marginTop: 6,
    lineHeight: 22,
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
