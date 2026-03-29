import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FirmaLogo } from '@/components/FirmaLogo';

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
  const { theme } = useAppTheme();
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
  const [searchQuery, setSearchQuery] = useState('');

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
            { color: theme.colors.textMuted },
            isPositive && styles.balancePositive,
            isNegative && styles.balanceNegative,
          ]}
        >
          TL {Math.abs(numericBalance).toLocaleString('tr-TR')}
        </Text>
      </View>
    );
  };

  const renderItem: ListRenderItem<Customer | Supplier> = ({ item }) => (
    <View
      style={[
        styles.listItem,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <TouchableOpacity
        style={styles.itemMainAction}
        onPress={() => openDetails(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.itemIcon, { backgroundColor: theme.colors.primarySoft }]}>
          <User size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, { color: theme.colors.text }]}>{item.name}</Text>
          {item.phone ? (
            <Text style={[styles.itemDetail, { color: theme.colors.textMuted }]}>{item.phone}</Text>
          ) : null}
          {item.email ? (
            <Text style={[styles.itemDetail, { color: theme.colors.textMuted }]}>{item.email}</Text>
          ) : null}
        </View>
        {renderBalance(item.balance)}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton, { borderLeftColor: theme.colors.border }]}
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
  const filteredData = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedQuery) {
      return currentData;
    }

    return currentData.filter((item) =>
      [item.name, item.phone, item.email, item.address]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase('tr-TR').includes(normalizedQuery)
        )
    );
  }, [currentData, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primaryStrong, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerBrand}>
          <FirmaLogo size="sm" />
          <TouchableOpacity
            onPress={() => {
              if (!ensureCompany()) {
                return;
              }
              setModalVisible(true);
            }}
            style={styles.headerAddButton}
          >
            <UserPlus size={18} color="#ffffff" />
            <Text style={styles.headerAddText}>Yeni Cari</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Cari Hesaplar</Text>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: theme.colors.surface, color: theme.colors.text },
          ]}
          placeholder="Arama"
          placeholderTextColor={theme.colors.textSoft}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </LinearGradient>

      <View style={[styles.tabs, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'customers' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('customers')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'customers' ? theme.colors.primary : theme.colors.textMuted }]}>
            Musteriler ({customers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suppliers' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('suppliers')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'suppliers' ? theme.colors.primary : theme.colors.textMuted }]}>
            Tedarikciler ({suppliers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <User size={48} color={theme.colors.textSoft} />
            <Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>
              {searchQuery
                ? 'Aramaniza uygun kayit bulunamadi'
                : `Henuz ${activeTab === 'customers' ? 'musteri' : 'tedarikci'} yok`}
            </Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Yeni {activeTab === 'customers' ? 'Musteri' : 'Tedarikci'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Isim *</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Isim"
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Telefon</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Telefon"
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>E-posta</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="E-posta"
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Adres</Text>
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
                  placeholder="Adres"
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
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
          <View style={[styles.detailContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedRecord?.name}</Text>
                <Text style={[styles.detailBalance, { color: theme.colors.textMuted }]}>
                  Bakiye: TL {Math.abs(Number(selectedRecord?.balance || 0)).toLocaleString('tr-TR')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.detailList}>
              {movements.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>
                    Hesap hareketi bulunmuyor
                  </Text>
                </View>
              ) : (
                movements.map((movement) => (
                  <View
                    key={movement.id}
                    style={[
                      styles.movementItem,
                      {
                        backgroundColor: theme.colors.surfaceMuted,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.movementTextGroup}>
                      <Text style={[styles.movementTitle, { color: theme.colors.text }]}>
                        {movement.title}
                      </Text>
                      <Text style={[styles.movementSubtitle, { color: theme.colors.textMuted }]}>
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
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  headerAddText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 12,
  },
  searchInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#16203B',
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
  list: {
    padding: 16,
  },
  listItem: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
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
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
  },
  itemBalance: {
    alignItems: 'flex-end',
    minWidth: 92,
    gap: 4,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    maxHeight: '90%',
  },
  detailContent: {
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
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailBalance: {
    fontSize: 14,
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
  detailList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  movementItem: {
    borderRadius: 12,
    borderWidth: 1,
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
    marginBottom: 4,
  },
  movementSubtitle: {
    fontSize: 13,
  },
  movementAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
