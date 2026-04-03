import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ListRenderItem, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { UserPlus, X, User, TrendingUp, TrendingDown, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { formatAppDate, formatSignedTRY, formatTRY } from '@/lib/format';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

interface Customer { id: string; name: string; email?: string; phone?: string; address?: string; balance: number; }
interface Supplier { id: string; name: string; email?: string; phone?: string; address?: string; balance: number; }
interface AccountMovement { id: string; title: string; subtitle: string; amount: number; date: string; type: 'sale' | 'payment'; runningBalance?: number; }
interface BalanceRow { customer_id?: string | null; supplier_id?: string | null; total_amount?: number | null; amount?: number | null; }
interface SaleMovementRow { id: string; sale_date: string; total_amount: number; sale_items?: { quantity: number; unit_price: number; total_price: number; products?: { name?: string; unit?: string } | null; }[]; }

export default function Customers() {
  const { company } = useAuth();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const modalBottomSpacing = Math.max(insets.bottom, Platform.OS === 'android' ? 34 : 20) + 24;
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Customer | Supplier | null>(null);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [movementFilter, setMovementFilter] = useState<'all' | 'sale' | 'payment'>('all');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const ensureCompany = () => {
    if (!company) {
      Alert.alert(t.common.companyRequiredTitle, t.common.companyRequiredText);
      return false;
    }
    return true;
  };

  const fetchCustomers = useCallback(async () => {
    if (!company) return void setCustomers([]);
    const [customersResult, salesResult, paymentsResult] = await Promise.all([
      supabase.from('customers').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('sales').select('customer_id, total_amount').eq('company_id', company.id),
      supabase.from('payments').select('customer_id, amount').eq('company_id', company.id).eq('payment_type', 'income'),
    ]);
    if (customersResult.error) return void Alert.alert(t.common.error, customersResult.error.message);
    if (salesResult.error) return void Alert.alert(t.common.error, salesResult.error.message);
    if (paymentsResult.error) return void Alert.alert(t.common.error, paymentsResult.error.message);
    const salesByCustomer = new Map<string, number>();
    const paymentsByCustomer = new Map<string, number>();
    ((salesResult.data as BalanceRow[]) ?? []).forEach((sale) => { if (sale.customer_id) salesByCustomer.set(sale.customer_id, (salesByCustomer.get(sale.customer_id) || 0) + Number(sale.total_amount || 0)); });
    ((paymentsResult.data as BalanceRow[]) ?? []).forEach((payment) => { if (payment.customer_id) paymentsByCustomer.set(payment.customer_id, (paymentsByCustomer.get(payment.customer_id) || 0) + Number(payment.amount || 0)); });
    setCustomers(((customersResult.data as Customer[]) ?? []).map((customer) => ({ ...customer, balance: (salesByCustomer.get(customer.id) || 0) - (paymentsByCustomer.get(customer.id) || 0) })));
  }, [company]);

  const fetchSuppliers = useCallback(async () => {
    if (!company) return void setSuppliers([]);
    const [suppliersResult, paymentsResult] = await Promise.all([
      supabase.from('suppliers').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('supplier_id, amount').eq('company_id', company.id).eq('payment_type', 'expense'),
    ]);
    if (suppliersResult.error) return void Alert.alert(t.common.error, suppliersResult.error.message);
    if (paymentsResult.error) return void Alert.alert(t.common.error, paymentsResult.error.message);
    const paymentsBySupplier = new Map<string, number>();
    ((paymentsResult.data as BalanceRow[]) ?? []).forEach((payment) => { if (payment.supplier_id) paymentsBySupplier.set(payment.supplier_id, (paymentsBySupplier.get(payment.supplier_id) || 0) + Number(payment.amount || 0)); });
    setSuppliers(((suppliersResult.data as Supplier[]) ?? []).map((supplier) => ({ ...supplier, balance: -(paymentsBySupplier.get(supplier.id) || 0) })));
  }, [company]);

  useEffect(() => { void Promise.all([fetchCustomers(), fetchSuppliers()]); }, [fetchCustomers, fetchSuppliers]);
  useFocusEffect(useCallback(() => { void Promise.all([fetchCustomers(), fetchSuppliers()]); }, [fetchCustomers, fetchSuppliers]));
  const onRefresh = async () => { setRefreshing(true); await Promise.all([fetchCustomers(), fetchSuppliers()]); setRefreshing(false); };

  const handleAdd = async () => {
    if (!formData.name.trim()) return void Alert.alert(t.common.error, t.customers.nameRequired);
    if (!ensureCompany()) return;
    setSaving(true);
    try {
      const table = activeTab === 'customers' ? 'customers' : 'suppliers';
      const { error } = await supabase.from(table).insert({ company_id: company!.id, name: formData.name.trim(), email: formData.email.trim() || null, phone: formData.phone.trim() || null, address: formData.address.trim() || null });
      if (error) throw error;
      setFormData({ name: '', email: '', phone: '', address: '' });
      setModalVisible(false);
      await onRefresh();
    } catch (error: unknown) {
      Alert.alert(t.common.error, error instanceof Error ? error.message : t.customers.addFailed);
    } finally {
      setSaving(false);
    }
  };

  const fetchCustomerMovements = async (customerId: string) => {
    const [salesResult, paymentsResult] = await Promise.all([
      supabase.from('sales').select('id, sale_date, total_amount, sale_items(quantity, unit_price, total_price, products(name, unit))').eq('customer_id', customerId).order('sale_date', { ascending: false }),
      supabase.from('payments').select('id, amount, payment_date, payment_method, payment_type').eq('customer_id', customerId).eq('payment_type', 'income').order('payment_date', { ascending: false }),
    ]);
    if (salesResult.error) throw salesResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    const saleMovements: AccountMovement[] = (salesResult.data as SaleMovementRow[] | null)?.map((sale) => {
      const saleItems = sale.sale_items ?? [];
      const title = saleItems.map((item) => item.products?.name).filter(Boolean).join(', ') || t.common.entities.sale;
      const subtitle = saleItems.map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const totalPrice = Number(item.total_price || 0);
        const unit = item.products?.unit ? ` ${item.products.unit}` : '';
        return `${quantity}${unit} x ${formatTRY(unitPrice)} = ${formatTRY(totalPrice)}`;
      }).join(' | ') || t.common.entities.sale;
      return { id: `sale-${sale.id}`, title, subtitle, amount: Number(sale.total_amount), date: sale.sale_date, type: 'sale' };
    }) ?? [];
    const paymentMovements: AccountMovement[] = paymentsResult.data?.map((payment) => ({ id: `payment-${payment.id}`, title: t.common.entities.payment, subtitle: payment.payment_method, amount: -Number(payment.amount), date: payment.payment_date, type: 'payment' })) ?? [];
    const ordered = [...saleMovements, ...paymentMovements].sort((a, b) => a.date.localeCompare(b.date));
    let runningBalance = 0;
    return ordered.map((movement) => ({ ...movement, runningBalance: (runningBalance += movement.amount) })).sort((a, b) => b.date.localeCompare(a.date));
  };

  const fetchSupplierMovements = async (supplierId: string) => {
    const { data, error } = await supabase.from('payments').select('id, amount, payment_date, payment_method').eq('supplier_id', supplierId).eq('payment_type', 'expense').order('payment_date', { ascending: false });
    if (error) throw error;
    const ordered = data?.map((payment) => ({ id: `payment-${payment.id}`, title: t.common.entities.payment, subtitle: payment.payment_method, amount: -Number(payment.amount), date: payment.payment_date, type: 'payment' as const })) ?? [];
    let runningBalance = 0;
    return ordered.sort((a, b) => a.date.localeCompare(b.date)).map((movement) => ({ ...movement, runningBalance: (runningBalance += movement.amount) })).sort((a, b) => b.date.localeCompare(a.date));
  };

  const openDetails = async (record: Customer | Supplier) => {
    try {
      const nextMovements = activeTab === 'customers' ? await fetchCustomerMovements(record.id) : await fetchSupplierMovements(record.id);
      setSelectedRecord(record);
      setMovements(nextMovements);
      setMovementFilter('all');
      setDetailVisible(true);
    } catch (error: unknown) {
      Alert.alert(t.common.error, error instanceof Error ? error.message : t.customers.movementsLoadFailed);
    }
  };

  const handleDelete = async (record: Customer | Supplier) => {
    if (!company) return;
    const isCustomer = activeTab === 'customers';
    if (Number(record.balance || 0) !== 0) return void Alert.alert(t.customers.deleteBlockedTitle, t.customers.deleteBlockedBalance);
    try {
      if (isCustomer) {
        const [salesResult, paymentsResult] = await Promise.all([
          supabase.from('sales').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('customer_id', record.id),
          supabase.from('payments').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('customer_id', record.id),
        ]);
        if (salesResult.error || paymentsResult.error) throw salesResult.error || paymentsResult.error;
        if ((salesResult.count || 0) > 0 || (paymentsResult.count || 0) > 0) {
          return void Alert.alert(t.customers.deleteBlockedTitle, t.customers.deleteBlockedCustomerHistory);
        }
      } else {
        const { count, error } = await supabase.from('payments').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('supplier_id', record.id);
        if (error) throw error;
        if ((count || 0) > 0) return void Alert.alert(t.customers.deleteBlockedTitle, t.customers.deleteBlockedSupplierHistory);
      }
    } catch (error: unknown) {
      return void Alert.alert(t.common.error, error instanceof Error ? error.message : t.customers.deleteCheckFailed);
    }
    try {
      setDeletingId(record.id);
      const table = isCustomer ? 'customers' : 'suppliers';
      const { error } = await supabase.from(table).delete().eq('id', record.id).eq('company_id', company.id);
      if (error) throw error;
      await onRefresh();
    } catch (error: unknown) {
      Alert.alert(t.common.error, error instanceof Error ? error.message : t.customers.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const renderBalance = (balance: number) => {
    const numericBalance = Number(balance || 0);
    return (
      <View style={styles.itemBalance}>
        {numericBalance !== 0 ? numericBalance > 0 ? <TrendingUp size={18} color="#22c55e" /> : <TrendingDown size={18} color="#ef4444" /> : null}
        <Text style={[styles.balanceText, { color: theme.colors.textMuted }, numericBalance > 0 && styles.balancePositive, numericBalance < 0 && styles.balanceNegative]}>
          {formatTRY(Math.abs(numericBalance))}
        </Text>
      </View>
    );
  };

  const renderItem: ListRenderItem<Customer | Supplier> = ({ item }) => (
    <View
      style={[
        styles.listItem,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <TouchableOpacity style={styles.itemMainAction} onPress={() => openDetails(item)} activeOpacity={0.8}>
        <View style={[styles.itemIcon, { backgroundColor: theme.colors.primarySoft }]}>
          <User size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, { color: theme.colors.text }]}>{item.name}</Text>
          {item.phone ? <Text style={[styles.itemDetail, { color: theme.colors.textMuted }]}>{item.phone}</Text> : null}
          {item.email ? <Text style={[styles.itemDetail, { color: theme.colors.textMuted }]}>{item.email}</Text> : null}
        </View>
        {renderBalance(item.balance)}
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.deleteButton,
          {
            borderLeftColor: theme.colors.border,
            backgroundColor: theme.colors.dangerSoft,
          },
        ]}
        onPress={() => handleDelete(item)}
        disabled={deletingId === item.id}
        hitSlop={8}
      >
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const currentData = useMemo(() => (activeTab === 'customers' ? customers : suppliers), [activeTab, customers, suppliers]);
  const filteredData = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedQuery) return currentData;
    return currentData.filter((item) => [item.name, item.phone, item.email, item.address].filter(Boolean).some((value) => String(value).toLocaleLowerCase('tr-TR').includes(normalizedQuery)));
  }, [currentData, searchQuery]);
  const visibleMovements = useMemo(() => movementFilter === 'all' ? movements : movements.filter((movement) => movement.type === movementFilter), [movementFilter, movements]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BrandHeroHeader
        kicker={t.customers.kicker}
        brandSubtitle={t.customers.heroSubtitle}
        rightAccessory={<TouchableOpacity onPress={() => { if (!ensureCompany()) return; setModalVisible(true); }} style={[styles.headerAddButton, { backgroundColor: theme.colors.primary }]}><UserPlus size={24} color="#ffffff" /></TouchableOpacity>}
      >
        <TextInput style={[styles.searchInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]} placeholder={t.common.search} placeholderTextColor={theme.colors.textSoft} value={searchQuery} onChangeText={setSearchQuery} />
      </BrandHeroHeader>
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
            style={[
              styles.tab,
              activeTab === 'customers' && [
                styles.activeTab,
                { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('customers')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'customers' ? theme.colors.primary : theme.colors.textMuted },
              ]}
            >
              {t.customers.customersTab} ({customers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'suppliers' && [
                styles.activeTab,
                { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('suppliers')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'suppliers' ? theme.colors.primary : theme.colors.textMuted },
              ]}
            >
              {t.customers.suppliersTab} ({suppliers.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
              <User size={30} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>
              {searchQuery
                ? t.common.noResults
                : activeTab === 'customers'
                  ? t.customers.emptyCustomers
                  : t.customers.emptySuppliers}
            </Text>
          </View>
        }
      />
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{activeTab === 'customers' ? t.customers.newCustomer : t.customers.newSupplier}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color={theme.colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={[styles.form, { paddingBottom: modalBottomSpacing }]} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}><Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.name} *</Text><TextInput style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]} placeholder={t.common.fields.name} placeholderTextColor={theme.colors.textSoft} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} /></View>
              <View style={styles.inputGroup}><Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.phone}</Text><TextInput style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]} placeholder={t.common.fields.phone} placeholderTextColor={theme.colors.textSoft} value={formData.phone} onChangeText={(text) => setFormData({ ...formData, phone: text })} keyboardType="phone-pad" /></View>
              <View style={styles.inputGroup}><Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.email}</Text><TextInput style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]} placeholder={t.common.fields.email} placeholderTextColor={theme.colors.textSoft} value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} keyboardType="email-address" autoCapitalize="none" /></View>
              <View style={styles.inputGroup}><Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.fields.address}</Text><TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]} placeholder={t.common.fields.address} placeholderTextColor={theme.colors.textSoft} value={formData.address} onChangeText={(text) => setFormData({ ...formData, address: text })} multiline numberOfLines={3} /></View>
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.colors.primary }, saving && styles.buttonDisabled]} onPress={handleAdd} disabled={saving}><Text style={styles.submitButtonText}>{saving ? t.common.saving : t.common.save}</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={detailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <View><Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedRecord?.name}</Text><Text style={[styles.detailBalance, { color: theme.colors.textMuted }]}>{t.common.entities.balance}: {formatTRY(Math.abs(Number(selectedRecord?.balance || 0)))}</Text></View>
              <TouchableOpacity onPress={() => setDetailVisible(false)}><X size={24} color={theme.colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detailList}>
              <View style={styles.filterRow}>{[{ key: 'all', label: t.customers.all }, { key: 'sale', label: t.common.entities.sales }, { key: 'payment', label: t.common.entities.payments }].map((item) => { const isActive = movementFilter === item.key; return <TouchableOpacity key={item.key} style={[styles.filterChip, { backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surfaceMuted, borderColor: isActive ? theme.colors.primary : theme.colors.border }]} onPress={() => setMovementFilter(item.key as 'all' | 'sale' | 'payment')}><Text style={[styles.filterChipText, { color: isActive ? theme.colors.primary : theme.colors.textMuted }]}>{item.label}</Text></TouchableOpacity>; })}</View>
              {visibleMovements.length === 0 ? <View style={styles.detailEmptyState}><Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>{t.customers.noMovementsForFilter}</Text></View> : visibleMovements.map((movement) => <View key={movement.id} style={[styles.movementItem, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}><View style={styles.movementTextGroup}><Text style={[styles.movementTitle, { color: theme.colors.text }]}>{movement.title}</Text><Text style={[styles.movementSubtitle, { color: theme.colors.textMuted }]}>{movement.subtitle} - {formatAppDate(movement.date)}</Text></View><View style={styles.movementRight}><Text style={[styles.movementAmount, movement.type === 'payment' ? styles.balancePositive : styles.balanceNegative]}>{formatSignedTRY(movement.type === 'payment' ? Math.abs(movement.amount) : -Math.abs(movement.amount))}</Text><Text style={[styles.movementBalanceValue, { color: (movement.runningBalance || 0) >= 0 ? theme.colors.success : theme.colors.danger }]}>{t.common.entities.balance}: {formatSignedTRY(movement.runningBalance || 0)}</Text></View></View>)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerAddButton: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 4 },
  searchInput: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#16203B', borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  tabsOuter: { paddingHorizontal: 16, marginTop: -10, marginBottom: 4 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, padding: 6, gap: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  activeTab: {},
  tabText: { ...typography.label, fontSize: 14 },
  list: { padding: 16, paddingTop: 12, paddingBottom: 28 },
  listItem: { borderRadius: 18, marginBottom: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 2 },
  itemMainAction: { flex: 1, padding: 16, flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemContent: { flex: 1 },
  itemName: { ...typography.heading, fontSize: 16, marginBottom: 4 },
  itemDetail: { ...typography.caption, fontSize: 14 },
  itemBalance: { alignItems: 'flex-end', minWidth: 92, gap: 4 },
  balanceText: { ...typography.label, fontSize: 14 },
  balancePositive: { color: '#22c55e' },
  balanceNegative: { color: '#ef4444' },
  deleteButton: { width: 54, height: 54, marginRight: 14, borderRadius: 16, borderLeftWidth: 0, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24, borderWidth: 1, borderRadius: 22 },
  detailEmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, fontSize: 16, color: '#94a3b8', marginTop: 16, textAlign: 'center', lineHeight: 23 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, maxHeight: '90%' },
  detailContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, maxHeight: '85%', minHeight: '55%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 24, paddingBottom: 18, borderBottomWidth: 1 },
  modalTitle: { ...typography.title, fontSize: 20 },
  detailBalance: { ...typography.body, fontSize: 14, marginTop: 4 },
  form: { paddingHorizontal: 24, paddingBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { ...typography.label, fontSize: 14, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { ...typography.heading, color: '#ffffff', fontSize: 16 },
  detailList: { paddingHorizontal: 24, paddingBottom: 24 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  filterChipText: { ...typography.label, fontSize: 13 },
  movementItem: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  movementTextGroup: { flex: 1 },
  movementTitle: { ...typography.heading, fontSize: 15, marginBottom: 4 },
  movementSubtitle: { ...typography.caption, fontSize: 13 },
  movementAmount: { ...typography.heading, fontSize: 15 },
  movementRight: { alignItems: 'flex-end', minWidth: 116, gap: 6 },
  movementBalanceValue: { ...typography.caption, fontSize: 12 },
});
