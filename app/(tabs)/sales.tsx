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
import { Plus, X, ShoppingCart, Check, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { DateField } from '@/components/DateField';
import { formatAppDate, formatTRY } from '@/lib/format';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Sale {
  id: string;
  sale_date: string;
  total_amount: number;
  customer_id?: string | null;
  customers?: { name?: string }[] | null;
  sale_items?: {
    quantity: number;
    unit_price: number;
    total_price: number;
    products?: {
      name?: string;
      unit?: string;
    }[] | null;
  }[];
}

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sale_price: number;
  stock_quantity: number;
  unit: string;
}

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
  unit: string;
}

const interpolate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{{${key}}}`, String(value)),
    template
  );

export default function Sales() {
  const { company } = useAuth();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const modalBottomSpacing =
    Math.max(insets.bottom, Platform.OS === 'android' ? 34 : 20) + 24;
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const ensureCompany = () => {
    if (!company) {
      Alert.alert(t.common.companyRequiredTitle, t.common.companyRequiredText);
      return false;
    }

    return true;
  };

  const fetchSales = useCallback(async () => {
    if (!company) {
      setSales([]);
      return;
    }

    const { data, error } = await supabase
      .from('sales')
      .select(
        'id, sale_date, total_amount, customer_id, customers(name), sale_items(quantity, unit_price, total_price, products(name, unit))'
      )
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert(t.common.error, error.message);
      return;
    }

    setSales((data as unknown as Sale[]) ?? []);
  }, [company]);

  const fetchCustomers = useCallback(async () => {
    if (!company) {
      setCustomers([]);
      return;
    }

    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('company_id', company.id);

    setCustomers(data ?? []);
  }, [company]);

  const fetchProducts = useCallback(async () => {
    if (!company) {
      setProducts([]);
      return;
    }

    const { data } = await supabase
      .from('products')
      .select('id, name, sale_price, stock_quantity, unit')
      .eq('company_id', company.id)
      .gt('stock_quantity', 0);

    setProducts((data as Product[]) ?? []);
  }, [company]);

  useEffect(() => {
    void Promise.all([fetchSales(), fetchCustomers(), fetchProducts()]);
  }, [fetchCustomers, fetchProducts, fetchSales]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([fetchSales(), fetchCustomers(), fetchProducts()]);
    }, [fetchCustomers, fetchProducts, fetchSales])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSales(), fetchCustomers(), fetchProducts()]);
    setRefreshing(false);
  };

  const addProduct = (product: Product) => {
    const existing = saleItems.find((item) => item.productId === product.id);

    if (existing) {
      if (existing.quantity >= existing.availableStock) {
        Alert.alert(
          t.sales.stockInsufficientTitle,
          interpolate(t.sales.stockInsufficientSingle, {
            product: product.name,
          })
        );
        return;
      }

      setSaleItems((current) =>
        current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );
    } else {
      setSaleItems((current) => [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.sale_price,
          availableStock: product.stock_quantity,
          unit: product.unit,
        },
      ]);
    }

    setProductSearch('');
    setShowProductPicker(false);
  };

  const removeItem = (productId: string) => {
    setSaleItems((current) =>
      current.filter((item) => item.productId !== productId)
    );
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    const currentItem = saleItems.find((item) => item.productId === productId);
    if (currentItem && quantity > currentItem.availableStock) {
      Alert.alert(
        t.sales.stockInsufficientTitle,
        interpolate(t.sales.stockInsufficientMax, {
          product: currentItem.productName,
          stock: currentItem.availableStock,
          unit: currentItem.unit,
        })
      );
      return;
    }

    setSaleItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const totalAmount = useMemo(
    () => saleItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [saleItems]
  );

  const handleCreateSale = async () => {
    if (!selectedCustomer) {
      Alert.alert(t.common.error, t.sales.customerRequired);
      return;
    }

    if (saleItems.length === 0) {
      Alert.alert(t.common.error, t.sales.productRequired);
      return;
    }

    if (!ensureCompany()) {
      return;
    }

    setSaving(true);
    try {
      const saleNumber = `SAT-${Date.now()}`;
      const { data, error } = await supabase.rpc('create_sale_with_items', {
        target_customer_id: selectedCustomer,
        sale_items_payload: saleItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        target_sale_number: saleNumber,
      });

      if (error) {
        throw error;
      }

      if (data) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            sale_date: saleDate,
            total_amount: totalAmount,
          })
          .eq('id', data)
          .eq('company_id', company!.id);

        if (updateError) {
          throw updateError;
        }
      }

      setSelectedCustomer('');
      setSaleItems([]);
      setSaleDate(new Date().toISOString().split('T')[0]);
      setModalVisible(false);
      await Promise.all([fetchSales(), fetchProducts(), fetchCustomers()]);
    } catch (error: unknown) {
      Alert.alert(
        t.common.error,
        error instanceof Error ? error.message : t.sales.createFailed
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!company) {
      return;
    }

    try {
      setDeletingId(sale.id);

      const { error } = await supabase.rpc('delete_sale_with_restock', {
        target_sale_id: sale.id,
      });

      if (error) {
        throw error;
      }

      await Promise.all([fetchSales(), fetchProducts(), fetchCustomers()]);
    } catch (error: unknown) {
      Alert.alert(
        t.common.error,
        error instanceof Error ? error.message : t.sales.deleteFailed
      );
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteSale = (sale: Sale) => {
    Alert.alert(t.sales.deleteConfirmTitle, t.sales.deleteConfirmText, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          void handleDeleteSale(sale);
        },
      },
    ]);
  };

  const getRelationItem = <T,>(value?: T | T[] | null): T | null => {
    if (!value) {
      return null;
    }

    return Array.isArray(value) ? value[0] || null : value;
  };

  const renderSale = ({ item }: { item: Sale }) => (
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
      <View style={[styles.saleIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
        <ShoppingCart size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemCustomerLarge, { color: theme.colors.text }]}>
          {getRelationItem(item.customers)?.name || t.sales.noCustomer}
        </Text>
        <Text style={[styles.itemDate, { color: theme.colors.textSoft }]}>
          {formatAppDate(item.sale_date)}
        </Text>
        <Text style={[styles.itemProductNames, { color: theme.colors.textMuted }]}>
          {item.sale_items
            ?.map((saleItem) => getRelationItem(saleItem.products)?.name)
            .filter(Boolean)
            .join(', ') || t.sales.noProduct}
        </Text>
        <Text style={[styles.itemDetails, { color: theme.colors.textSoft }]}>
          {item.sale_items
            ?.map((saleItem) => {
              const quantity = Number(saleItem.quantity || 0);
              const product = getRelationItem(saleItem.products);
              const unit = product?.unit
                ? ` ${product.unit}`
                : '';
              const unitPrice = formatTRY(Number(saleItem.unit_price || 0));
              const totalPrice = formatTRY(Number(saleItem.total_price || 0));
              return `${quantity}${unit} x ${unitPrice} = ${totalPrice}`;
            })
            .join(' | ') || t.sales.detailsEmpty}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.itemAmount, { color: theme.colors.text }]}>
          {formatTRY(item.total_amount)}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: theme.colors.dangerSoft }]}
        onPress={() => confirmDeleteSale(item)}
        disabled={deletingId === item.id}
        hitSlop={8}
      >
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const selectedCustomerName =
    customers.find((customer) => customer.id === selectedCustomer)?.name ||
    t.common.selectPlaceholder;

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        customer.name.toLowerCase().includes(customerSearch.trim().toLowerCase())
      ),
    [customerSearch, customers]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        product.name.toLowerCase().includes(productSearch.trim().toLowerCase())
      ),
    [productSearch, products]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BrandHeroHeader
        kicker={t.sales.kicker}
        brandSubtitle={t.sales.heroSubtitle}
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
            <View style={styles.addSaleIcon}>
              <ShoppingCart size={20} color="#ffffff" />
              <View style={styles.addBadge}>
                <Plus size={12} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={sales}
        renderItem={renderSale}
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
              <ShoppingCart size={30} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>{t.sales.empty}</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t.sales.newSale}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: modalBottomSpacing }}
            keyboardShouldPersistTaps="handled"
          >
            <DateField
              label={t.common.fields.date}
              value={saleDate}
              onChange={setSaleDate}
              textColor={theme.colors.text}
              mutedColor={theme.colors.textMuted}
              backgroundColor={theme.colors.surfaceMuted}
              borderColor={theme.colors.border}
              accentColor={theme.colors.primary}
            />

            <TouchableOpacity
              style={[styles.pickerButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
              onPress={() => setShowCustomerPicker(true)}
            >
              <Text style={[styles.pickerLabel, { color: theme.colors.textMuted }]}>{t.common.entities.customer}</Text>
              <Text style={[styles.pickerValue, { color: theme.colors.text }]}>{selectedCustomerName}</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t.common.entities.products}</Text>
              {saleItems.map((item) => (
                <View
                  key={item.productId}
                  style={[
                    styles.saleItem,
                    { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.saleItemContent}>
                    <Text style={[styles.saleItemName, { color: theme.colors.text }]}>
                      {item.productName}
                    </Text>
                    <View style={styles.unitPriceBlock}>
                      <Text style={[styles.unitPriceLabel, { color: theme.colors.textMuted }]}>
                        {t.products.salePrice}
                      </Text>
                      <TextInput
                        style={[
                          styles.unitPriceInput,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            color: theme.colors.text,
                          },
                        ]}
                        value={String(item.unitPrice)}
                        onChangeText={(value) =>
                          setSaleItems((current) =>
                            current.map((currentItem) =>
                              currentItem.productId === item.productId
                                ? {
                                    ...currentItem,
                                    unitPrice: Number(value.replace(',', '.')) || 0,
                                  }
                                : currentItem
                            )
                          )
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        onPress={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        style={[
                          styles.quantityButton,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.quantityText, { color: theme.colors.text }]}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        style={[
                          styles.quantityButton,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.saleItemPrice, { color: theme.colors.text }]}>
                    {formatTRY(item.quantity * item.unitPrice)}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addProductButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.primary }]}
                onPress={() => setShowProductPicker(true)}
              >
                <Plus size={20} color={theme.colors.primary} />
                <Text style={[styles.addProductText, { color: theme.colors.primary }]}>{t.sales.productAdd}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.totalSection, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}>{t.sales.total}</Text>
              <Text style={[styles.totalStaticValue, { color: theme.colors.text }]}>
                {formatTRY(totalAmount)}
              </Text>
            </View>
          </ScrollView>

          <View
            style={[
              styles.modalFooter,
              {
                borderTopColor: theme.colors.border,
                paddingBottom: modalBottomSpacing,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary }, saving && styles.buttonDisabled]}
              onPress={handleCreateSale}
              disabled={saving}
            >
              <Text style={styles.createButtonText}>
                {saving ? t.sales.creating : t.sales.create}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showCustomerPicker} animationType="slide" transparent>
          <View style={styles.pickerModal}>
            <View style={[styles.pickerContent, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t.sales.customerSelect}</Text>
                <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
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
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                />
              </View>
              <FlatList
                data={filteredCustomers}
                keyExtractor={(item) => item.id}
                style={styles.pickerList}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.pickerListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                    onPress={() => {
                      setSelectedCustomer(item.id);
                      setCustomerSearch('');
                      setShowCustomerPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>
                      {item.name}
                    </Text>
                    {selectedCustomer === item.id ? (
                      <Check size={20} color={theme.colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal visible={showProductPicker} animationType="slide" transparent>
          <View style={styles.pickerModal}>
            <View style={[styles.pickerContent, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t.sales.productSelect}</Text>
                <TouchableOpacity onPress={() => setShowProductPicker(false)}>
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
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
              </View>
              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                style={styles.pickerList}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.pickerListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                    onPress={() => addProduct(item)}
                  >
                    <View>
                      <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.pickerItemDetail, { color: theme.colors.textMuted }]}>
                        {t.common.entities.stock}: {item.stock_quantity} {item.unit}
                      </Text>
                    </View>
                    <Text style={[styles.pickerItemPrice, { color: theme.colors.text }]}>
                      {formatTRY(item.sale_price)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
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
  addSaleIcon: {
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
  list: {
    padding: 16,
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
  saleIconWrap: {
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
  itemCustomerLarge: {
    ...typography.heading,
    fontSize: 18,
    marginBottom: 6,
  },
  itemDate: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: 6,
  },
  itemProductNames: {
    ...typography.label,
    fontSize: 14,
    marginBottom: 4,
  },
  itemDetails: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 19,
  },
  itemRight: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  itemAmount: {
    ...typography.heading,
    fontSize: 18,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.title,
    fontSize: 20,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  pickerLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  pickerValue: {
    ...typography.heading,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
    marginBottom: 12,
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
  },
  saleItemContent: {
    flex: 1,
  },
  saleItemName: {
    ...typography.label,
    fontSize: 14,
    marginBottom: 8,
  },
  unitPriceBlock: {
    marginBottom: 10,
  },
  unitPriceLabel: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: 6,
  },
  unitPriceInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    ...typography.heading,
    fontSize: 18,
    color: '#3b82f6',
  },
  quantityText: {
    ...typography.heading,
    fontSize: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  saleItemPrice: {
    ...typography.heading,
    fontSize: 16,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderRadius: 16,
    borderStyle: 'dashed',
    gap: 8,
  },
  addProductText: {
    ...typography.label,
    fontSize: 14,
  },
  totalSection: {
    gap: 10,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  totalLabel: {
    ...typography.heading,
    fontSize: 18,
  },
  totalStaticValue: {
    ...typography.hero,
    fontSize: 22,
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  createButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
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
  pickerListContent: {
    paddingBottom: 20,
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    ...typography.heading,
    fontSize: 16,
  },
  pickerItemDetail: {
    ...typography.caption,
    fontSize: 14,
    marginTop: 4,
  },
  pickerItemPrice: {
    ...typography.heading,
    fontSize: 16,
  },
});
