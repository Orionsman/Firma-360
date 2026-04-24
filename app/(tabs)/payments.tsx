import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Plus,
  X,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { DateField } from '@/components/DateField';
import { formatAppDate, formatSignedTRY, formatTRY } from '@/lib/format';
import { t } from '@/lib/i18n';
import { readOfflineCache, writeOfflineCache } from '@/lib/offlineCache';
import { createLocalId, enqueueOfflineMutation } from '@/lib/offlineWriteQueue';
import { typography } from '@/lib/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_type: 'income' | 'expense';
  payment_method: string;
  description?: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  customers?: { name: string } | null;
  suppliers?: { name: string } | null;
}

interface Customer {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function Payments() {
  const { company } = useAuth();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const modalBottomSpacing =
    Math.max(insets.bottom, Platform.OS === 'android' ? 34 : 20) + 24;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    description: '',
    relatedPartyId: '',
  });
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showPartyPicker, setShowPartyPicker] = useState(false);
  const [partySearch, setPartySearch] = useState('');

  const ensureCompany = () => {
    if (!company) {
      Alert.alert(t.common.companyRequiredTitle, t.common.companyRequiredText);
      return false;
    }

    return true;
  };

  const fetchPayments = useCallback(async () => {
    if (!company) {
      setPayments([]);
      return;
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*, customers(name), suppliers(name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      const cached = await readOfflineCache<Payment[]>('payments-list', company.id);
      if (cached?.data) {
        setPayments(cached.data);
        return;
      }
      Alert.alert(t.common.error, error.message);
      return;
    }

    const nextPayments = (data as Payment[]) ?? [];
    setPayments(nextPayments);
    await writeOfflineCache('payments-list', company.id, nextPayments);
  }, [company]);

  const fetchCustomers = useCallback(async () => {
    if (!company) {
      setCustomers([]);
      return;
    }

    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .eq('company_id', company.id);

    if (error) {
      const cached = await readOfflineCache<Customer[]>('payments-customers', company.id);
      if (cached?.data) {
        setCustomers(cached.data);
      }
      return;
    }

    const nextCustomers = data ?? [];
    setCustomers(nextCustomers);
    await writeOfflineCache('payments-customers', company.id, nextCustomers);
  }, [company]);

  const fetchSuppliers = useCallback(async () => {
    if (!company) {
      setSuppliers([]);
      return;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', company.id);

    if (error) {
      const cached = await readOfflineCache<Supplier[]>('payments-suppliers', company.id);
      if (cached?.data) {
        setSuppliers(cached.data);
      }
      return;
    }

    const nextSuppliers = data ?? [];
    setSuppliers(nextSuppliers);
    await writeOfflineCache('payments-suppliers', company.id, nextSuppliers);
  }, [company]);

  useEffect(() => {
    void Promise.all([fetchPayments(), fetchCustomers(), fetchSuppliers()]);
  }, [fetchCustomers, fetchPayments, fetchSuppliers]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([fetchPayments(), fetchCustomers(), fetchSuppliers()]);
    }, [fetchCustomers, fetchPayments, fetchSuppliers])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPayments(), fetchCustomers(), fetchSuppliers()]);
    setRefreshing(false);
  };

  const resetPaymentForm = () => {
    setFormData({
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      description: '',
      relatedPartyId: '',
    });
    setEditingPayment(null);
  };

  const handleSavePayment = async () => {
    if (!formData.amount.trim()) {
      Alert.alert(t.common.error, t.common.amountRequired);
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t.common.error, t.common.validAmountRequired);
      return;
    }

    if (!ensureCompany()) {
      return;
    }

    const payload = {
      company_id: company!.id,
      customer_id:
        activeTab === 'income' && formData.relatedPartyId
          ? formData.relatedPartyId
          : null,
      supplier_id:
        activeTab === 'expense' && formData.relatedPartyId
          ? formData.relatedPartyId
          : null,
      amount: parsedAmount,
      payment_date: formData.paymentDate,
      payment_type: activeTab,
      payment_method: formData.paymentMethod,
      description: formData.description.trim() || null,
    };

    setSaving(true);
    try {
      const { error } = editingPayment
        ? await supabase
            .from('payments')
            .update(payload)
            .eq('id', editingPayment.id)
            .eq('company_id', company!.id)
        : await supabase.from('payments').insert(payload);

      if (error) {
        throw error;
      }

      resetPaymentForm();
      setModalVisible(false);
      await Promise.all([fetchPayments(), fetchCustomers(), fetchSuppliers()]);
    } catch {
      const recordId = editingPayment?.id || createLocalId();
      const localPayment: Payment = {
        id: recordId,
        amount: parsedAmount,
        payment_date: formData.paymentDate,
        payment_type: activeTab,
        payment_method: formData.paymentMethod,
        description: formData.description.trim() || undefined,
        customer_id: activeTab === 'income' ? formData.relatedPartyId || null : null,
        supplier_id: activeTab === 'expense' ? formData.relatedPartyId || null : null,
        customers:
          activeTab === 'income' && formData.relatedPartyId
            ? { name: customers.find((item) => item.id === formData.relatedPartyId)?.name || '' }
            : null,
        suppliers:
          activeTab === 'expense' && formData.relatedPartyId
            ? { name: suppliers.find((item) => item.id === formData.relatedPartyId)?.name || '' }
            : null,
      };

      const nextPayments = editingPayment
        ? payments.map((item) => (item.id === editingPayment.id ? localPayment : item))
        : [localPayment, ...payments];

      setPayments(nextPayments);
      await writeOfflineCache('payments-list', company!.id, nextPayments);
      await enqueueOfflineMutation({
        kind: 'upsert',
        mode: editingPayment ? 'update' : 'insert',
        table: 'payments',
        companyId: company!.id,
        recordId,
        payload,
      });

      resetPaymentForm();
      setModalVisible(false);
      Alert.alert(t.common.error, t.locale() === 'tr' ? 'Bağlantı yok. Ödeme cihazda saklandı ve daha sonra senkronlanacak.' : 'No connection. The payment was saved on this device and will sync later.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (payment: Payment) => {
    if (!company) {
      return;
    }

    try {
      setDeletingId(payment.id);
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', payment.id)
        .eq('company_id', company.id);

      if (error) {
        throw error;
      }

      await Promise.all([fetchPayments(), fetchCustomers(), fetchSuppliers()]);
    } catch {
      const nextPayments = payments.filter((item) => item.id !== payment.id);
      setPayments(nextPayments);
      await writeOfflineCache('payments-list', company.id, nextPayments);
      await enqueueOfflineMutation({
        kind: 'delete',
        table: 'payments',
        companyId: company.id,
        recordId: payment.id,
      });
      Alert.alert(t.common.error, t.locale() === 'tr' ? 'Bağlantı yok. Silme işlemi sıraya alındı.' : 'No connection. Delete was queued.');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeletePayment = (payment: Payment) => {
    Alert.alert(t.payments.deleteConfirmTitle, t.payments.deleteConfirmText, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          void handleDeletePayment(payment);
        },
      },
    ]);
  };

  const relatedParties = useMemo(
    () => (activeTab === 'income' ? customers : suppliers),
    [activeTab, customers, suppliers]
  );

  const filteredRelatedParties = useMemo(
    () =>
      relatedParties.filter((party) =>
        party.name.toLowerCase().includes(partySearch.trim().toLowerCase())
      ),
    [partySearch, relatedParties]
  );

  const filteredPayments = useMemo(
    () => payments.filter((payment) => payment.payment_type === activeTab),
    [payments, activeTab]
  );

  const getTotalAmount = (type: 'income' | 'expense') =>
    payments
      .filter((payment) => payment.payment_type === type)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const getRelatedParty = (payment: Payment) =>
    payment.payment_type === 'income'
      ? payment.customers?.name || t.payments.noCustomer
      : payment.suppliers?.name || t.payments.noSupplier;

  const getPaymentMethodText = (method: string) =>
    t.payments.methods[method as keyof typeof t.payments.methods] || method;

  const openEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setActiveTab(payment.payment_type);
    setFormData({
      amount: String(payment.amount ?? ''),
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method || 'cash',
      description: payment.description || '',
      relatedPartyId:
        payment.payment_type === 'income'
          ? payment.customer_id || ''
          : payment.supplier_id || '',
    });
    setModalVisible(true);
  };

  const renderPayment = ({ item }: { item: Payment }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
      activeOpacity={0.88}
      onPress={() => openEditPayment(item)}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor:
              item.payment_type === 'income'
                ? theme.colors.primarySoft
                : theme.colors.dangerSoft,
          },
        ]}
      >
        {item.payment_type === 'income' ? (
          <ArrowDownLeft size={24} color={theme.colors.success} />
        ) : (
          <ArrowUpRight size={24} color={theme.colors.danger} />
        )}
      </View>

      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{getRelatedParty(item)}</Text>
        <Text style={[styles.itemDetail, { color: theme.colors.textMuted }]}>
          {getPaymentMethodText(item.payment_method)}
        </Text>
        {item.description ? (
          <Text style={[styles.itemDescription, { color: theme.colors.textSoft }]}>
            {item.description}
          </Text>
        ) : null}
        <Text style={[styles.itemDate, { color: theme.colors.textSoft }]}>
          {formatAppDate(item.payment_date)}
        </Text>
      </View>

      <View style={styles.amountColumn}>
        <Text
          style={[
            styles.itemAmount,
            item.payment_type === 'income'
              ? styles.incomeAmount
              : styles.expenseAmount,
          ]}
        >
          {formatSignedTRY(
            item.payment_type === 'income' ? item.amount : -Number(item.amount)
          )}
        </Text>
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.colors.dangerSoft }]}
          onPress={() => confirmDeletePayment(item)}
          disabled={deletingId === item.id}
          hitSlop={8}
        >
          <Trash2 size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const methodOptions = [
    { value: 'cash', label: t.payments.methods.cash },
    { value: 'bank_transfer', label: t.payments.methods.bank_transfer },
    { value: 'credit_card', label: t.payments.methods.credit_card },
    { value: 'check', label: t.payments.methods.check },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BrandHeroHeader
        kicker={t.payments.kicker}
        brandSubtitle={t.payments.heroSubtitle}
        rightAccessory={
          <TouchableOpacity
            onPress={() => {
              if (!ensureCompany()) {
                return;
              }
              setModalVisible(true);
            }}
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          >
            <View style={styles.addPaymentIcon}>
              <Wallet size={20} color="#ffffff" />
              <View style={styles.addBadge}>
                <Plus size={12} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        }
      />

      <View style={styles.tabsOuter}>
        <View
          style={[
            styles.tabs,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'income' && [styles.activeTab, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('income')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'income' ? theme.colors.primary : theme.colors.textMuted }]}>
            {t.payments.income}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expense' && [styles.activeTab, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('expense')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'expense' ? theme.colors.primary : theme.colors.textMuted }]}>
            {t.payments.expense}
          </Text>
        </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: activeTab === 'income' ? '#EEF9F2' : '#FFF1F0',
            borderColor: activeTab === 'income' ? '#D2EFDD' : '#FFD8D4',
          },
        ]}
      >
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
            {activeTab === 'income' ? t.payments.totalIncome : t.payments.totalExpense}
          </Text>
          <Text
            style={[
              styles.summaryAmount,
              activeTab === 'income' ? styles.incomeAmount : styles.expenseAmount,
            ]}
          >
            {formatTRY(getTotalAmount(activeTab))}
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredPayments}
        renderItem={renderPayment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
              <Wallet size={30} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>
              {activeTab === 'income' ? t.payments.emptyIncome : t.payments.emptyExpense}
            </Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingPayment
                  ? activeTab === 'income'
                    ? (t.locale() === 'tr' ? 'Geliri Düzenle' : 'Edit Income')
                    : (t.locale() === 'tr' ? 'Gideri Düzenle' : 'Edit Expense')
                  : activeTab === 'income'
                    ? t.payments.newIncome
                    : t.payments.newExpense}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetPaymentForm(); }}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={[styles.form, { paddingBottom: modalBottomSpacing }]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                  {t.payments.amount} *
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
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.amount}
                  onChangeText={(text) => setFormData({ ...formData, amount: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              <DateField
                label={t.common.fields.date}
                value={formData.paymentDate}
                onChange={(paymentDate) => setFormData({ ...formData, paymentDate })}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textMuted}
                backgroundColor={theme.colors.surfaceMuted}
                borderColor={theme.colors.border}
                accentColor={theme.colors.primary}
              />

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.payments.paymentMethod}</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setShowMethodPicker(true)}
                >
                  <Text style={[styles.pickerValue, { color: theme.colors.text }]}>
                    {getPaymentMethodText(formData.paymentMethod)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                  {activeTab === 'income' ? t.common.entities.customer : t.common.entities.supplier}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setShowPartyPicker(true)}
                >
                  <Text style={[styles.pickerValue, { color: theme.colors.text }]}>
                    {formData.relatedPartyId
                      ? relatedParties.find((party) => party.id === formData.relatedPartyId)?.name
                      : activeTab === 'income'
                        ? `${t.common.entities.customer} ${t.payments.partySelectSuffix}`
                        : `${t.common.entities.supplier} ${t.payments.partySelectSuffix}`}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.payments.description}</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder={t.payments.description}
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: theme.colors.primary },
                  saving && styles.buttonDisabled,
                ]}
                onPress={handleSavePayment}
                disabled={saving}
              >
                <Text style={styles.submitButtonText}>
                  {saving ? t.common.saving : t.common.save}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showMethodPicker} animationType="slide" transparent>
        <View style={styles.pickerModal}>
          <View style={[styles.pickerContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t.payments.paymentMethodSelect}
              </Text>
              <TouchableOpacity onPress={() => setShowMethodPicker(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {methodOptions.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setFormData({ ...formData, paymentMethod: method.value });
                    setShowMethodPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPartyPicker} animationType="slide" transparent>
        <View style={styles.pickerModal}>
          <View style={[styles.pickerContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {(activeTab === 'income' ? t.common.entities.customer : t.common.entities.supplier) +
                  ' ' +
                  t.payments.partySelectSuffix}
              </Text>
              <TouchableOpacity onPress={() => setShowPartyPicker(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder={t.common.search}
                placeholderTextColor={theme.colors.textSoft}
                value={partySearch}
                onChangeText={setPartySearch}
              />
            </View>
            <FlatList
              data={filteredRelatedParties}
              keyExtractor={(item) => item.id}
              style={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.pickerListContent}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setFormData({ ...formData, relatedPartyId: '' });
                    setPartySearch('');
                    setShowPartyPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>
                    {t.common.selectPlaceholder}
                  </Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setFormData({ ...formData, relatedPartyId: item.id });
                    setPartySearch('');
                    setShowPartyPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    fontSize: 24,
    color: '#0f172a',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  addPaymentIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBadge: {
    position: 'absolute',
    right: -4,
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsOuter: { paddingHorizontal: 16, marginTop: -10, marginBottom: 4 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, padding: 6, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {},
  tabText: {
    ...typography.label,
    fontSize: 14,
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.label,
    fontSize: 14,
  },
  summaryAmount: {
    ...typography.hero,
    fontSize: 24,
  },
  incomeAmount: {
    color: '#22c55e',
  },
  expenseAmount: {
    color: '#ef4444',
  },
  list: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  listItem: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...typography.heading,
    fontSize: 16,
    marginBottom: 4,
  },
  itemDetail: {
    ...typography.caption,
    fontSize: 13,
  },
  itemDescription: {
    ...typography.caption,
    fontSize: 13,
    marginTop: 2,
  },
  itemDate: {
    ...typography.caption,
    fontSize: 13,
    marginTop: 4,
  },
  amountColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  itemAmount: {
    ...typography.heading,
    fontSize: 16,
  },
  deleteButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 22,
  },
  emptyIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.title,
    fontSize: 20,
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  pickerValue: {
    ...typography.heading,
    fontSize: 16,
  },
  submitButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.heading,
    color: '#ffffff',
    fontSize: 16,
  },
  pickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '55%',
  },
  searchBox: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerListContent: {
    paddingBottom: 20,
  },
  pickerItemText: {
    ...typography.heading,
    fontSize: 16,
  },
});
