import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Building2,
  FileLock2,
  Info,
  KeyRound,
  LogOut,
  MoonStar,
  Save,
  SunMedium,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FirmaLogo } from '@/components/FirmaLogo';

export default function SettingsScreen() {
  const { company, signOut, refreshCompany, requestAccountDeletion } = useAuth();
  const { theme, mode, toggleTheme } = useAppTheme();
  const [showCompanyEditor, setShowCompanyEditor] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  useEffect(() => {
    setCompanyName(company?.name || '');
    setTaxNumber(company?.tax_number || '');
    setAddress(company?.address || '');
    setPhone(company?.phone || '');
    setEmail(company?.email || '');
  }, [company]);

  const handleSaveCompany = async () => {
    if (!company) {
      Alert.alert('Bilgi', 'Duzenlenecek firma bulunamadi.');
      return;
    }

    if (!companyName.trim()) {
      Alert.alert('Hata', 'Firma adi bos olamaz.');
      return;
    }

    setSavingCompany(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyName.trim(),
          tax_number: taxNumber.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
        })
        .eq('id', company.id);

      if (error) {
        throw error;
      }

      await refreshCompany();
      setShowCompanyEditor(false);
      Alert.alert('Basarili', 'Firma bilgileri guncellendi.');
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Firma bilgileri kaydedilemedi.'
      );
    } finally {
      setSavingCompany(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni sifre en az 6 karakter olmali.');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setNewPassword('');
      Alert.alert('Basarili', 'Sifreniz guncellendi.');
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Sifre degistirilemedi.'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Cikis yapilamadi.'
      );
    }
  };

  const handleRequestAccountDeletion = () => {
    Alert.alert(
      'Hesap silme talebi gonderilsin mi?',
      'Bu islem silme talebinizi kaydeder. Talep arka planda islenecektir ve yasal saklama zorunlulugu olmayan veriler silinir veya anonimlestirilir.',
      [
        { text: 'Vazgec', style: 'cancel' },
        {
          text: 'Talep Gonder',
          onPress: async () => {
            setRequestingDeletion(true);
            try {
              await requestAccountDeletion(deletionReason);
              setDeletionReason('');
              Alert.alert(
                'Talep Alindi',
                'Hesap silme talebiniz kaydedildi. Islem arka planda tamamlanacaktir.'
              );
            } catch (error: unknown) {
              Alert.alert(
                'Hata',
                error instanceof Error ? error.message : 'Hesap silinemedi.'
              );
            } finally {
              setRequestingDeletion(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <LinearGradient
        colors={[theme.colors.primaryStrong, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <FirmaLogo size="sm" />
        <Text style={styles.title}>Ayarlar</Text>
        <Text style={styles.subtitle}>
          CepteCari hesabini, firma bilgilerini ve gorunumu yonetin.
        </Text>
        <TouchableOpacity
          style={[
            styles.themeToggle,
            {
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderColor: 'rgba(255,255,255,0.18)',
            },
          ]}
          onPress={toggleTheme}
          activeOpacity={0.85}
        >
          {mode === 'dark' ? (
            <SunMedium size={18} color={theme.colors.accent} />
          ) : (
            <MoonStar size={18} color={theme.colors.primary} />
          )}
          <Text style={styles.themeToggleText}>
            {mode === 'dark' ? 'Acik moda gec' : 'Koyu moda gec'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Building2 size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Firma Bilgileri</Text>
        </View>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          onPress={() => setShowCompanyEditor((current) => !current)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            {showCompanyEditor ? 'Firma Bilgilerini Gizle' : 'Firma Bilgilerini Guncelle'}
          </Text>
        </TouchableOpacity>

        {showCompanyEditor ? (
          <View style={styles.editorSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Firma Adi</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={companyName}
              onChangeText={setCompanyName}
            />

            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Vergi No</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={taxNumber}
              onChangeText={setTaxNumber}
            />

            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Telefon</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={[styles.label, { color: theme.colors.textMuted }]}>E-posta</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Adres</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }, savingCompany && styles.buttonDisabled]}
              onPress={handleSaveCompany}
              disabled={savingCompany}
            >
              <Save size={18} color="#ffffff" />
              <Text style={styles.primaryButtonText}>
                {savingCompany ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <KeyRound size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Sifre Degistir</Text>
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Yeni Sifre</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="En az 6 karakter"
          placeholderTextColor={theme.colors.textSoft}
        />

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }, savingPassword && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={savingPassword}
        >
          <KeyRound size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>
            {savingPassword ? 'Guncelleniyor...' : 'Sifreyi Guncelle'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Info size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Hakkimizda</Text>
        </View>
        <Text style={[styles.aboutText, { color: theme.colors.textMuted }]}>
          CepteCari ile borc ve alacak takibini kolayca yonetin. Esnaflar ve
          bireysel kullanicilar icin gelistirilen bu pratik uygulama sayesinde
          tum hesaplariniz artik cebinizde.
        </Text>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          onPress={() => router.push('/privacy-policy' as never)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            Gizlilik Politikasini Ac
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, styles.secondaryButtonSpacing, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          onPress={() => router.push('/account-deletion' as never)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            Hesap Silme Bilgilerini Ac
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.dangerCard, { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger }]}>
        <View style={styles.cardHeader}>
          <Trash2 size={20} color={theme.colors.danger} />
          <Text style={[styles.dangerCardTitle, { color: theme.colors.danger }]}>
            Hesap Silme
          </Text>
        </View>

        <Text style={[styles.dangerText, { color: theme.colors.danger }]}>
          Buradan hesap silme talebi olusturabilirsiniz. Talep kaydedildikten
          sonra backend tarafinda islenir ve geri donulemeyebilir.
        </Text>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>
          Silme Nedeni (Opsiyonel)
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          value={deletionReason}
          onChangeText={setDeletionReason}
          multiline
          numberOfLines={4}
          placeholder="Talebinizle ilgili kisa bir not yazabilirsiniz."
          placeholderTextColor={theme.colors.textSoft}
        />

        <View style={styles.inlineInfo}>
          <FileLock2 size={16} color={theme.colors.danger} />
          <Text style={[styles.inlineInfoText, { color: theme.colors.danger }]}>
            Islem tamamlandiginda size ait hesap verileri silinir veya
            anonimlestirilir.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: theme.colors.danger }, requestingDeletion && styles.buttonDisabled]}
          onPress={handleRequestAccountDeletion}
          disabled={requestingDeletion}
        >
          <Trash2 size={18} color="#ffffff" />
          <Text style={styles.dangerButtonText}>
            {requestingDeletion ? 'Talep Gonderiliyor...' : 'Hesap Silme Talebi Gonder'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: theme.colors.primaryStrong }]}
        onPress={handleSignOut}
      >
        <LogOut size={18} color="#ffffff" />
        <Text style={styles.logoutButtonText}>Cikis Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 14,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.82)',
  },
  themeToggle: {
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  editorSection: {
    marginTop: 16,
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonSpacing: {
    marginTop: 10,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  dangerCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  dangerCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dangerText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  inlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  inlineInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  dangerButton: {
    marginTop: 18,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
