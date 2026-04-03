import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Building2, Trash2 } from 'lucide-react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

export default function ProCompaniesScreen() {
  const { companies, activeCompanyId, switchCompany, createAdditionalCompany, deleteCompany } =
    useAuth();
  const { theme } = useAppTheme();
  const [newCompanyName, setNewCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const localeTag = t.locale() === 'tr' ? 'tr-TR' : 'en-US';

  const handleCreate = async () => {
    if (!newCompanyName.trim()) {
      Alert.alert(t.common.info, t.businessTools.companies.createRequired);
      return;
    }

    setSaving(true);
    try {
      await createAdditionalCompany(newCompanyName.trim());
      setNewCompanyName('');
      Alert.alert(t.common.success, t.businessTools.companies.createSuccess);
    } catch (error: unknown) {
      Alert.alert(
        t.common.error,
        error instanceof Error ? error.message : t.businessTools.companies.createFailed
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (companyId: string, companyName: string) => {
      Alert.alert(
      localeTag === 'tr-TR' ? 'İşletme silinsin mi?' : 'Delete company?',
      localeTag === 'tr-TR'
        ? `${companyName} kalıcı olarak silinecek. Bu işlem geri alınamaz.`
        : `${companyName} will be deleted permanently. This action cannot be undone.`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCompany(companyId);
            } catch (error: unknown) {
              Alert.alert(t.common.error, error instanceof Error ? error.message : 'Delete failed');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BrandHeroHeader
        kicker={t.businessTools.kicker}
        title={t.businessTools.companies.title}
        subtitle={t.businessTools.companies.helper}
        rightAccessory={
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {localeTag === 'tr-TR' ? 'Bağlı İşletmeler' : 'Linked Companies'}
        </Text>
        <View style={styles.list}>
          {companies.map((membership) => {
            const isActive = membership.company_id === activeCompanyId;
            const canDelete = membership.role === 'owner';

            return (
              <View
                key={membership.company_id}
                style={[
                  styles.row,
                  { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
                ]}
              >
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => void switchCompany(membership.company_id)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isActive ? theme.colors.primary : theme.colors.textSoft },
                    ]}
                  />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                      {membership.companies?.name}
                    </Text>
                    <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                      {isActive
                        ? localeTag === 'tr-TR'
                          ? 'Seçili işletme'
                          : 'Selected company'
                        : localeTag === 'tr-TR'
                          ? 'Geçiş yapmak için dokun'
                          : 'Tap to switch'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {canDelete ? (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: theme.colors.dangerSoft }]}
                    onPress={() =>
                      confirmDelete(membership.company_id, membership.companies?.name || '')
                    }
                  >
                    <Trash2 size={18} color={theme.colors.danger} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {localeTag === 'tr-TR' ? 'Yeni İşletme Ekle' : 'Add New Company'}
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
          placeholder={t.businessTools.companies.createPlaceholder}
          placeholderTextColor={theme.colors.textSoft}
          value={newCompanyName}
          onChangeText={setNewCompanyName}
        />
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => void handleCreate()}
          disabled={saving}
        >
          <Building2 size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {saving ? t.businessTools.companies.creating : t.businessTools.companies.createAction}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 18,
    marginBottom: 14,
  },
  list: {
    gap: 10,
  },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...typography.heading,
    fontSize: 15,
  },
  rowMeta: {
    ...typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    ...typography.heading,
    color: '#fff',
    fontSize: 15,
  },
});
