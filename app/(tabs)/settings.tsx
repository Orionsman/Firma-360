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
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { typography } from '@/lib/typography';

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
      Alert.alert('Bilgi', 'Düzenlenecek firma bulunamadı.');
      return;
    }

    if (!companyName.trim()) {
      Alert.alert('Hata', 'Firma adı boş olamaz.');
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
      Alert.alert('Başarılı', 'Firma bilgileri güncellendi.');
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
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalı.');
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
      Alert.alert('Başarılı', 'Şifreniz güncellendi.');
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Şifre değiştirilemedi.'
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
        error instanceof Error ? error.message : 'Çıkış yapılamadı.'
      );
    }
  };

  const handleRequestAccountDeletion = () => {
    Alert.alert(
      'Hesap silme talebi gönderilsin mi?',
      'Bu işlem silme talebinizi kaydeder. Talep arka planda işlenecektir ve yasal saklama zorunluluğu olmayan veriler silinir veya anonimleştirilir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Talep Gönder',
          onPress: async () => {
            setRequestingDeletion(true);
            try {
              await requestAccountDeletion(deletionReason);
              setDeletionReason('');
              Alert.alert(
                'Talep Alındı',
                'Hesap silme talebiniz kaydedildi. İşlem arka planda tamamlanacaktır.'
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
      <BrandHeroHeader
        kicker="HESAP VE GÖRÜNÜM"
        title="Ayarlar"
        subtitle="Hesabını, firma bilgilerini ve deneyimini tek yerden yönet."
      >
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
            {mode === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
          </Text>
        </TouchableOpacity>
      </BrandHeroHeader>

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
            {showCompanyEditor ? 'Firma Bilgilerini Gizle' : 'Firma Bilgilerini Güncelle'}
          </Text>
        </TouchableOpacity>

        {showCompanyEditor ? (
          <View style={styles.editorSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Firma Adı</Text>
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
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Şifre Değiştir</Text>
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Yeni Şifre</Text>
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
            {savingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Info size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Hakkimizda</Text>
        </View>
        <Text style={[styles.aboutText, { color: theme.colors.textMuted }]}>
          CepteCari ile borç ve alacak takibini kolayca yönetin. Esnaflar ve
          bireysel kullanıcılar için geliştirilen bu pratik uygulama sayesinde
          tüm hesaplarınız artık cebinizde.
        </Text>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          onPress={() => router.push('/privacy-policy' as never)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            Gizlilik Politikasını Aç
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, styles.secondaryButtonSpacing, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          onPress={() => router.push('/account-deletion' as never)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            Hesap Silme Bilgilerini Aç
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
          Buradan hesap silme talebi oluşturabilirsiniz. Talep kaydedildikten
          sonra backend tarafında işlenir ve geri dönülemeyebilir.
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
          placeholder="Talebinizle ilgili kısa bir not yazabilirsiniz."
          placeholderTextColor={theme.colors.textSoft}
        />

        <View style={styles.inlineInfo}>
          <FileLock2 size={16} color={theme.colors.danger} />
          <Text style={[styles.inlineInfoText, { color: theme.colors.danger }]}>
            İşlem tamamlandığında size ait hesap verileri silinir veya
            anonimleştirilir.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: theme.colors.danger }, requestingDeletion && styles.buttonDisabled]}
          onPress={handleRequestAccountDeletion}
          disabled={requestingDeletion}
        >
          <Trash2 size={18} color="#ffffff" />
          <Text style={styles.dangerButtonText}>
            {requestingDeletion ? 'Talep Gönderiliyor...' : 'Hesap Silme Talebi Gönder'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: theme.colors.primaryStrong }]}
        onPress={handleSignOut}
      >
        <LogOut size={18} color="#ffffff" />
        <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
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
    alignItems: 'stretch',
    paddingTop: 56,
    paddingBottom: 26,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  headerOrbOne: {
    position: 'absolute',
    top: -34,
    right: -18,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  headerOrbTwo: {
    position: 'absolute',
    bottom: -52,
    left: -28,
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: 'rgba(34,228,214,0.12)',
  },
  headerBrandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  headerLogoShell: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
  },
  headerKicker: {
    ...typography.label,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    ...typography.hero,
    fontSize: 30,
    marginBottom: 6,
    color: '#ffffff',
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 21,
  },
  themeToggle: {
    marginTop: 16,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggleText: {
    ...typography.label,
    fontSize: 14,
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
    ...typography.heading,
    fontSize: 18,
  },
  label: {
    ...typography.label,
    fontSize: 13,
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
    ...typography.heading,
    color: '#ffffff',
    fontSize: 15,
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
    ...typography.heading,
    fontSize: 15,
  },
  secondaryButtonSpacing: {
    marginTop: 10,
  },
  aboutText: {
    ...typography.body,
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
    ...typography.heading,
    fontSize: 18,
  },
  dangerText: {
    ...typography.body,
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
    ...typography.caption,
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
    ...typography.heading,
    color: '#ffffff',
    fontSize: 15,
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
    ...typography.heading,
    color: '#ffffff',
    fontSize: 15,
  },
});
