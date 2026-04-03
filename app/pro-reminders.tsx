import { useCallback, useEffect, useState } from 'react';
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
import { ArrowLeft, BellRing, Plus } from 'lucide-react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { DateField } from '@/components/DateField';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { formatTRY } from '@/lib/format';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

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

export default function ProRemindersScreen() {
  const { company } = useAuth();
  const { theme } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    note: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    customerId: '',
  });
  const localeTag = t.locale() === 'tr' ? 'tr-TR' : 'en-US';

  const loadData = useCallback(async () => {
    if (!company) {
      setReminders([]);
      setCustomers([]);
      return;
    }

    const [remindersResult, customersResult] = await Promise.all([
      supabase
        .from('collection_reminders')
        .select('id, title, note, amount, due_date, status, customers(name)')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true }),
      supabase.from('customers').select('id, name').eq('company_id', company.id).order('name'),
    ]);

    if (remindersResult.error || customersResult.error) {
      throw new Error(
        remindersResult.error?.message ||
          customersResult.error?.message ||
          t.businessTools.errors.loadFailed
      );
    }

    const normalized = ((((remindersResult.data as unknown) as ReminderRow[]) ?? []).map(
      (reminder) => ({
        ...reminder,
        customers: Array.isArray(reminder.customers)
          ? reminder.customers[0] ?? null
          : reminder.customers,
      })
    ));

    setReminders(normalized);
    setCustomers((customersResult.data as CustomerRow[]) ?? []);
  }, [company]);

  useEffect(() => {
    void loadData().catch((error: unknown) => {
      Alert.alert(t.common.error, error instanceof Error ? error.message : t.businessTools.errors.loadFailed);
    });
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddReminder = async () => {
    if (!company) {
      return;
    }

    if (!reminderForm.title.trim()) {
      Alert.alert(t.common.info, t.businessTools.reminders.titleRequired);
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
      setShowAddForm(false);
      await loadData();
    } catch (error: unknown) {
      Alert.alert(
        t.common.error,
        error instanceof Error ? error.message : t.businessTools.reminders.addFailed
      );
    } finally {
      setSavingReminder(false);
    }
  };

  const getRemainingText = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);

    if (localeTag === 'tr-TR') {
      if (diff <= 0) return 'Bugün';
      if (diff === 1) return '1 gün kaldı';
      return `${diff} gün kaldı`;
    }

    if (diff <= 0) return 'Today';
    if (diff === 1) return '1 day left';
    return `${diff} days left`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <BrandHeroHeader
        kicker={t.businessTools.kicker}
        title={t.dashboard.pro.reminders.title}
        subtitle={t.dashboard.pro.reminders.text}
        rightAccessory={
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t.dashboard.pro.reminders.title}
          </Text>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.primarySoft }]}
            onPress={() => setShowAddForm((current) => !current)}
          >
            <Plus size={18} color={theme.colors.primaryStrong} />
          </TouchableOpacity>
        </View>

        {showAddForm ? (
          <View style={styles.formCard}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder={t.businessTools.reminders.titlePlaceholder}
              placeholderTextColor={theme.colors.textSoft}
              value={reminderForm.title}
              onChangeText={(title) => setReminderForm((current) => ({ ...current, title }))}
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder={t.businessTools.reminders.amountPlaceholder}
              placeholderTextColor={theme.colors.textSoft}
              value={reminderForm.amount}
              onChangeText={(amount) => setReminderForm((current) => ({ ...current, amount }))}
              keyboardType="decimal-pad"
            />
            <DateField
              label={t.businessTools.reminders.dueDate}
              value={reminderForm.dueDate}
              onChange={(dueDate) => setReminderForm((current) => ({ ...current, dueDate }))}
              textColor={theme.colors.text}
              mutedColor={theme.colors.textMuted}
              backgroundColor={theme.colors.surfaceMuted}
              borderColor={theme.colors.border}
              accentColor={theme.colors.primary}
            />
            <View style={styles.customerList}>
              {customers.map((customer) => {
                const active = reminderForm.customerId === customer.id;
                return (
                  <TouchableOpacity
                    key={customer.id}
                    style={[
                      styles.customerChip,
                      {
                        backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() =>
                      setReminderForm((current) => ({
                        ...current,
                        customerId: current.customerId === customer.id ? '' : customer.id,
                      }))
                    }
                  >
                    <Text style={[styles.customerChipText, { color: active ? theme.colors.primaryStrong : theme.colors.text }]}>
                      {customer.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => void handleAddReminder()}
              disabled={savingReminder}
            >
              <Text style={styles.primaryButtonText}>
                {savingReminder ? t.businessTools.reminders.adding : t.dashboard.pro.reminders.addAction}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.list}>
          {reminders.map((reminder) => (
            <View
              key={reminder.id}
              style={[styles.row, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                <BellRing size={16} color={theme.colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{reminder.title}</Text>
                <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                  {new Date(reminder.due_date).toLocaleDateString(localeTag)} - {getRemainingText(reminder.due_date)}
                </Text>
              </View>
              <Text style={[styles.amountText, { color: theme.colors.primaryStrong }]}>
                {formatTRY(reminder.amount || 0)}
              </Text>
            </View>
          ))}
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { ...typography.title, fontSize: 18 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 12,
  },
  customerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  customerChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  customerChipText: {
    ...typography.label,
    fontSize: 13,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.heading,
    color: '#fff',
    fontSize: 15,
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { ...typography.heading, fontSize: 14 },
  rowMeta: { ...typography.body, fontSize: 12, lineHeight: 18, marginTop: 4 },
  amountText: { ...typography.heading, fontSize: 13 },
});
