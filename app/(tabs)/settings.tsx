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
  BriefcaseBusiness,
  FileLock2,
  Info,
  KeyRound,
  Languages,
  LogOut,
  MoonStar,
  Save,
  SunMedium,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

export default function SettingsScreen() {
  const { company, signOut, refreshCompany, deleteAccount } = useAuth();
  const { theme, mode, toggleTheme } = useAppTheme();
  const { locale, setLocale } = useLocale();
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
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    setCompanyName(company?.name || '');
    setTaxNumber(company?.tax_number || '');
    setAddress(company?.address || '');
    setPhone(company?.phone || '');
    setEmail(company?.email || '');
  }, [company]);

  const handleSaveCompany = async () => {
    if (!company) {
      Alert.alert(t.common.info, t.settings.companyNotFound);
      return;
    }

    if (!companyName.trim()) {
      Alert.alert(t.common.error, t.settings.companyNameRequired);
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
      Alert.alert(t.common.success, t.settings.companyUpdated);
    } catch (error: unknown) {
      Alert.alert(
        t.common.error,
        error instanceof Error ? error.message : t.settings.companySaveFailed
      );
    } finally {
      setSavingCompany(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t.common.error, t.settings.password.tooShort);
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
      Alert.alert(t.common.success, t.settings.password.updated);
    } catch (error: unknown) {
      Alert.alert(
        t.common.error,
        error instanceof Error ? error.message : t.settings.password.updateFailed
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
        t.common.error,
        error instanceof Error ? error.message : t.settings.logoutFailed
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t.settings.deletion.confirmTitle,
      t.settings.deletion.confirmText,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.settings.deletion.confirmAction,
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteAccount(deletionReason);
              setDeletionReason('');
              Alert.alert(
                t.settings.deletion.receivedTitle,
                t.settings.deletion.receivedText
              );
              router.replace('/login');
            } catch (error: unknown) {
              Alert.alert(
                t.common.error,
                error instanceof Error ? error.message : t.settings.deletion.failed
              );
            } finally {
              setDeletingAccount(false);
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
        kicker={t.settings.kicker}
        title={t.settings.title}
        subtitle={t.settings.subtitle}
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
            {mode === 'dark' ? t.settings.switchToLight : t.settings.switchToDark}
          </Text>
        </TouchableOpacity>
      </BrandHeroHeader>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Languages size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Dil Ayarları</Text>
        </View>
        <Text style={[styles.aboutText, { color: theme.colors.textMuted }]}>
          {t.settings.languageDescription}
        </Text>
        <View
          style={[
            styles.languageSummary,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.languageSummaryLabel, { color: theme.colors.textMuted }]}>
            Aktif dil
          </Text>
          <Text style={[styles.languageSummaryValue, { color: theme.colors.text }]}>
            {locale === 'tr' ? 'Türkçe' : 'English'}
          </Text>
        </View>

        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[
              styles.languageOption,
              {
                backgroundColor:
                  locale === 'tr' ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                borderColor:
                  locale === 'tr' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setLocale('tr')}
          >
            <Text
              style={[
                styles.languageOptionText,
                { color: locale === 'tr' ? theme.colors.primaryStrong : theme.colors.text },
              ]}
            >
              {t.common.languages.turkish}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageOption,
              {
                backgroundColor:
                  locale === 'en' ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                borderColor:
                  locale === 'en' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setLocale('en')}
          >
            <Text
              style={[
                styles.languageOptionText,
                { color: locale === 'en' ? theme.colors.primaryStrong : theme.colors.text },
              ]}
            >
              {t.common.languages.english}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Building2 size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t.settings.companyInfo}</Text>
        </View>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          onPress={() => setShowCompanyEditor((current) => !current)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            {showCompanyEditor
              ? t.settings.hideCompanyEditor
              : t.settings.showCompanyEditor}
          </Text>
        </TouchableOpacity>

        {showCompanyEditor ? (
          <View style={styles.editorSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.companyName}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={companyName}
              onChangeText={setCompanyName}
            />

            <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.settings.fields.taxNumber}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={taxNumber}
              onChangeText={setTaxNumber}
            />

            <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.phone}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.email}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.address}</Text>
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
                {savingCompany ? t.common.saving : t.common.save}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <KeyRound size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t.settings.password.title}</Text>
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.password}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder={t.settings.password.placeholder}
          placeholderTextColor={theme.colors.textSoft}
        />

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }, savingPassword && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={savingPassword}
        >
          <KeyRound size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>
            {savingPassword
              ? t.settings.password.updating
              : t.settings.password.action}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <BriefcaseBusiness size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Pro Araçları</Text>
        </View>
        <Text style={[styles.aboutText, { color: theme.colors.textMuted }]}>
          Çoklu işletme, ekip erişimi, bulut yedekleme ve tahsilat hatırlatmalarını yönetin.
        </Text>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          onPress={() => router.push('/business-tools' as never)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            İşletme Araçlarını Aç
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Info size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t.settings.about.title}</Text>
        </View>
        <Text style={[styles.aboutText, { color: theme.colors.textMuted }]}>
          {t.settings.about.text}
        </Text>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          onPress={() => router.push('/privacy-policy' as never)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            {t.settings.about.privacy}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, styles.secondaryButtonSpacing, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          onPress={() => router.push('/account-deletion' as never)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
            {t.settings.about.deletionInfo}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.dangerCard, { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger }]}>
        <View style={styles.cardHeader}>
          <Trash2 size={20} color={theme.colors.danger} />
          <Text style={[styles.dangerCardTitle, { color: theme.colors.danger }]}>
            {t.settings.deletion.title}
          </Text>
        </View>

        <Text style={[styles.dangerText, { color: theme.colors.danger }]}>
          {t.settings.deletion.text}
        </Text>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>
          {t.settings.fields.deletionReason}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          value={deletionReason}
          onChangeText={setDeletionReason}
          multiline
          numberOfLines={4}
          placeholder={t.settings.deletion.placeholder}
          placeholderTextColor={theme.colors.textSoft}
        />

        <View style={styles.inlineInfo}>
          <FileLock2 size={16} color={theme.colors.danger} />
          <Text style={[styles.inlineInfoText, { color: theme.colors.danger }]}>
            {t.settings.deletion.inlineInfo}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: theme.colors.danger }, deletingAccount && styles.buttonDisabled]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
        >
          <Trash2 size={18} color="#ffffff" />
          <Text style={styles.dangerButtonText}>
            {deletingAccount
              ? t.settings.deletion.requesting
              : t.settings.deletion.action}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: theme.colors.primaryStrong }]}
        onPress={handleSignOut}
      >
        <LogOut size={18} color="#ffffff" />
        <Text style={styles.logoutButtonText}>{t.settings.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
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
    paddingVertical: 11,
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
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
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
    borderRadius: 16,
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
    borderRadius: 16,
    padding: 15,
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
    borderRadius: 16,
    padding: 15,
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
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  languageSummary: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  languageSummaryLabel: {
    ...typography.caption,
    fontSize: 12,
  },
  languageSummaryValue: {
    ...typography.heading,
    fontSize: 15,
    marginTop: 4,
  },
  languageOption: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageOptionText: {
    ...typography.heading,
    fontSize: 15,
  },
  aboutText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  dangerCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
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
    borderRadius: 16,
    padding: 15,
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
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 3,
  },
  logoutButtonText: {
    ...typography.heading,
    color: '#ffffff',
    fontSize: 15,
  },
});
