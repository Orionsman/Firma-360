import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  DatabaseBackup,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { DateField } from '@/components/DateField';
import { useAuth } from '@/contexts/AuthContext';
import { syncCollectionReminderNotifications } from '@/lib/collectionReminderNotifications';
import { useAppTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { typography } from '@/lib/typography';

type MemberRow = {
  user_id: string;
  role: 'owner' | 'admin' | 'user';
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
};

type InvitationRow = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
};

type SnapshotRow = {
  id: string;
  snapshot_name: string;
  created_at: string;
};

type ReminderRow = {
  id: string;
  title: string;
  note?: string | null;
  amount?: number | null;
  due_date: string;
  status: 'pending' | 'completed' | 'dismissed';
  customers?: { name: string } | null;
};

type CustomerRow = {
  id: string;
  name: string;
};

export default function BusinessToolsScreen() {
  const {
    company,
    companies,
    activeCompanyId,
    activeRole,
    switchCompany,
    createAdditionalCompany,
  } = useAuth();
  const { theme } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<(MemberRow & { profile?: ProfileRow | null })[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [snapshotName, setSnapshotName] = useState('');
  const [reminderForm, setReminderForm] = useState({
    title: '',
    note: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    customerId: '',
  });
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);

  const canManageCompany = activeRole === 'owner' || activeRole === 'admin';

  const loadData = useCallback(async () => {
    if (!company) {
      setMembers([]);
      setInvitations([]);
      setSnapshots([]);
      setReminders([]);
      setCustomers([]);
      return;
    }

    const [membersResult, invitationsResult, snapshotsResult, remindersResult, customersResult] =
      await Promise.all([
        supabase
          .from('user_companies')
          .select('user_id, role, created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('team_invitations')
          .select('id, email, role, status, created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('company_snapshots')
          .select('id, snapshot_name, created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('collection_reminders')
          .select('id, title, note, amount, due_date, status, customers(name)')
          .eq('company_id', company.id)
          .order('due_date', { ascending: true }),
        supabase
          .from('customers')
          .select('id, name')
          .eq('company_id', company.id)
          .order('name', { ascending: true }),
      ]);

    if (membersResult.error || invitationsResult.error || snapshotsResult.error || remindersResult.error || customersResult.error) {
      throw new Error(
        membersResult.error?.message ||
          invitationsResult.error?.message ||
          snapshotsResult.error?.message ||
          remindersResult.error?.message ||
          customersResult.error?.message ||
          'Veriler yuklenemedi.'
      );
    }

    const memberRows = (membersResult.data as MemberRow[]) ?? [];
    const profileIds = memberRows.map((row) => row.user_id);
    const profilesResult =
      profileIds.length > 0
        ? await supabase
            .from('profiles')
            .select('user_id, email, full_name')
            .in('user_id', profileIds)
        : { data: [], error: null };

    if (profilesResult.error) {
      throw profilesResult.error;
    }

    const profiles = new Map(
      ((profilesResult.data as ProfileRow[]) ?? []).map((profile) => [profile.user_id, profile])
    );

    setMembers(
      memberRows.map((row) => ({
        ...row,
        profile: profiles.get(row.user_id) ?? null,
      }))
    );
    setInvitations((invitationsResult.data as InvitationRow[]) ?? []);
    setSnapshots((snapshotsResult.data as SnapshotRow[]) ?? []);
    const normalizedReminders = ((((remindersResult.data as unknown) as ReminderRow[]) ?? []).map((reminder) => ({
      ...reminder,
      customers: Array.isArray(reminder.customers)
        ? reminder.customers[0] ?? null
        : reminder.customers,
    })));

    setReminders(normalizedReminders);
    setCustomers((customersResult.data as CustomerRow[]) ?? []);
    await syncCollectionReminderNotifications(normalizedReminders);
  }, [company]);

  useEffect(() => {
    void loadData().catch((error: unknown) => {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Veriler yuklenemedi.');
    });
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error: unknown) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Veriler yenilenemedi.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      Alert.alert('Bilgi', 'Yeni firma adi gerekli.');
      return;
    }

    setSavingCompany(true);
    try {
      await createAdditionalCompany(newCompanyName);
      setNewCompanyName('');
      Alert.alert('Basarili', 'Yeni firma olusturuldu ve aktif hale getirildi.');
    } catch (error: unknown) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Firma olusturulamadi.');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleInvite = async () => {
    if (!company) {
      return;
    }

    if (!inviteEmail.trim()) {
      Alert.alert('Bilgi', 'Davet e-postasi gerekli.');
      return;
    }

    setSavingInvite(true);
    try {
      const { error } = await supabase.from('team_invitations').insert({
        company_id: company.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });

      if (error) {
        throw error;
      }

      setInviteEmail('');
      setInviteRole('user');
      await loadData();
      Alert.alert('Basarili', 'Ekip daveti olusturuldu.');
    } catch (error: unknown) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Davet olusturulamadi.');
    } finally {
      setSavingInvite(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!company) {
      return;
    }

    setSavingSnapshot(true);
    try {
      const { error } = await supabase.rpc('create_company_snapshot', {
        target_company_id: company.id,
        requested_name: snapshotName.trim() || null,
      });

      if (error) {
        throw error;
      }

      setSnapshotName('');
      await loadData();
      Alert.alert('Basarili', 'Bulut yedegi olusturuldu.');
    } catch (error: unknown) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Yedek olusturulamadi.');
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    Alert.alert(
      'Yedek geri yuklensin mi?',
      'Bu islem mevcut firma verilerini secilen yedekle degistirir.',
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Geri Yukle',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('restore_company_snapshot', {
                target_snapshot_id: snapshotId,
              });
              if (error) {
                throw error;
              }
              await loadData();
              Alert.alert('Basarili', 'Yedek geri yuklendi.');
            } catch (error: unknown) {
              Alert.alert(
                'Hata',
                error instanceof Error ? error.message : 'Yedek geri yuklenemedi.'
              );
            }
          },
        },
      ]
    );
  };

  const handleAddReminder = async () => {
    if (!company) {
      return;
    }

    if (!reminderForm.title.trim()) {
      Alert.alert('Bilgi', 'Hatirlatma basligi gerekli.');
      return;
    }

    setSavingReminder(true);
    try {
      const { error } = await supabase.from('collection_reminders').insert({
        company_id: company.id,
        customer_id: reminderForm.customerId || null,
        title: reminderForm.title.trim(),
        note: reminderForm.note.trim() || null,
        amount: reminderForm.amount ? Number(reminderForm.amount) : 0,
        due_date: reminderForm.dueDate,
      });

      if (error) {
        throw error;
      }

      setReminderForm({
        title: '',
        note: '',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        customerId: '',
      });
      await loadData();
      Alert.alert('Basarili', 'Tahsilat hatirlatmasi eklendi.');
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Hatirlatma kaydedilemedi.'
      );
    } finally {
      setSavingReminder(false);
    }
  };

  const markReminder = async (id: string, status: ReminderRow['status']) => {
    try {
      const { error } = await supabase
        .from('collection_reminders')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error: unknown) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Hatirlatma guncellenemedi.');
    }
  };

  const pendingReminderCount = useMemo(
    () => reminders.filter((reminder) => reminder.status === 'pending').length,
    [reminders]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <BrandHeroHeader
          kicker="ISLETME ARACLARI"
          title="Pro Ozellikler"
          subtitle="Coklu firma, ekip erisimi, bulut yedekleme ve tahsilat takibini yonetin."
          rightAccessory={
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={18} color="#fff" />
            </TouchableOpacity>
          }
        />

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Building2 size={20} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Coklu Isletme Yonetimi</Text>
          </View>
          <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
            Aktif firma secimi yapabilir veya yeni bir firma olusturabilirsiniz.
          </Text>
          <View style={styles.companyList}>
            {companies.map((membership) => {
              const isActive = membership.company_id === activeCompanyId;
              return (
                <TouchableOpacity
                  key={membership.company_id}
                  style={[
                    styles.companyChip,
                    {
                      backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                      borderColor: isActive ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => void switchCompany(membership.company_id)}
                >
                  <Text style={[styles.companyChipText, { color: isActive ? theme.colors.primary : theme.colors.text }]}>
                    {membership.companies?.name} ({membership.role})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Yeni firma adi"
            placeholderTextColor={theme.colors.textSoft}
            value={newCompanyName}
            onChangeText={setNewCompanyName}
          />
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }, savingCompany && styles.buttonDisabled]}
            onPress={handleCreateCompany}
            disabled={savingCompany}
          >
            <Text style={styles.primaryButtonText}>{savingCompany ? 'Olusturuluyor...' : 'Yeni Firma Ekle'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Users size={20} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Personel ve Ekip Erisimi</Text>
          </View>
          <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
            Davet edilen kullanicilar ayni firmaya kendi hesaplariyla baglanabilir.
          </Text>
          {canManageCompany ? (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="personel@firma.com"
                placeholderTextColor={theme.colors.textSoft}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={styles.companyList}>
                {(['user', 'admin'] as const).map((role) => {
                  const active = inviteRole === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.companyChip,
                        {
                          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setInviteRole(role)}
                    >
                      <Text style={[styles.companyChipText, { color: active ? theme.colors.primary : theme.colors.text }]}>
                        {role === 'admin' ? 'Yonetici' : 'Kullanici'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }, savingInvite && styles.buttonDisabled]}
                onPress={handleInvite}
                disabled={savingInvite}
              >
                <Mail size={16} color="#fff" />
                <Text style={styles.primaryButtonText}>{savingInvite ? 'Gonderiliyor...' : 'Davet Gonder'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
              Ekip yonetimi icin owner veya admin rolune ihtiyaciniz var.
            </Text>
          )}
          <View style={styles.sectionList}>
            {members.map((member) => (
              <View key={member.user_id} style={[styles.listRow, { borderColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                    {member.profile?.full_name || member.profile?.email || member.user_id.slice(0, 8)}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                    {member.role} • {new Date(member.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <ShieldCheck size={18} color={theme.colors.primary} />
              </View>
            ))}
            {invitations.map((invite) => (
              <View key={invite.id} style={[styles.listRow, { borderColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{invite.email}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                    {invite.role} • {invite.status}
                  </Text>
                </View>
                <Text style={[styles.pendingBadge, { color: theme.colors.primary }]}>{invite.status}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <DatabaseBackup size={20} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Bulut Yedekleme ve Geri Yukleme</Text>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Yedek adi (opsiyonel)"
            placeholderTextColor={theme.colors.textSoft}
            value={snapshotName}
            onChangeText={setSnapshotName}
          />
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }, savingSnapshot && styles.buttonDisabled]}
            onPress={handleCreateSnapshot}
            disabled={!canManageCompany || savingSnapshot}
          >
            <Text style={styles.primaryButtonText}>{savingSnapshot ? 'Hazirlaniyor...' : 'Bulut Yedegi Olustur'}</Text>
          </TouchableOpacity>
          <View style={styles.sectionList}>
            {snapshots.map((snapshot) => (
              <View key={snapshot.id} style={[styles.listRow, { borderColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{snapshot.snapshot_name}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                    {new Date(snapshot.created_at).toLocaleString('tr-TR')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRestoreSnapshot(snapshot.id)}>
                  <RefreshCcw size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Mail size={20} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Tahsilat Hatirlatmalari</Text>
          </View>
          <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
            Bekleyen hatirlatma sayisi: {pendingReminderCount}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Hatirlatma basligi"
            placeholderTextColor={theme.colors.textSoft}
            value={reminderForm.title}
            onChangeText={(title) => setReminderForm((current) => ({ ...current, title }))}
          />
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Not"
            placeholderTextColor={theme.colors.textSoft}
            value={reminderForm.note}
            onChangeText={(note) => setReminderForm((current) => ({ ...current, note }))}
            multiline
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Tutar"
            placeholderTextColor={theme.colors.textSoft}
            value={reminderForm.amount}
            onChangeText={(amount) => setReminderForm((current) => ({ ...current, amount }))}
            keyboardType="decimal-pad"
          />
          <DateField
            label="Vade tarihi"
            value={reminderForm.dueDate}
            onChange={(dueDate) => setReminderForm((current) => ({ ...current, dueDate }))}
            textColor={theme.colors.text}
            mutedColor={theme.colors.textMuted}
            backgroundColor={theme.colors.surfaceMuted}
            borderColor={theme.colors.border}
            accentColor={theme.colors.primary}
          />
          <View style={styles.companyList}>
            <TouchableOpacity
              style={[
                styles.companyChip,
                {
                  backgroundColor: !reminderForm.customerId ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                  borderColor: !reminderForm.customerId ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setReminderForm((current) => ({ ...current, customerId: '' }))}
            >
              <Text style={[styles.companyChipText, { color: !reminderForm.customerId ? theme.colors.primary : theme.colors.text }]}>
                Tum musteriler
              </Text>
            </TouchableOpacity>
            {customers.slice(0, 8).map((customer) => {
              const active = reminderForm.customerId === customer.id;
              return (
                <TouchableOpacity
                  key={customer.id}
                  style={[
                    styles.companyChip,
                    {
                      backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() =>
                    setReminderForm((current) => ({ ...current, customerId: customer.id }))
                  }
                >
                  <Text style={[styles.companyChipText, { color: active ? theme.colors.primary : theme.colors.text }]}>
                    {customer.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }, savingReminder && styles.buttonDisabled]}
            onPress={handleAddReminder}
            disabled={savingReminder}
          >
            <Text style={styles.primaryButtonText}>{savingReminder ? 'Kaydediliyor...' : 'Hatirlatma Ekle'}</Text>
          </TouchableOpacity>
          <View style={styles.sectionList}>
            {reminders.map((reminder) => (
              <View key={reminder.id} style={[styles.listRow, { borderColor: theme.colors.border }]}>
                <View style={styles.reminderText}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{reminder.title}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                    {(reminder.customers?.name ? `${reminder.customers.name} • ` : '') +
                      new Date(reminder.due_date).toLocaleDateString('tr-TR')}
                  </Text>
                  {reminder.note ? (
                    <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>{reminder.note}</Text>
                  ) : null}
                </View>
                <View style={styles.reminderActions}>
                  <TouchableOpacity onPress={() => void markReminder(reminder.id, 'completed')}>
                    <Text style={[styles.pendingBadge, { color: theme.colors.success }]}>Tamamla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => void markReminder(reminder.id, 'dismissed')}>
                    <Text style={[styles.pendingBadge, { color: theme.colors.danger }]}>Kapat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 36,
  },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  helperText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
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
  buttonDisabled: {
    opacity: 0.6,
  },
  companyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  companyChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  companyChipText: {
    ...typography.label,
    fontSize: 13,
  },
  sectionList: {
    marginTop: 12,
    gap: 10,
  },
  listRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTitle: {
    ...typography.heading,
    fontSize: 14,
  },
  rowMeta: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 4,
  },
  pendingBadge: {
    ...typography.label,
    fontSize: 12,
  },
  reminderText: {
    flex: 1,
  },
  reminderActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
});
