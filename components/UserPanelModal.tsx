import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FileLock2,
  KeyRound,
  LogOut,
  MoonStar,
  Save,
  ShieldCheck,
  SunMedium,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { typography } from '@/lib/typography';

type PanelSection = 'accountSettings' | 'company' | 'security' | 'delete';

type UserPanelModalProps = {
  visible: boolean;
  onClose: () => void;
};

type MenuItem = {
  key: PanelSection;
  label: string;
  icon: typeof UserRound;
  tone?: 'default' | 'danger';
};

const companyItems: MenuItem[] = [
  { key: 'company', label: 'İşletme Bilgileri', icon: Building2 },
];

const accountItems: MenuItem[] = [
  { key: 'accountSettings', label: 'Hesap Ayarları', icon: UserRound },
  { key: 'security', label: 'Şifre Yönetimi', icon: ShieldCheck },
  { key: 'delete', label: 'Hesabı Sil', icon: Trash2, tone: 'danger' },
];

export function UserPanelModal({ visible, onClose }: UserPanelModalProps) {
  const { user, company, signOut, refreshCompany, requestAccountDeletion } = useAuth();
  const { theme, mode, toggleTheme } = useAppTheme();
  const [activeSection, setActiveSection] = useState<PanelSection | null>(null);
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

  useEffect(() => {
    if (!visible) {
      setActiveSection(null);
    }
  }, [visible]);

  const initials = useMemo(() => {
    const source = company?.name || user?.email || 'CepteCari';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [company?.name, user?.email]);

  const version = Constants.expoConfig?.version || '1.0.0';
  const isDark = mode === 'dark';

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
      onClose();
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
      'Bu işlem silme talebinizi kaydeder. Talep arka planda işlenecektir ve uygun veriler silinir veya anonimleştirilir.',
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

  const toggleSection = (section: PanelSection) => {
    setActiveSection((current) => (current === section ? null : section));
  };

  const renderSectionContent = (section: PanelSection) => {
    if (section === 'company') {
      return (
        <View
          style={[
            styles.inlineDetailCard,
            { backgroundColor: theme.colors.surfaceMuted, borderTopColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.detailTitle, { color: theme.colors.text }]}>İşletme Bilgileri</Text>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Firma Adı</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={companyName}
            onChangeText={setCompanyName}
          />

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Vergi No</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={taxNumber}
            onChangeText={setTaxNumber}
          />

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Telefon</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>E-posta</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Adres</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.colors.primary },
              savingCompany && styles.buttonDisabled,
            ]}
            onPress={handleSaveCompany}
            disabled={savingCompany}
          >
            <Save size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {savingCompany ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (section === 'accountSettings') {
      return (
        <View
          style={[
            styles.inlineDetailCard,
            { backgroundColor: theme.colors.surfaceMuted, borderTopColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.detailTitle, { color: theme.colors.text }]}>Hesap Ayarları</Text>
          <Text style={[styles.infoLabel, { color: theme.colors.textSoft }]}>E-posta</Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user?.email || '-'}</Text>
          <Text style={[styles.infoLabel, { color: theme.colors.textSoft }]}>Firma</Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>
            {company?.name || 'Firma oluşturulmamış'}
          </Text>

          <TouchableOpacity
            style={[
              styles.secondaryAction,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => router.push('/privacy-policy' as never)}
          >
            <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>
              Gizlilik Politikasını Aç
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryAction,
              styles.actionSpacing,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => router.push('/account-deletion' as never)}
          >
            <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>
              Hesap Silme Bilgilerini Aç
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (section === 'security') {
      return (
        <View
          style={[
            styles.inlineDetailCard,
            { backgroundColor: theme.colors.surfaceMuted, borderTopColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.detailTitle, { color: theme.colors.text }]}>Şifre Yönetimi</Text>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Yeni Şifre</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="En az 6 karakter"
            placeholderTextColor={theme.colors.textSoft}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.colors.primary },
              savingPassword && styles.buttonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={savingPassword}
          >
            <KeyRound size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {savingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.inlineDetailCard,
          styles.dangerCard,
          { backgroundColor: theme.colors.dangerSoft, borderTopColor: theme.colors.danger },
        ]}
      >
        <Text style={[styles.detailTitle, styles.dangerTitle]}>Hesabı Sil</Text>
        <Text style={styles.dangerText}>
          Silme talebi backend tarafında işlenir. Uygun veriler silinir veya anonimleştirilir.
        </Text>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Silme Nedeni</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
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
            Talep oluştuktan sonra süreç arka planda tamamlanır.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.dangerButton,
            { backgroundColor: theme.colors.danger },
            requestingDeletion && styles.buttonDisabled,
          ]}
          onPress={handleRequestAccountDeletion}
          disabled={requestingDeletion}
        >
          <Trash2 size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {requestingDeletion ? 'Talep Gönderiliyor...' : 'Silme Talebi Gönder'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const active = activeSection === item.key;
    const danger = item.tone === 'danger';
    const color = danger ? theme.colors.danger : theme.colors.text;
    const iconColor = danger ? theme.colors.danger : theme.colors.primary;

    return (
      <View key={item.key}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => toggleSection(item.key)}
          activeOpacity={0.86}
        >
          <View style={styles.menuItemLeft}>
            <Icon size={18} color={iconColor} />
            <Text style={[styles.menuItemText, { color }]}>{item.label}</Text>
          </View>
          {active ? (
            <ChevronDown size={18} color={theme.colors.textSoft} />
          ) : (
            <ChevronRight size={18} color={theme.colors.textSoft} />
          )}
        </TouchableOpacity>
        {active ? renderSectionContent(item.key) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.backgroundSecondary }]}>
          <View style={styles.topBar}>
            <Text style={[styles.topTitle, { color: theme.colors.text }]}>Profil</Text>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.colors.surfaceMuted }]}
              onPress={onClose}
            >
              <X size={18} color={theme.colors.textSoft} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
              <View
                style={[
                  styles.avatarBadge,
                  { backgroundColor: isDark ? theme.colors.primaryStrong : theme.colors.primary },
                ]}
              >
                <Text style={styles.avatarBadgeText}>{initials || 'C'}</Text>
              </View>
              <View style={styles.profileText}>
                <Text style={[styles.profileName, { color: theme.colors.text }]}>
                  {company?.name || 'CepteCari'}
                </Text>
                <View style={styles.statusRow}>
                  <View style={styles.statusDot} />
                  <Text style={[styles.statusText, { color: theme.colors.textMuted }]}>Aktif</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.profileThemeButton, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={toggleTheme}
                activeOpacity={0.86}
              >
                {mode === 'dark' ? (
                  <SunMedium size={16} color={theme.colors.accent} />
                ) : (
                  <MoonStar size={16} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.groupLabel, { color: theme.colors.textSoft }]}>İŞLETME</Text>
            <View style={[styles.groupCard, { backgroundColor: theme.colors.surface }]}>
              {companyItems.map(renderMenuItem)}
            </View>

            <Text style={[styles.groupLabel, { color: theme.colors.textSoft }]}>HESAP</Text>
            <View style={[styles.groupCard, { backgroundColor: theme.colors.surface }]}>
              {accountItems.map(renderMenuItem)}
            </View>

            <TouchableOpacity
              style={[styles.logoutRow, { backgroundColor: theme.colors.surface }]}
              onPress={handleSignOut}
              activeOpacity={0.86}
            >
              <View style={styles.menuItemLeft}>
                <LogOut size={18} color={theme.colors.danger} />
                <Text style={[styles.menuItemText, styles.dangerMenuText]}>Çıkış Yap</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.versionCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.versionLabel, { color: theme.colors.textSoft }]}>Versiyon</Text>
              <Text style={[styles.versionValue, { color: theme.colors.textSoft }]}>{version}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  sheet: {
    maxHeight: '94%',
    backgroundColor: '#1f1f21',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  topBar: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    ...typography.heading,
    color: '#f4f5f7',
    fontSize: 18,
  },
  closeButton: {
    position: 'absolute',
    right: 14,
    top: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 14,
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: '#2b2b2e',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8f6bff',
    marginRight: 14,
  },
  avatarBadgeText: {
    ...typography.heading,
    color: '#fff',
    fontSize: 15,
  },
  profileText: {
    flex: 1,
  },
  profileThemeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  profileName: {
    ...typography.title,
    color: '#f4f5f7',
    fontSize: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ecb5f',
    marginRight: 6,
  },
  statusText: {
    ...typography.caption,
    color: '#b8b8bc',
    fontSize: 13,
  },
  groupLabel: {
    ...typography.label,
    color: '#8f8f94',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 2,
  },
  groupCard: {
    backgroundColor: '#2b2b2e',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  menuItem: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemText: {
    ...typography.bodyStrong,
    fontSize: 17,
  },
  detailCard: {
    backgroundColor: '#2b2b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  inlineDetailCard: {
    backgroundColor: '#252528',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    padding: 14,
  },
  detailTitle: {
    ...typography.title,
    color: '#f4f5f7',
    fontSize: 18,
    marginBottom: 10,
  },
  infoLabel: {
    ...typography.label,
    color: '#8f8f94',
    fontSize: 12,
    marginTop: 8,
  },
  infoValue: {
    ...typography.bodyStrong,
    color: '#f4f5f7',
    fontSize: 15,
    marginTop: 4,
  },
  label: {
    ...typography.label,
    color: '#b8b8bc',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#232326',
    borderWidth: 1,
    borderColor: '#3a3a3f',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f4f5f7',
    fontSize: 15,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  secondaryAction: {
    backgroundColor: '#232326',
    borderWidth: 1,
    borderColor: '#3a3a3f',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  secondaryActionText: {
    ...typography.heading,
    color: '#2aa7ff',
    fontSize: 14,
  },
  actionSpacing: {
    marginTop: 10,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#2a6cff',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    ...typography.heading,
    color: '#fff',
    fontSize: 14,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,93,103,0.24)',
  },
  dangerTitle: {
    color: '#ff5d67',
  },
  dangerText: {
    ...typography.body,
    color: '#ff9aa0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  inlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  inlineInfoText: {
    ...typography.caption,
    color: '#ff9aa0',
    fontSize: 13,
    flex: 1,
  },
  dangerButton: {
    marginTop: 16,
    backgroundColor: '#ff5d67',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutRow: {
    backgroundColor: '#2b2b2e',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 54,
    justifyContent: 'center',
    marginBottom: 14,
  },
  dangerMenuText: {
    color: '#ff5d67',
  },
  versionCard: {
    backgroundColor: '#2b2b2e',
    borderRadius: 14,
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionLabel: {
    ...typography.label,
    color: '#8f8f94',
    fontSize: 12,
  },
  versionValue: {
    ...typography.caption,
    color: '#8f8f94',
    fontSize: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
