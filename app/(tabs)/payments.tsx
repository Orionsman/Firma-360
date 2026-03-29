import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const ensureCompany = () => {
    if (!company) {
      Alert.alert(
        'Firma gerekli',
        'Once ana sayfadaki firma kurulum kartindan firmanizi olusturmaniz gerekiyor.'
      );
      return false;
    }

    return true;
  };

  const fetchPayments = async () => {
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
      Alert.alert('Hata', error.message);
      return;
    }

    setPayments((data as Payment[]) ?? []);
  };

  const fetchCustomers = async () => {
    if (!company) {
      setCustomers([]);
      return;
    }

    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('company_id', company.id);

    setCustomers(data ?? []);
  };

  const fetchSuppliers = async () => {
    if (!company) {
      setSuppliers([]);
      return;
    }

    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', company.id);

    setSuppliers(data ?? []);
  };

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
    fetchSuppliers();
  }, [company]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([fetchPayments(), fetchCustomers(), fetchSuppliers()]);
    }, [company])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  const handleAddPayment = async () => {
    if (!formData.amount.trim()) {
      Alert.alert('Hata', 'Lutfen tutar girin.');
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Hata', 'Gecerli bir tutar girin.');
      return;
    }

    if (!ensureCompany()) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('payments').insert({
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
      });

      if (error) {
        throw error;
      }

      setFormData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: '',
        relatedPartyId: '',
      });
      setModalVisible(false);
      await Promise.all([fetchPayments(), fetchCustomers(), fetchSuppliers()]);
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Odeme kaydedilemedi.'
      );
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
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Odeme silinemedi.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const relatedParties = useMemo(
    () => (activeTab === 'income' ? customers : suppliers),
    [activeTab, customers, suppliers]
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
      ? payment.customers?.name || 'Musteri yok'
      : payment.suppliers?.name || 'Tedarikci yok';

  const getPaymentMethodText = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Nakit',
      bank_transfer: 'Banka transferi',
      credit_card: 'Kredi karti',
      check: 'Cek',
    };

    return methods[method] || method;
  };

  const renderPayment = ({ item }: { item: Payment }) => (
    <View
      style={[
        styles.listItem,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
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
          {new Date(item.payment_date).toLocaleDateString('tr-TR')}
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
          {item.payment_type === 'income' ? '+' : '-'}TL{' '}
          {Number(item.amount).toLocaleString('tr-TR')}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePayment(item)}
          disabled={deletingId === item.id}
          hitSlop={8}
        >
          <Trash2 size={18} color="#ef4444" />
          <Text style={styles.deleteText}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Odemeler</Text>
        <TouchableOpacity
          onPress={() => {
            if (!ensureCompany()) {
              return;
            }
            setModalVisible(true);
          }}
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        >
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'income' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('income')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'income' ? theme.colors.primary : theme.colors.textMuted }]}>
            Gelir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expense' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('expense')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'expense' ? theme.colors.primary : theme.colors.textMuted }]}>
            Gider
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
            Toplam {activeTab === 'income' ? 'Gelir' : 'Gider'}
          </Text>
          <Text
            style={[
              styles.summaryAmount,
              activeTab === 'income' ? styles.incomeAmount : styles.expenseAmount,
            ]}
          >
            TL {getTotalAmount(activeTab).toLocaleString('tr-TR')}
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
          <View style={styles.emptyState}>
            <Wallet size={48} color={theme.colors.textSoft} />
            <Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>
              Henuz {activeTab === 'income' ? 'gelir' : 'gider'} yok
            </Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Yeni {activeTab === 'income' ? 'Gelir' : 'Gider'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Tutar *</Text>
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

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Tarih</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.paymentDate}
                  onChangeText={(text) =>
                    setFormData({ ...formData, paymentDate: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Odeme Yontemi</Text>
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

              {relatedParties.length > 0 ? (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                    {activeTab === 'income' ? 'Musteri' : 'Tedarikci'}
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
                        ? relatedParties.find(
                            (party) => party.id === formData.relatedPartyId
                          )?.name
                        : 'Seciniz'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Aciklama</Text>
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
                  placeholder="Aciklama"
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
                onPress={handleAddPayment}
                disabled={saving}
              >
                <Text style={styles.submitButtonText}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMethodPicker} animationType="slide" transparent>
        <View style={styles.pickerModal}>
          <View style={[styles.pickerContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Odeme yontemi secin</Text>
              <TouchableOpacity onPress={() => setShowMethodPicker(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[
                { value: 'cash', label: 'Nakit' },
                { value: 'bank_transfer', label: 'Banka transferi' },
                { value: 'credit_card', label: 'Kredi karti' },
                { value: 'check', label: 'Cek' },
              ].map((method) => (
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
                {activeTab === 'income' ? 'Musteri' : 'Tedarikci'} secin
              </Text>
              <TouchableOpacity onPress={() => setShowPartyPicker(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  setFormData({ ...formData, relatedPartyId: '' });
                  setShowPartyPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>Seciniz</Text>
              </TouchableOpacity>
              {relatedParties.map((party) => (
                <TouchableOpacity
                  key={party.id}
                  style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setFormData({ ...formData, relatedPartyId: party.id });
                    setShowPartyPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>
                    {party.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  incomeAmount: {
    color: '#22c55e',
  },
  expenseAmount: {
    color: '#ef4444',
  },
  list: {
    padding: 16,
  },
  listItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
  },
  itemDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  itemDate: {
    fontSize: 12,
    marginTop: 4,
  },
  amountColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    minWidth: 52,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
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
    fontSize: 20,
    fontWeight: '700',
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  pickerValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
