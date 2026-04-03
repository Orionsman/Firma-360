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
  Globe2,
  Info,
  KeyRound,
  LogOut,
  MoonStar,
  Save,
  SunMedium,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { typography } from '@/lib/typography';

type PanelSection = 'company' | 'account' | 'language' | 'legal';

type UserPanelModalProps = {
  visible: boolean;
  onClose: () => void;
};

type MenuItem = {
  key: PanelSection;
  label: string;
  icon: typeof UserRound;
};

export function UserPanelModal({ visible, onClose }: UserPanelModalProps) {
  const {
    user,
    company,
    companies,
    activeCompanyId,
    signOut,
    refreshCompany,
    deleteAccount,
    switchCompany,
  } = useAuth();
  const { theme, mode, toggleTheme } = useAppTheme();
  const { locale, setLocale } = useLocale();
  const { currency, setCurrency, currencyOptions } = useCurrency();

  const [activeSection, setActiveSection] = useState<PanelSection | null>(null);
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isTr = locale === 'tr';
  const isDark = mode === 'dark';
  const version = Constants.expoConfig?.version || '1.0.0';

  const text = useMemo(
    () => ({
      profile: isTr ? 'Profil' : 'Profile',
      active: isTr ? 'Aktif' : 'Active',
      companySwitch: isTr ? 'Firma Geçişi' : 'Company Switch',
      selectedCompany: isTr ? 'Seçili firma' : 'Selected company',
      showOtherCompanies: isTr ? 'Diğer firmaları göster' : 'Show other companies',
      hideOtherCompanies: isTr ? 'Firma listesini gizle' : 'Hide company list',
      noOtherCompany: isTr ? 'Başka bağlı firma yok.' : 'No other linked companies.',
      companyInfo: isTr ? 'İşletme Bilgileri' : 'Business Details',
      accountSettings: isTr ? 'Hesap Ayarları' : 'Account Settings',
      languageSettings: isTr ? 'Dil Ayarları' : 'Language Settings',
      legalSupport: isTr ? 'Yasal ve Destek' : 'Legal and Support',
      companyName: isTr ? 'Firma adı' : 'Company name',
      taxNumber: isTr ? 'Vergi no' : 'Tax number',
      phone: isTr ? 'Telefon' : 'Phone',
      email: 'Email',
      address: isTr ? 'Adres' : 'Address',
      save: isTr ? 'Bilgileri Kaydet' : 'Save Details',
      saving: isTr ? 'Kaydediliyor...' : 'Saving...',
      password: isTr ? 'Yeni şifre' : 'New password',
      passwordPlaceholder: isTr ? 'En az 6 karakter' : 'At least 6 characters',
      updatePassword: isTr ? 'Şifreyi Güncelle' : 'Update Password',
      updatingPassword: isTr ? 'Güncelleniyor...' : 'Updating...',
      currency: isTr ? 'Para Birimi' : 'Currency',
      theme: isTr ? 'Tema' : 'Theme',
      switchToLight: isTr ? 'Açık moda geç' : 'Switch to light mode',
      switchToDark: isTr ? 'Koyu moda geç' : 'Switch to dark mode',
      deleteHint: isTr ? 'Hesap silme işlemi geri alınamaz.' : 'Account deletion cannot be undone.',
      deletionReason: isTr ? 'Silme nedeni' : 'Deletion reason',
      deletionPlaceholder: isTr ? 'İsterseniz kısa bir not yazabilirsiniz.' : 'You can add a short note if you want.',
      deleting: isTr ? 'Hesap siliniyor...' : 'Deleting account...',
      deleteAccount: isTr ? 'Hesabı Kalıcı Olarak Sil' : 'Delete Account Permanently',
      logout: isTr ? 'Çıkış Yap' : 'Sign Out',
      version: isTr ? 'Versiyon' : 'Version',
      companyUpdated: isTr ? 'Firma bilgileri güncellendi.' : 'Company details updated.',
      companySaveFailed: isTr ? 'Firma bilgileri kaydedilemedi.' : 'Could not save company details.',
      passwordUpdated: isTr ? 'Şifreniz güncellendi.' : 'Your password has been updated.',
      passwordFailed: isTr ? 'Şifre değiştirilemedi.' : 'Could not update the password.',
      logoutFailed: isTr ? 'Çıkış yapılamadı.' : 'Could not sign out.',
      companyMissing: isTr ? 'Düzenlenecek firma bulunamadı.' : 'No company found to edit.',
      companyRequired: isTr ? 'Firma adı boş olamaz.' : 'Company name cannot be empty.',
      deleteConfirmTitle: isTr ? 'Hesap kalıcı olarak silinsin mi?' : 'Delete account permanently?',
      deleteConfirmText: isTr
        ? 'Bu işlem geri alınamaz. Hesabınız ve bağlı veriler silinir veya anonimleştirilir.'
        : 'This action cannot be undone. Your account and related data will be deleted or anonymized.',
      cancel: isTr ? 'Vazgeç' : 'Cancel',
      deleted: isTr ? 'Hesap Silindi' : 'Account Deleted',
      deletedText: isTr ? 'Hesabınız başarıyla silindi.' : 'Your account has been deleted successfully.',
      legalLinks: [
        { label: isTr ? 'Gizlilik Politikası' : 'Privacy Policy', route: '/privacy-policy' as never },
        { label: isTr ? 'Destek Bilgileri' : 'Support Information', route: '/support' as never },
        { label: isTr ? 'Kullanım Koşulları' : 'Terms of Service', route: '/terms-of-service' as never },
        { label: isTr ? 'KVKK Aydınlatma Metni' : 'KVKK Notice', route: '/kvkk-notice' as never },
      ],
    }),
    [isTr]
  );

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
      setShowCompanyList(false);
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

  const selectedMembership =
    companies.find((membership) => membership.company_id === activeCompanyId) ||
    companies[0] ||
    null;
  const otherCompanies = companies.filter(
    (membership) => membership.company_id !== selectedMembership?.company_id
  );

  const roleLabel = (role?: 'owner' | 'admin' | 'user') => {
    if (role === 'owner') return isTr ? 'Sahip' : 'Owner';
    if (role === 'admin') return isTr ? 'Yönetici' : 'Admin';
    return isTr ? 'Kullanıcı' : 'User';
  };

  const menuItems: MenuItem[] = [
    { key: 'company', label: text.companyInfo, icon: Building2 },
    { key: 'account', label: text.accountSettings, icon: UserRound },
    { key: 'language', label: text.languageSettings, icon: Globe2 },
    { key: 'legal', label: text.legalSupport, icon: Info },
  ];

  const handleSaveCompany = async () => {
    if (!company) {
      Alert.alert(text.profile, text.companyMissing);
      return;
    }
    if (!companyName.trim()) {
      Alert.alert(text.profile, text.companyRequired);
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

      if (error) throw error;
      await refreshCompany();
      Alert.alert(text.profile, text.companyUpdated);
    } catch (error: unknown) {
      Alert.alert(text.profile, error instanceof Error ? error.message : text.companySaveFailed);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(text.profile, text.passwordPlaceholder);
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      Alert.alert(text.profile, text.passwordUpdated);
    } catch (error: unknown) {
      Alert.alert(text.profile, error instanceof Error ? error.message : text.passwordFailed);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(text.deleteConfirmTitle, text.deleteConfirmText, [
      { text: text.cancel, style: 'cancel' },
      {
        text: text.deleteAccount,
        style: 'destructive',
        onPress: async () => {
          setDeletingAccount(true);
          try {
            await deleteAccount(deletionReason);
            setDeletionReason('');
            Alert.alert(text.deleted, text.deletedText);
            onClose();
            router.replace('/login');
          } catch (error: unknown) {
            Alert.alert(text.profile, error instanceof Error ? error.message : text.deleteAccount);
          } finally {
            setDeletingAccount(false);
          }
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
      router.replace('/login');
    } catch (error: unknown) {
      Alert.alert(text.profile, error instanceof Error ? error.message : text.logoutFailed);
    }
  };

  const renderSection = (section: PanelSection) => {
    if (section === 'company') {
      return (
        <View
          style={[
            styles.inlineCard,
            { backgroundColor: theme.colors.surfaceMuted, borderTopColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{text.companyInfo}</Text>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{text.companyName}</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
            ]}
            value={companyName}
            onChangeText={setCompanyName}
          />
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{text.taxNumber}</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
            ]}
            value={taxNumber}
            onChangeText={setTaxNumber}
          />
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{text.phone}</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
            ]}
            value={phone}
            onChangeText={setPhone}
          />
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{text.email}</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
            ]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{text.address}</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
            ]}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSaveCompany}
            disabled={savingCompany}
          >
            <Save size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>{savingCompany ? text.saving : text.save}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (section === 'account') {
      return (
        <View
          style={[
            styles.inlineCard,
            { backgroundColor: theme.colors.surfaceMuted, borderTopColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{text.accountSettings}</Text>
          <Text style={[styles.infoLabel, { color: theme.colors.textSoft }]}>{text.email}</Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user?.email || '-'}</Text>

          <Text style={[styles.infoLabel, { color: theme.colors.textSoft }]}>{text.currency}</Text>
          <View style={styles.optionRow}>
            {currencyOptions.map((option) => {
              const active = currency === option.code;
              return (
                <TouchableOpacity
                  key={option.code}
                  style={[
                    styles.currencyOption,
                    {
                      backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setCurrency(option.code)}
                >
                  <Text
                    style={[
                      styles.currencyOptionText,
                      { color: active ? theme.colors.primaryStrong : theme.colors.text },
                    ]}
                  >
                    {option.code}
                  </Text>
                  <Text
                    style={[
                      styles.currencyOptionMeta,
                      { color: active ? theme.colors.primaryStrong : theme.colors.textMuted },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.infoLabel, { color: theme.colors.textSoft }]}>{text.theme}</Text>
          <TouchableOpacity
            style={[
              styles.secondaryAction,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={toggleTheme}
          >
            {isDark ? (
              <SunMedium size={16} color={theme.colors.accent} />
            ) : (
              <MoonStar size={16} color={theme.colors.primary} />
            )}
            <Text style={[styles.secondaryActionText, { color: theme.colors.text }]}>
              {isDark ? text.switchToLight : text.switchToDark}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{text.password}</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
            ]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder={text.passwordPlaceholder}
            placeholderTextColor={theme.colors.textSoft}
          />
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleChangePassword}
            disabled={savingPassword}
          >
            <KeyRound size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {savingPassword ? text.updatingPassword : text.updatePassword}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.deleteBox,
              { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },
            ]}
          >
            <Text style={[styles.deleteHint, { color: theme.colors.danger }]}>{text.deleteHint}</Text>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>{text.deletionReason}</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
              ]}
              value={deletionReason}
              onChangeText={setDeletionReason}
              multiline
              numberOfLines={4}
              placeholder={text.deletionPlaceholder}
              placeholderTextColor={theme.colors.textSoft}
            />
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: theme.colors.danger }]}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              <Trash2 size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {deletingAccount ? text.deleting : text.deleteAccount}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (section === 'language') {
      return (
        <View
          style={[
            styles.inlineCard,
            { backgroundColor: theme.colors.surfaceMuted, borderTopColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{text.languageSettings}</Text>
          <View
            style={[
              styles.languageSummary,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.infoLabel, { color: theme.colors.textSoft }]}>
              {isTr ? 'Aktif dil' : 'Active language'}
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {locale === 'tr' ? 'Türkçe' : 'English'}
            </Text>
          </View>
          <View style={styles.optionRow}>
            {(['tr', 'en'] as const).map((option) => {
              const active = locale === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.languageOption,
                    {
                      backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setLocale(option)}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      { color: active ? theme.colors.primaryStrong : theme.colors.text },
                    ]}
                  >
                    {option === 'tr' ? 'Türkçe' : 'English'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.inlineCard,
          { backgroundColor: theme.colors.surfaceMuted, borderTopColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{text.legalSupport}</Text>
        {text.legalLinks.map((item, index) => (
          <TouchableOpacity
            key={item.route}
            style={[
              styles.secondaryAction,
              index > 0 && styles.actionSpacing,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => {
              onClose();
              router.push(item.route);
            }}
          >
            <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.backgroundSecondary }]}>
          <View style={styles.topBar}>
            <Text style={[styles.topTitle, { color: theme.colors.text }]}>{text.profile}</Text>
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
                  <Text style={[styles.statusText, { color: theme.colors.textMuted }]}>
                    {text.active}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.switcherCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.switcherHeader}>
                <View style={styles.switcherTitleWrap}>
                  <Text style={[styles.switcherTitle, { color: theme.colors.text }]}>
                    {text.companySwitch}
                  </Text>
                  <Text style={[styles.switcherMeta, { color: theme.colors.textMuted }]}>
                    {text.selectedCompany}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.switcherToggle, { backgroundColor: theme.colors.surfaceMuted }]}
                  onPress={() => setShowCompanyList((current) => !current)}
                >
                  <Text style={[styles.switcherToggleText, { color: theme.colors.text }]}>
                    {showCompanyList ? text.hideOtherCompanies : text.showOtherCompanies}
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.selectedCompanyChip,
                  { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
                ]}
              >
                <Text style={[styles.selectedCompanyChipText, { color: theme.colors.primaryStrong }]}>
                  {selectedMembership?.companies?.name || 'CepteCari'}
                </Text>
                <Text style={[styles.selectedCompanyRole, { color: theme.colors.primaryStrong }]}>
                  {roleLabel(selectedMembership?.role)}
                </Text>
              </View>

              {showCompanyList ? (
                <View style={styles.switcherList}>
                  {otherCompanies.length === 0 ? (
                    <Text style={[styles.noOtherCompanyText, { color: theme.colors.textMuted }]}>
                      {text.noOtherCompany}
                    </Text>
                  ) : (
                    otherCompanies.map((membership) => (
                      <TouchableOpacity
                        key={membership.company_id}
                        style={[
                          styles.switcherItem,
                          {
                            backgroundColor: theme.colors.surfaceMuted,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => void switchCompany(membership.company_id)}
                      >
                        <Text style={[styles.switcherItemText, { color: theme.colors.text }]}>
                          {membership.companies?.name}
                        </Text>
                        <Text style={[styles.switcherItemRole, { color: theme.colors.textMuted }]}>
                          {roleLabel(membership.role)}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : null}
            </View>

            <View style={[styles.groupCard, { backgroundColor: theme.colors.surface }]}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.key;

                return (
                  <View key={item.key}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => setActiveSection((current) => (current === item.key ? null : item.key))}
                    >
                      <View style={styles.menuItemLeft}>
                        <Icon size={18} color={theme.colors.primary} />
                        <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{item.label}</Text>
                      </View>
                      {active ? (
                        <ChevronDown size={18} color={theme.colors.textSoft} />
                      ) : (
                        <ChevronRight size={18} color={theme.colors.textSoft} />
                      )}
                    </TouchableOpacity>
                    {active ? renderSection(item.key) : null}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.logoutRow, { backgroundColor: theme.colors.surface }]}
              onPress={handleSignOut}
            >
              <View style={styles.menuItemLeft}>
                <LogOut size={18} color={theme.colors.danger} />
                <Text style={[styles.menuItemText, { color: theme.colors.danger }]}>{text.logout}</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.versionCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.versionLabel, { color: theme.colors.textSoft }]}>{text.version}</Text>
              <Text style={[styles.versionValue, { color: theme.colors.textSoft }]}>{version}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.54)' },
  sheet: {
    maxHeight: '94%',
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
  topTitle: { ...typography.heading, fontSize: 18 },
  closeButton: {
    position: 'absolute',
    right: 14,
    top: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 14, paddingBottom: 24 },
  profileCard: {
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarBadgeText: { ...typography.heading, color: '#fff', fontSize: 15 },
  profileText: { flex: 1 },
  profileName: { ...typography.title, fontSize: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ecb5f',
    marginRight: 6,
  },
  statusText: { ...typography.body, fontSize: 13 },
  switcherCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  switcherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  switcherTitleWrap: { flex: 1 },
  switcherTitle: { ...typography.title, fontSize: 18 },
  switcherMeta: { ...typography.body, fontSize: 13, marginTop: 4 },
  switcherToggle: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  switcherToggleText: { ...typography.label, fontSize: 12 },
  selectedCompanyChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 14,
  },
  selectedCompanyChipText: { ...typography.heading, fontSize: 14 },
  selectedCompanyRole: { ...typography.bodyStrong, fontSize: 12, marginTop: 4 },
  switcherList: { gap: 10, marginTop: 12 },
  switcherItem: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  switcherItemText: { ...typography.heading, fontSize: 14 },
  switcherItemRole: { ...typography.body, fontSize: 12, marginTop: 4 },
  noOtherCompanyText: { ...typography.body, fontSize: 13 },
  groupCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  menuItem: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuItemText: { ...typography.bodyStrong, fontSize: 17 },
  inlineCard: { borderTopWidth: 1, padding: 14 },
  detailTitle: { ...typography.title, fontSize: 18, marginBottom: 10 },
  label: { ...typography.label, fontSize: 12, marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  primaryButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { ...typography.heading, color: '#fff', fontSize: 14 },
  dangerButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  deleteHint: { ...typography.body, fontSize: 13, lineHeight: 19 },
  infoLabel: { ...typography.label, fontSize: 12, marginTop: 8 },
  infoValue: { ...typography.bodyStrong, fontSize: 15, marginTop: 4 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  currencyOption: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 132,
  },
  currencyOptionText: { ...typography.heading, fontSize: 13 },
  currencyOptionMeta: { ...typography.body, fontSize: 11, marginTop: 4 },
  languageSummary: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  languageOption: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageOptionText: { ...typography.heading, fontSize: 14 },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionText: { ...typography.heading, fontSize: 14 },
  actionSpacing: { marginTop: 10 },
  logoutRow: {
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  versionLabel: { ...typography.label, fontSize: 12 },
  versionValue: { ...typography.body, fontSize: 13 },
});
