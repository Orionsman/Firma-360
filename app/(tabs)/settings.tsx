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
  Save,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { company, signOut, refreshCompany, requestAccountDeletion } = useAuth();
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
      'Hesap silme talebi olusturulsun mu?',
      'Bu islem silme surecini baslatir ve uygulamadan cikis yapmaniza neden olur.',
      [
        {
          text: 'Vazgec',
          style: 'cancel',
        },
        {
          text: 'Talep Olustur',
          style: 'destructive',
          onPress: async () => {
            setRequestingDeletion(true);
            try {
              await requestAccountDeletion(deletionReason);
              await signOut();
              setDeletionReason('');
              Alert.alert(
                'Talep Alindi',
                'Hesap silme talebiniz kaydedildi. Gerekli durumlarda yasal saklama yukumlulukleri disindaki verileriniz silinecek veya anonimlestirilecektir.'
              );
              router.replace('/login');
            } catch (error: unknown) {
              Alert.alert(
                'Hata',
                error instanceof Error
                  ? error.message
                  : 'Hesap silme talebi olusturulamadi.'
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Ayarlar</Text>
        <Text style={styles.subtitle}>Hesap ve firma ayarlarinizi buradan yonetin.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Building2 size={20} color="#2563eb" />
          <Text style={styles.cardTitle}>Firma Bilgileri</Text>
        </View>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowCompanyEditor((current) => !current)}
        >
          <Text style={styles.secondaryButtonText}>
            {showCompanyEditor ? 'Firma Bilgilerini Gizle' : 'Firma Bilgilerini Guncelle'}
          </Text>
        </TouchableOpacity>

        {showCompanyEditor ? (
          <View style={styles.editorSection}>
            <Text style={styles.label}>Firma Adi</Text>
            <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} />

            <Text style={styles.label}>Vergi No</Text>
            <TextInput style={styles.input} value={taxNumber} onChangeText={setTaxNumber} />

            <Text style={styles.label}>Telefon</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Adres</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.primaryButton, savingCompany && styles.buttonDisabled]}
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

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <KeyRound size={20} color="#2563eb" />
          <Text style={styles.cardTitle}>Sifre Degistir</Text>
        </View>

        <Text style={styles.label}>Yeni Sifre</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="En az 6 karakter"
        />

        <TouchableOpacity
          style={[styles.primaryButton, savingPassword && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={savingPassword}
        >
          <KeyRound size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>
            {savingPassword ? 'Guncelleniyor...' : 'Sifreyi Guncelle'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Info size={20} color="#2563eb" />
          <Text style={styles.cardTitle}>Hakkimizda</Text>
        </View>
        <Text style={styles.aboutText}>
          Bu uygulama cari, stok, satis ve odeme yonetimini tek yerde toplamak
          icin gelistirildi. Isletme operasyonlarini daha duzenli takip etmenize
          yardimci olur.
        </Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/privacy-policy' as never)}
        >
          <Text style={styles.secondaryButtonText}>Gizlilik Politikasini Ac</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, styles.secondaryButtonSpacing]}
          onPress={() => router.push('/account-deletion' as never)}
        >
          <Text style={styles.secondaryButtonText}>Hesap Silme Bilgilerini Ac</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dangerCard}>
        <View style={styles.cardHeader}>
          <Trash2 size={20} color="#dc2626" />
          <Text style={styles.dangerCardTitle}>Hesap Silme</Text>
        </View>

        <Text style={styles.dangerText}>
          Hesap silme talebi olusturdugunuzda silme sureci baslatilir. Yasal
          yukumluluk nedeniyle saklanmasi gereken kayitlar haricindeki veriler
          silinir veya anonimlestirilir.
        </Text>

        <Text style={styles.label}>Silme Nedeni (Opsiyonel)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={deletionReason}
          onChangeText={setDeletionReason}
          multiline
          numberOfLines={4}
          placeholder="Talebinizle ilgili kisa bir not yazabilirsiniz."
        />

        <View style={styles.inlineInfo}>
          <FileLock2 size={16} color="#991b1b" />
          <Text style={styles.inlineInfoText}>
            Bu islem talep olusturur ve sizi guvenlik amaciyla oturumdan cikarir.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.dangerButton, requestingDeletion && styles.buttonDisabled]}
          onPress={handleRequestAccountDeletion}
          disabled={requestingDeletion}
        >
          <Trash2 size={18} color="#ffffff" />
          <Text style={styles.dangerButtonText}>
            {requestingDeletion ? 'Talep Gonderiliyor...' : 'Hesap Silme Talebi Olustur'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <LogOut size={18} color="#ffffff" />
        <Text style={styles.logoutButtonText}>Cikis Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#0f172a',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
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
    backgroundColor: '#2563eb',
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
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonSpacing: {
    marginTop: 10,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 16,
  },
  dangerCard: {
    backgroundColor: '#fff1f2',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginBottom: 16,
  },
  dangerCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7f1d1d',
  },
  dangerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7f1d1d',
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
    color: '#991b1b',
  },
  dangerButton: {
    marginTop: 18,
    backgroundColor: '#dc2626',
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
    backgroundColor: '#dc2626',
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
