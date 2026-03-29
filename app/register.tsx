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
      setErrorMessage('Lutfen tum alanlari doldurun.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Sifre en az 6 karakter olmalidir.');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email, password, companyName);

      if (result.requiresEmailConfirmation) {
        setSuccessMessage(
          'Kullanici olusturuldu ancak e-posta dogrulamasi acik. E-postanizi dogrulayin veya Supabase Email dogrulamasini kapatin.'
        );
        return;
      }

      setSuccessMessage('Hesabiniz olusturuldu. Giris ekranina yonlendiriliyorsunuz.');
      setTimeout(() => {
        router.replace('/login');
      }, 1200);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Kayit sirasinda bir hata olustu.'
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
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <FirmaLogo size="sm" />
          <Text style={[styles.title, { color: theme.colors.text }]}>Yeni hesap olustur</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            CepteCari ile borc ve alacak takibini kolayca yonetin.
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.colors.primarySoft }]}>
            <Sparkles size={16} color={theme.colors.accent} />
            <Text style={[styles.badgeText, { color: theme.colors.text }]}>Hizli kurulum</Text>
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

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Firma Adi</Text>
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

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Sifre</Text>
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
            <Text style={styles.buttonText}>
              {loading ? 'Kaydediliyor...' : 'Kayit Ol'}
            </Text>
            {!loading ? <ArrowRight size={18} color="#fff" /> : null}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSoft }]}>
              Zaten hesabin var mi?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.link, { color: theme.colors.primaryStrong }]}>Giris Yap</Text>
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
    height: 280,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 26,
    marginTop: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  badge: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '800',
  },
});
