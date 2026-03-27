import { useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Building2 } from 'lucide-react-native';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { signUp } = useAuth();

  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password || !companyName) {
      setErrorMessage('Lütfen tüm alanları doldurun.');
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
          'Kullanici olusturuldu ancak e-posta dogrulamasi acik. Supabase Dashboard > Authentication > Providers > Email altindan Confirm email ayarini kapatip tekrar deneyin veya e-postanizi dogrulayin.'
        );
        return;
      }

      setSuccessMessage(
        'Hesabiniz olusturuldu. Simdi giris ekranina yonlendiriliyorsunuz.'
      );
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
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Building2 size={48} color="#3b82f6" />
          <Text style={styles.title}>Sirketinizi Kaydedin</Text>
          <Text style={styles.subtitle}>Isletmenizi yonetmeye baslayin</Text>
        </View>

        <View style={styles.form}>
          {!!errorMessage && (
            <View style={[styles.messageBox, styles.errorBox]}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {!!successMessage && (
            <View style={[styles.messageBox, styles.successBox]}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Firma Adi</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC Ltd. Sti."
              value={companyName}
              onChangeText={setCompanyName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sifre</Text>
            <TextInput
              style={styles.input}
              placeholder="En az 6 karakter"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Kaydediliyor...' : 'Kayit Ol'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Zaten hesabin var mi? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Giris Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  messageBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  link: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
