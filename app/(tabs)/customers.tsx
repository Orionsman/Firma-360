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
import { UserPlus, X, User, TrendingUp, TrendingDown, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance: number;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance: number;
}

interface AccountMovement {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  type: 'sale' | 'payment';
}

interface BalanceRow {
  customer_id?: string | null;
  supplier_id?: string | null;
  total_amount?: number | null;
  amount?: number | null;
}

interface SaleMovementRow {
  id: string;
  sale_date: string;
  total_amount: number;
  sale_items?: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    products?: {
      name?: string;
      unit?: string;
    } | null;
  }>;
}

export default function Customers() {
  const { company } = useAuth();
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>(
    'customers'
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Customer | Supplier | null>(
    null
  );
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const ensureCompany = () => {
    if (!company) {
      Alert.alert(
        'Firma gerekli',
        'Once ana sayfadan firma olusturmaniz gerekiyor.'
      );
      return false;
    }

    return true;
  };

  const fetchCustomers = async () => {
    if (!company) {
      setCustomers([]);
      return;
    }

    const [customersResult, salesResult, paymentsResult] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('sales')
        .select('customer_id, total_amount')
        .eq('company_id', company.id),
      supabase
        .from('payments')
        .select('customer_id, amount')
        .eq('company_id', company.id)
        .eq('payment_type', 'income'),
    ]);

    if (customersResult.error) {
      Alert.alert('Hata', customersResult.error.message);
      return;
    }

    if (salesResult.error) {
      Alert.alert('Hata', salesResult.error.message);
      return;
    }

    if (paymentsResult.error) {
      Alert.alert('Hata', paymentsResult.error.message);
      return;
    }

    const salesByCustomer = new Map<string, number>();
    const paymentsByCustomer = new Map<string, number>();

    ((salesResult.data as BalanceRow[]) ?? []).forEach((sale) => {
      if (!sale.customer_id) {
        return;
      }

      salesByCustomer.set(
        sale.customer_id,
        (salesByCustomer.get(sale.customer_id) || 0) +
          Number(sale.total_amount || 0)
      );
    });

    ((paymentsResult.data as BalanceRow[]) ?? []).forEach((payment) => {
      if (!payment.customer_id) {
        return;
      }

      paymentsByCustomer.set(
        payment.customer_id,
        (paymentsByCustomer.get(payment.customer_id) || 0) +
          Number(payment.amount || 0)
      );
    });

    const normalizedCustomers = ((customersResult.data as Customer[]) ?? []).map(
      (customer) => ({
        ...customer,
        balance:
          (salesByCustomer.get(customer.id) || 0) -
          (paymentsByCustomer.get(customer.id) || 0),
      })
    );

    setCustomers(normalizedCustomers);
  };

  const fetchSuppliers = async () => {
    if (!company) {
      setSuppliers([]);
      return;
    }

    const [suppliersResult, paymentsResult] = await Promise.all([
      supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('supplier_id, amount')
        .eq('company_id', company.id)
        .eq('payment_type', 'expense'),
    ]);

    if (suppliersResult.error) {
      Alert.alert('Hata', suppliersResult.error.message);
      return;
    }

    if (paymentsResult.error) {
      Alert.alert('Hata', paymentsResult.error.message);
      return;
    }

    const paymentsBySupplier = new Map<string, number>();

    ((paymentsResult.data as BalanceRow[]) ?? []).forEach((payment) => {
      if (!payment.supplier_id) {
        return;
      }

      paymentsBySupplier.set(
        payment.supplier_id,
        (paymentsBySupplier.get(payment.supplier_id) || 0) +
          Number(payment.amount || 0)
      );
    });

    const normalizedSuppliers = ((suppliersResult.data as Supplier[]) ?? []).map(
      (supplier) => ({
        ...supplier,
        balance: -(paymentsBySupplier.get(supplier.id) || 0),
      })
    );

    setSuppliers(normalizedSuppliers);
  };

  useEffect(() => {
    void Promise.all([fetchCustomers(), fetchSuppliers()]);
  }, [company]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([fetchCustomers(), fetchSuppliers()]);
    }, [company])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCustomers(), fetchSuppliers()]);
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Hata', 'Lutfen isim girin.');
      return;
    }

    if (!ensureCompany()) {
      return;
    }

    setSaving(true);
    try {
      const table = activeTab === 'customers' ? 'customers' : 'suppliers';
      const { error } = await supabase.from(table).insert({
        company_id: company!.id,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      });

      if (error) {
        throw error;
      }

      resetForm();
      setModalVisible(false);
      await onRefresh();
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Kayit sirasinda hata olustu.'
      );
    } finally {
      setSaving(false);
    }
  };

  const fetchCustomerMovements = async (customerId: string) => {
    const [salesResult, paymentsResult] = await Promise.all([
      supabase
        .from('sales')
        .select(
          'id, sale_date, total_amount, sale_items(quantity, unit_price, total_price, products(name, unit))'
        )
        .eq('customer_id', customerId)
        .order('sale_date', { ascending: false }),
      supabase
        .from('payments')
        .select('id, amount, payment_date, payment_method, payment_type')
        .eq('customer_id', customerId)
        .eq('payment_type', 'income')
        .order('payment_date', { ascending: false }),
    ]);

    if (salesResult.error) {
      throw salesResult.error;
    }

    if (paymentsResult.error) {
      throw paymentsResult.error;
    }

    const saleMovements: AccountMovement[] =
      (salesResult.data as SaleMovementRow[] | null)?.map((sale) => {
        const saleItems = sale.sale_items ?? [];
        const title =
          saleItems
            .map((item) => item.products?.name)
            .filter(Boolean)
            .join(', ') || 'Satis';

        const subtitle =
          saleItems
            .map((item) => {
              const quantity = Number(item.quantity || 0);
              const unitPrice = Number(item.unit_price || 0);
              const totalPrice = Number(item.total_price || 0);
              const unit = item.products?.unit ? ` ${item.products.unit}` : '';

              return `${quantity}${unit} x ${unitPrice.toLocaleString('tr-TR')} = ${totalPrice.toLocaleString('tr-TR')}`;
            })
            .join(' | ') || 'Satis';

        return {
          id: `sale-${sale.id}`,
          title,
          subtitle,
          amount: Number(sale.total_amount),
          date: sale.sale_date,
          type: 'sale',
        };
      }) ?? [];

    const paymentMovements: AccountMovement[] =
      paymentsResult.data?.map((payment) => ({
        id: `payment-${payment.id}`,
        title: 'Odeme',
        subtitle: payment.payment_method,
        amount: -Number(payment.amount),
        date: payment.payment_date,
        type: 'payment',
      })) ?? [];

    return [...saleMovements, ...paymentMovements].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  };

  const fetchSupplierMovements = async (supplierId: string) => {
    const { data, error } = await supabase
      .from('payments')
      .select('id, amount, payment_date, payment_method')
      .eq('supplier_id', supplierId)
      .eq('payment_type', 'expense')
      .order('payment_date', { ascending: false });

    if (error) {
      throw error;
    }

    return (
      data?.map((payment) => ({
        id: `payment-${payment.id}`,
        title: 'Odeme',
        subtitle: payment.payment_method,
        amount: -Number(payment.amount),
        date: payment.payment_date,
        type: 'payment' as const,
      })) ?? []
    );
  };

  const openDetails = async (record: Customer | Supplier) => {
    try {
      const nextMovements =
        activeTab === 'customers'
          ? await fetchCustomerMovements(record.id)
          : await fetchSupplierMovements(record.id);

      setSelectedRecord(record);
      setMovements(nextMovements);
      setDetailVisible(true);
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Hareketler yuklenemedi.'
      );
    }
  };

  const handleDelete = async (record: Customer | Supplier) => {
    if (!company) {
      return;
    }

    const isCustomer = activeTab === 'customers';
    const balance = Number(record.balance || 0);
    if (balance !== 0) {
      Alert.alert(
        'Silme engellendi',
        'Bakiyesi olan bir cari silinemez.'
      );
      return;
    }

    try {
      setDeletingId(record.id);
      const table = isCustomer ? 'customers' : 'suppliers';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', record.id)
        .eq('company_id', company.id);

      if (error) {
        throw error;
      }

      await onRefresh();
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Silme islemi basarisiz.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const renderBalance = (balance: number) => {
    const numericBalance = Number(balance || 0);
    const isPositive = numericBalance > 0;
    const isNegative = numericBalance < 0;

    return (
      <View style={styles.itemBalance}>
        {numericBalance !== 0 ? (
          isPositive ? (
            <TrendingUp size={18} color="#22c55e" />
          ) : (
            <TrendingDown size={18} color="#ef4444" />
          )
        ) : null}
        <Text
          style={[
            styles.balanceText,
            isPositive && styles.balancePositive,
            isNegative && styles.balanceNegative,
          ]}
        >
          TL {Math.abs(numericBalance).toLocaleString('tr-TR')}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Customer | Supplier }) => (
    <View style={styles.listItem}>
      <TouchableOpacity
        style={styles.itemMainAction}
        onPress={() => openDetails(item)}
        activeOpacity={0.8}
      >
        <View style={styles.itemIcon}>
          <User size={24} color="#3b82f6" />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.phone ? <Text style={styles.itemDetail}>{item.phone}</Text> : null}
          {item.email ? <Text style={styles.itemDetail}>{item.email}</Text> : null}
        </View>
        {renderBalance(item.balance)}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        disabled={deletingId === item.id}
        hitSlop={8}
      >
        <Trash2 size={18} color="#ef4444" />
        <Text style={styles.deleteText}>Sil</Text>
      </TouchableOpacity>
    </View>
  );

  const currentData = useMemo(
    () => (activeTab === 'customers' ? customers : suppliers),
    [activeTab, customers, suppliers]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cari Yonetimi</Text>
        <TouchableOpacity
          onPress={() => {
            if (!ensureCompany()) {
              return;
            }
            setModalVisible(true);
          }}
          style={styles.addButton}
        >
          <UserPlus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'customers' && styles.activeTab]}
          onPress={() => setActiveTab('customers')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'customers' && styles.activeTabText,
            ]}
          >
            Musteriler ({customers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suppliers' && styles.activeTab]}
          onPress={() => setActiveTab('suppliers')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'suppliers' && styles.activeTabText,
            ]}
          >
            Tedarikciler ({suppliers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <User size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>
              Henuz {activeTab === 'customers' ? 'musteri' : 'tedarikci'} yok
            </Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Yeni {activeTab === 'customers' ? 'Musteri' : 'Tedarikci'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Isim *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Isim"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefon</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Telefon"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-posta</Text>
                <TextInput
                  style={styles.input}
                  placeholder="E-posta"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adres</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Adres"
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, saving && styles.buttonDisabled]}
                onPress={handleAdd}
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

      <Modal visible={detailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedRecord?.name}</Text>
                <Text style={styles.detailBalance}>
                  Bakiye: TL {Math.abs(Number(selectedRecord?.balance || 0)).toLocaleString('tr-TR')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.detailList}>
              {movements.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Hesap hareketi bulunmuyor</Text>
                </View>
              ) : (
                movements.map((movement) => (
                  <View key={movement.id} style={styles.movementItem}>
                    <View style={styles.movementTextGroup}>
                      <Text style={styles.movementTitle}>{movement.title}</Text>
                      <Text style={styles.movementSubtitle}>
                        {movement.subtitle} ·{' '}
                        {new Date(movement.date).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.movementAmount,
                        movement.amount >= 0
                          ? styles.balancePositive
                          : styles.balanceNegative,
                      ]}
                    >
                      {movement.amount >= 0 ? '+' : '-'}TL{' '}
                      {Math.abs(movement.amount).toLocaleString('tr-TR')}
                    </Text>
                  </View>
                ))
              )}
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  list: {
    padding: 16,
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemMainAction: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    color: '#64748b',
  },
  itemBalance: {
    alignItems: 'flex-end',
    minWidth: 92,
    gap: 4,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  balancePositive: {
    color: '#22c55e',
  },
  balanceNegative: {
    color: '#ef4444',
  },
  deleteButton: {
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#f1f5f9',
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
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    maxHeight: '90%',
  },
  detailContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    maxHeight: '85%',
    minHeight: '55%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailBalance: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
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
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
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
  detailList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  movementItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  movementTextGroup: {
    flex: 1,
  },
  movementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  movementSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  movementAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
