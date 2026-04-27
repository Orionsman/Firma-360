import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ListRenderItem, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { UserPlus, X, User, TrendingUp, TrendingDown, Trash2, Share2, SlidersHorizontal } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { DateField } from '@/components/DateField';
import { formatAppDate, formatSignedTRY, formatTRY } from '@/lib/format';
import { t } from '@/lib/i18n';
import { readOfflineCache, writeOfflineCache } from '@/lib/offlineCache';
import { createLocalId, enqueueOfflineMutation } from '@/lib/offlineWriteQueue';
import { exportAccountMovementsPdf, exportAccountMovementsXlsx } from '@/lib/reportExport';
import { typography } from '@/lib/typography';

interface Customer { id: string; name: string; email?: string; phone?: string; address?: string; balance: number; }
interface Supplier { id: string; name: string; email?: string; phone?: string; address?: string; balance: number; }
interface AccountMovement { id: string; title: string; subtitle: string; amount: number; date: string; type: 'sale' | 'payment'; sortKey: number; runningBalance?: number; }
interface BalanceRow { customer_id?: string | null; supplier_id?: string | null; total_amount?: number | null; amount?: number | null; }
interface SaleMovementRow { id: string; sale_date: string; total_amount: number; created_at?: string; sale_items?: { quantity: number; unit_price: number; total_price: number; products?: { name?: string; unit?: string } | null; }[]; }

export default function Customers() {
  const { company, isProCompany } = useAuth();
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
  const [movementSearchQuery, setMovementSearchQuery] = useState('');
  const [movementDateFrom, setMovementDateFrom] = useState('');
  const [movementDateTo, setMovementDateTo] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
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
    if (customersResult.error || salesResult.error || paymentsResult.error) {
      const cached = await readOfflineCache<Customer[]>('customers-list', company.id);
      if (cached?.data) {
        setCustomers(cached.data);
        return;
      }
      return void Alert.alert(t.common.error, customersResult.error?.message || salesResult.error?.message || paymentsResult.error?.message || t.common.error);
    }
    const salesByCustomer = new Map<string, number>();
    const paymentsByCustomer = new Map<string, number>();
    ((salesResult.data as BalanceRow[]) ?? []).forEach((sale) => { if (sale.customer_id) salesByCustomer.set(sale.customer_id, (salesByCustomer.get(sale.customer_id) || 0) + Number(sale.total_amount || 0)); });
    ((paymentsResult.data as BalanceRow[]) ?? []).forEach((payment) => { if (payment.customer_id) paymentsByCustomer.set(payment.customer_id, (paymentsByCustomer.get(payment.customer_id) || 0) + Number(payment.amount || 0)); });
    const nextCustomers = ((customersResult.data as Customer[]) ?? []).map((customer) => ({ ...customer, balance: (paymentsByCustomer.get(customer.id) || 0) - (salesByCustomer.get(customer.id) || 0) }));
    setCustomers(nextCustomers);
    await writeOfflineCache('customers-list', company.id, nextCustomers);
  }, [company]);

  const fetchSuppliers = useCallback(async () => {
    if (!company) return void setSuppliers([]);
    const [suppliersResult, paymentsResult] = await Promise.all([
      supabase.from('suppliers').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('supplier_id, amount').eq('company_id', company.id).eq('payment_type', 'expense'),
    ]);
    if (suppliersResult.error || paymentsResult.error) {
      const cached = await readOfflineCache<Supplier[]>('suppliers-list', company.id);
      if (cached?.data) {
        setSuppliers(cached.data);
        return;
      }
      return void Alert.alert(t.common.error, suppliersResult.error?.message || paymentsResult.error?.message || t.common.error);
    }
    const paymentsBySupplier = new Map<string, number>();
    ((paymentsResult.data as BalanceRow[]) ?? []).forEach((payment) => { if (payment.supplier_id) paymentsBySupplier.set(payment.supplier_id, (paymentsBySupplier.get(payment.supplier_id) || 0) + Number(payment.amount || 0)); });
    const nextSuppliers = ((suppliersResult.data as Supplier[]) ?? []).map((supplier) => ({ ...supplier, balance: paymentsBySupplier.get(supplier.id) || 0 }));
    setSuppliers(nextSuppliers);
    await writeOfflineCache('suppliers-list', company.id, nextSuppliers);
  }, [company]);

  useEffect(() => { void Promise.all([fetchCustomers(), fetchSuppliers()]); }, [fetchCustomers, fetchSuppliers]);
  useFocusEffect(useCallback(() => { void Promise.all([fetchCustomers(), fetchSuppliers()]); }, [fetchCustomers, fetchSuppliers]));
  const onRefresh = async () => { setRefreshing(true); await Promise.all([fetchCustomers(), fetchSuppliers()]); setRefreshing(false); };

  const handleAdd = async () => {
    if (!formData.name.trim()) return void Alert.alert(t.common.error, t.customers.nameRequired);
    if (!ensureCompany()) return;
    const table = activeTab === 'customers' ? 'customers' : 'suppliers';
    const payload = { company_id: company!.id, name: formData.name.trim(), email: formData.email.trim() || null, phone: formData.phone.trim() || null, address: formData.address.trim() || null };
    setSaving(true);
    try {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      setFormData({ name: '', email: '', phone: '', address: '' });
      setModalVisible(false);
      await onRefresh();
    } catch {
      const localId = createLocalId();
      const localRecord = { id: localId, ...payload, balance: 0 };

      if (activeTab === 'customers') {
        const nextCustomers = [localRecord as Customer, ...customers];
        setCustomers(nextCustomers);
        await writeOfflineCache('customers-list', company!.id, nextCustomers);
      } else {
        const nextSuppliers = [localRecord as Supplier, ...suppliers];
        setSuppliers(nextSuppliers);
        await writeOfflineCache('suppliers-list', company!.id, nextSuppliers);
      }

      await enqueueOfflineMutation({
        kind: 'upsert',
        mode: 'insert',
        table: activeTab === 'customers' ? 'customers' : 'suppliers',
        companyId: company!.id,
        recordId: localId,
        payload,
      });

      setFormData({ name: '', email: '', phone: '', address: '' });
      setModalVisible(false);
      Alert.alert(t.common.error, t.locale() === 'tr' ? 'BaÄŸlantÄ± yok. KayÄ±t cihaza alÄ±ndÄ± ve internet gelince senkronlanacak.' : 'No connection. The record was saved on this device and will sync when online.');
    } finally {
      setSaving(false);
    }
  };

  const fetchCustomerMovements = async (customerId: string) => {
    const [salesResult, paymentsResult] = await Promise.all([
      supabase.from('sales').select('id, sale_date, total_amount, created_at, sale_items(quantity, unit_price, total_price, products(name, unit))').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('payments').select('id, amount, payment_date, payment_method, payment_type, created_at').eq('customer_id', customerId).eq('payment_type', 'income').order('created_at', { ascending: false }),
    ]);
    if (salesResult.error || paymentsResult.error) {
      const cached = await readOfflineCache<AccountMovement[]>(`customer-movements:${customerId}`, company?.id);
      if (cached?.data) {
        return cached.data;
      }
      throw salesResult.error || paymentsResult.error;
    }
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
      return { id: `sale-${sale.id}`, title, subtitle, amount: -Number(sale.total_amount), date: sale.sale_date, type: 'sale', sortKey: new Date(sale.created_at || sale.sale_date).getTime() };
    }) ?? [];
    const paymentMovements: AccountMovement[] = paymentsResult.data?.map((payment) => ({ id: `payment-${payment.id}`, title: t.common.entities.payment, subtitle: payment.payment_method, amount: Number(payment.amount), date: payment.payment_date, type: 'payment', sortKey: new Date(payment.created_at || payment.payment_date).getTime() })) ?? [];
    const ordered = [...saleMovements, ...paymentMovements].sort((a, b) => a.sortKey - b.sortKey);
    let runningBalance = 0;
    const nextMovements = ordered.map((movement) => ({ ...movement, runningBalance: (runningBalance += movement.amount) })).sort((a, b) => b.sortKey - a.sortKey);
    await writeOfflineCache(`customer-movements:${customerId}`, company?.id, nextMovements);
    return nextMovements;
  };

  const fetchSupplierMovements = async (supplierId: string) => {
    const { data, error } = await supabase.from('payments').select('id, amount, payment_date, payment_method, created_at').eq('supplier_id', supplierId).eq('payment_type', 'expense').order('created_at', { ascending: false });
    if (error) {
      const cached = await readOfflineCache<AccountMovement[]>(`supplier-movements:${supplierId}`, company?.id);
      if (cached?.data) {
        return cached.data;
      }
      throw error;
    }
    const ordered = data?.map((payment) => ({ id: `payment-${payment.id}`, title: t.common.entities.payment, subtitle: payment.payment_method, amount: Number(payment.amount), date: payment.payment_date, type: 'payment' as const, sortKey: new Date(payment.created_at || payment.payment_date).getTime() })) ?? [];
    let runningBalance = 0;
    const nextMovements = ordered.sort((a, b) => a.sortKey - b.sortKey).map((movement) => ({ ...movement, runningBalance: (runningBalance += movement.amount) })).sort((a, b) => b.sortKey - a.sortKey);
    await writeOfflineCache(`supplier-movements:${supplierId}`, company?.id, nextMovements);
    return nextMovements;
  };

  const openDetails = async (record: Customer | Supplier) => {
    try {
      const nextMovements = activeTab === 'customers' ? await fetchCustomerMovements(record.id) : await fetchSupplierMovements(record.id);
      setSelectedRecord(record);
      setMovements(nextMovements);
      setMovementFilter('all');
      setMovementSearchQuery('');
      setMovementDateFrom('');
      setMovementDateTo('');
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
    } catch {
      if (isCustomer) {
        const nextCustomers = customers.filter((item) => item.id !== record.id);
        setCustomers(nextCustomers);
        await writeOfflineCache('customers-list', company.id, nextCustomers);
      } else {
        const nextSuppliers = suppliers.filter((item) => item.id !== record.id);
        setSuppliers(nextSuppliers);
        await writeOfflineCache('suppliers-list', company.id, nextSuppliers);
      }

      await enqueueOfflineMutation({
        kind: 'delete',
        table: isCustomer ? 'customers' : 'suppliers',
        companyId: company.id,
        recordId: record.id,
      });

      Alert.alert(t.common.error, t.locale() === 'tr' ? 'BaÄŸlantÄ± yok. Silme iÅŸlemi sÄ±raya alÄ±ndÄ±.' : 'No connection. Delete was queued.');
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
          {formatSignedTRY(numericBalance)}
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
  const visibleMovements = useMemo(() => {
    const normalizedQuery = movementSearchQuery.trim().toLocaleLowerCase('tr-TR');
    return movements.filter((movement) => {
      const typeMatch = movementFilter === 'all' ? true : movement.type === movementFilter;
      const dateMatch =
        (!movementDateFrom || movement.date >= movementDateFrom) &&
        (!movementDateTo || movement.date <= movementDateTo);
      const searchMatch =
        !normalizedQuery ||
        [movement.title, movement.subtitle, movement.date]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(normalizedQuery));
      return typeMatch && dateMatch && searchMatch;
    });
  }, [movementDateFrom, movementDateTo, movementFilter, movementSearchQuery, movements]);
  const buildMovementExportPayload = () => {
    if (!selectedRecord) {
      throw new Error(t.customers.movementsLoadFailed);
    }

    const exportMovements = visibleMovements;
    const salesTotal = exportMovements
      .filter((movement) => movement.type === 'sale')
      .reduce((sum, movement) => sum + Math.abs(Number(movement.amount || 0)), 0);
    const paymentsTotal = exportMovements
      .filter((movement) => movement.type === 'payment')
      .reduce((sum, movement) => sum + Math.abs(Number(movement.amount || 0)), 0);
    const safeName = selectedRecord.name
      .toLocaleLowerCase('tr-TR')
      .replace(/[^a-z0-9\u00c0-\u024f]+/gi, '-')
      .replace(/^-+|-+$/g, '');
    const accountTypeLabel =
      activeTab === 'customers' ? t.common.entities.customer : t.common.entities.supplier;
    const filterLabels = [
      movementFilter === 'all'
        ? (t.locale() === 'tr' ? 'Tum Hareketler' : 'All Movements')
        : movementFilter === 'sale'
          ? t.common.entities.sales
          : t.common.entities.payments,
      movementDateFrom ? `${t.locale() === 'tr' ? 'Baslangic' : 'From'}: ${formatAppDate(movementDateFrom)}` : null,
      movementDateTo ? `${t.locale() === 'tr' ? 'Bitis' : 'To'}: ${formatAppDate(movementDateTo)}` : null,
      movementSearchQuery.trim()
        ? `${t.locale() === 'tr' ? 'Arama' : 'Search'}: ${movementSearchQuery.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join(' • ');

    return {
      baseFileName: `cepte-cari-${safeName || 'cari'}-hareketleri`,
      title:
        activeTab === 'customers'
          ? t.customers.exportTitleCustomer
          : t.customers.exportTitleSupplier,
      reportSubtitle:
        activeTab === 'customers'
          ? t.customers.exportSubtitleCustomer
          : t.customers.exportSubtitleSupplier,
      generatedAt: formatAppDate(new Date().toISOString()),
      companyName: company?.name ?? '-',
      accountName: selectedRecord.name,
      accountTypeLabel,
      currentBalance: Number(selectedRecord.balance || 0),
      filterLabel: filterLabels || t.customers.filterAllLabel,
      footerNote: t.customers.reportFooter,
      summaryRows: [
        { label: t.customers.currentBalance, value: Number(selectedRecord.balance || 0) },
        { label: t.customers.totalMovements, value: String(exportMovements.length) },
        { label: t.customers.totalSales, value: salesTotal },
        { label: t.customers.totalPayments, value: paymentsTotal },
      ],
      movementRows: exportMovements.map((movement) => ({
        date: formatAppDate(movement.date),
        type: movement.type === 'sale' ? t.common.entities.sale : t.common.entities.payment,
        title: movement.title,
        subtitle: movement.subtitle,
        amount: Number(movement.amount || 0),
        runningBalance: Number(movement.runningBalance || 0),
      })),
    };
  };

  const ensureProExportAccess = () => {
    if (!isProCompany) {
      Alert.alert(t.customers.exportProRequiredTitle, t.customers.exportProRequiredText);
      return false;
    }

    if (!selectedRecord || visibleMovements.length === 0) {
      Alert.alert(t.common.info, t.customers.noMovementsForFilter);
      return false;
    }

    return true;
  };

  const handleExportPdf = async () => {
    setExportMenuVisible(false);
    if (!ensureProExportAccess()) return;

    try {
      await exportAccountMovementsPdf(buildMovementExportPayload());
    } catch (error: unknown) {
      Alert.alert(t.common.error, error instanceof Error ? error.message : t.customers.exportFailed);
    }
  };

  const handleExportXlsx = async () => {
    setExportMenuVisible(false);
    if (!ensureProExportAccess()) return;

    try {
      await exportAccountMovementsXlsx(buildMovementExportPayload());
    } catch (error: unknown) {
      Alert.alert(t.common.error, error instanceof Error ? error.message : t.customers.exportFailed);
    }
  };

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
              <View><Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedRecord?.name}</Text><Text style={[styles.detailBalance, { color: theme.colors.textMuted }]}>{t.common.entities.balance}: {formatSignedTRY(Number(selectedRecord?.balance || 0))}</Text></View>
              <TouchableOpacity onPress={() => setDetailVisible(false)}><X size={24} color={theme.colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailList}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
                  onPress={() => setFilterMenuVisible(true)}
                >
                  <SlidersHorizontal size={16} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.shareActionWrap}>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
                    onPress={() => setExportMenuVisible(true)}
                  >
                    <Share2 size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                  <View style={[styles.proBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.filterSummaryText, { color: theme.colors.textMuted }]}>
                {[
                  movementFilter === 'all'
                    ? (t.locale() === 'tr' ? 'Tum Hareketler' : 'All Movements')
                    : movementFilter === 'sale'
                      ? t.common.entities.sales
                      : t.common.entities.payments,
                  movementDateFrom ? `${t.locale() === 'tr' ? 'Baslangic' : 'From'} ${formatAppDate(movementDateFrom)}` : null,
                  movementDateTo ? `${t.locale() === 'tr' ? 'Bitis' : 'To'} ${formatAppDate(movementDateTo)}` : null,
                  movementSearchQuery.trim() ? `${t.locale() === 'tr' ? 'Arama' : 'Search'}: ${movementSearchQuery.trim()}` : null,
                ].filter(Boolean).join(' • ')}
              </Text>
              {visibleMovements.length === 0 ? <View style={styles.detailEmptyState}><Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>{t.customers.noMovementsForFilter}</Text></View> : visibleMovements.map((movement) => <View key={movement.id} style={[styles.movementItem, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}><View style={styles.movementTextGroup}><Text style={[styles.movementTitle, { color: theme.colors.text }]}>{movement.title}</Text><Text style={[styles.movementSubtitle, { color: theme.colors.textMuted }]}>{movement.subtitle} - {formatAppDate(movement.date)}</Text></View><View style={styles.movementRight}><Text style={[styles.movementAmount, movement.amount >= 0 ? styles.balancePositive : styles.balanceNegative]}>{formatSignedTRY(movement.amount)}</Text><Text style={[styles.movementBalanceValue, { color: (movement.runningBalance || 0) >= 0 ? theme.colors.success : theme.colors.danger }]}>{t.common.entities.balance}: {formatSignedTRY(movement.runningBalance || 0)}</Text></View></View>)}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={filterMenuVisible} transparent animationType="fade" onRequestClose={() => setFilterMenuVisible(false)}>
        <Pressable style={styles.exportMenuBackdrop} onPress={() => setFilterMenuVisible(false)}>
          <Pressable
            style={[styles.exportMenuCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.exportMenuTitle, { color: theme.colors.text }]}>
              {t.locale() === 'tr' ? 'Filtrele' : 'Filter'}
            </Text>
            <View style={styles.filterModalChipRow}>
              {[{ key: 'all', label: t.customers.all }, { key: 'sale', label: t.common.entities.sales }, { key: 'payment', label: t.common.entities.payments }].map((item) => {
                const isActive = movementFilter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setMovementFilter(item.key as 'all' | 'sale' | 'payment')}
                  >
                    <Text style={[styles.filterChipText, { color: isActive ? theme.colors.primary : theme.colors.textMuted }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[styles.filterInput, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder={t.locale() === 'tr' ? 'Hareketlerde ara' : 'Search movements'}
              placeholderTextColor={theme.colors.textSoft}
              value={movementSearchQuery}
              onChangeText={setMovementSearchQuery}
            />
            <View style={styles.filterDateColumn}>
              <DateField
                label={t.locale() === 'tr' ? 'Baþlangýç Tarihi' : 'Start Date'}
                placeholder={t.locale() === 'tr' ? 'Baþlangýç tarihi seç' : 'Select start date'}
                value={movementDateFrom}
                onChange={setMovementDateFrom}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textSoft}
                backgroundColor={theme.colors.surfaceMuted}
                borderColor={theme.colors.border}
                accentColor={theme.colors.primary}
              />
              <DateField
                label={t.locale() === 'tr' ? 'Bitiþ Tarihi' : 'End Date'}
                placeholder={t.locale() === 'tr' ? 'Bitiþ tarihi seç' : 'Select end date'}
                value={movementDateTo}
                onChange={setMovementDateTo}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textSoft}
                backgroundColor={theme.colors.surfaceMuted}
                borderColor={theme.colors.border}
                accentColor={theme.colors.primary}
              />
            </View>
            <TouchableOpacity
              style={[styles.exportMenuOption, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
              onPress={() => {
                setMovementFilter('all');
                setMovementSearchQuery('');
                setMovementDateFrom('');
                setMovementDateTo('');
              }}
            >
              <Text style={[styles.exportMenuOptionText, { color: theme.colors.text }]}>
                {t.locale() === 'tr' ? 'Filtreleri Temizle' : 'Clear Filters'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportMenuOption, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary }]}
              onPress={() => setFilterMenuVisible(false)}
            >
              <Text style={[styles.exportMenuOptionText, { color: theme.colors.primaryStrong }]}>
                {t.locale() === 'tr' ? 'Uygula' : 'Apply'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={exportMenuVisible} transparent animationType="fade" onRequestClose={() => setExportMenuVisible(false)}>
        <Pressable style={styles.exportMenuBackdrop} onPress={() => setExportMenuVisible(false)}>
          <Pressable
            style={[styles.exportMenuCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.exportMenuTitle, { color: theme.colors.text }]}>
              {activeTab === 'customers' ? t.customers.exportTitleCustomer : t.customers.exportTitleSupplier}
            </Text>
            <TouchableOpacity style={[styles.exportMenuOption, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary }]} onPress={() => void handleExportPdf()}>
              <Text style={[styles.exportMenuOptionText, { color: theme.colors.primaryStrong }]}>{t.customers.exportPdf}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exportMenuOption, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]} onPress={() => void handleExportXlsx()}>
              <Text style={[styles.exportMenuOptionText, { color: theme.colors.text }]}>{t.customers.exportXlsx}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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
  detailContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, maxHeight: '85%', minHeight: '55%', overflow: 'hidden' },
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
  detailScroll: { flex: 1 },
  detailList: { paddingHorizontal: 24, paddingBottom: 24, flexGrow: 1 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap', paddingTop: 6 },
  filterSummaryText: { ...typography.caption, fontSize: 12, marginBottom: 16, lineHeight: 18 },
  filterModalChipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  filterChipText: { ...typography.label, fontSize: 13 },
  filterInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  filterDateColumn: { gap: 2 },
  shareActionWrap: { position: 'relative', paddingTop: 4, paddingRight: 4 },
  shareButton: { width: 38, height: 38, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  proBadge: { position: 'absolute', top: -2, right: -2, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, minWidth: 30, alignItems: 'center', justifyContent: 'center' },
  proBadgeText: { ...typography.label, color: '#ffffff', fontSize: 9 },
  exportMenuBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.36)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  exportMenuCard: { width: '100%', maxWidth: 320, borderWidth: 1, borderRadius: 22, padding: 18, gap: 10 },
  exportMenuTitle: { ...typography.heading, fontSize: 18, marginBottom: 4 },
  exportMenuOption: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  exportMenuOptionText: { ...typography.heading, fontSize: 14 },
  movementItem: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  movementTextGroup: { flex: 1 },
  movementTitle: { ...typography.heading, fontSize: 15, marginBottom: 4 },
  movementSubtitle: { ...typography.caption, fontSize: 13 },
  movementAmount: { ...typography.heading, fontSize: 15 },
  movementRight: { alignItems: 'flex-end', minWidth: 116, gap: 6 },
  movementBalanceValue: { ...typography.caption, fontSize: 12 },
});


