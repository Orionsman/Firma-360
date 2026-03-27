import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus, X, ShoppingCart, Check, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Sale {
  id: string;
  sale_date: string;
  total_amount: number;
  customer_id?: string | null;
  customers?: Array<{ name?: string }> | null;
  sale_items?: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    products?: Array<{
      name?: string;
      unit?: string;
    }> | null;
  }>;
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
  total: number;
  availableStock: number;
  unit: string;
}

interface StoredSaleItem {
  product_id: string;
  quantity: number;
}

export default function Sales() {
  const { company } = useAuth();
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

  const fetchSales = async () => {
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
      Alert.alert('Hata', error.message);
      return;
    }

    setSales(((data as unknown) as Sale[]) ?? []);
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

  const fetchProducts = async () => {
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
  };

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchProducts();
  }, [company]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([fetchSales(), fetchCustomers(), fetchProducts()]);
    }, [company])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSales();
    setRefreshing(false);
  };

  const addProduct = (product: Product) => {
    const existing = saleItems.find((item) => item.productId === product.id);

    if (existing) {
      if (existing.quantity >= existing.availableStock) {
        Alert.alert(
          'Stok yetersiz',
          `${product.name} icin mevcut stok miktari asilamaz.`
        );
        return;
      }

      setSaleItems((current) =>
        current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice,
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
          total: product.sale_price,
          availableStock: product.stock_quantity,
          unit: product.unit,
        },
      ]);
    }

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
        'Stok yetersiz',
        `${currentItem.productName} icin en fazla ${currentItem.availableStock} ${currentItem.unit} secebilirsiniz.`
      );
      return;
    }

    setSaleItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity, total: quantity * item.unitPrice }
          : item
      )
    );
  };

  const getTotalAmount = () =>
    saleItems.reduce((sum, item) => sum + item.total, 0);

  const handleCreateSale = async () => {
    if (!selectedCustomer) {
      Alert.alert('Hata', 'Lutfen musteri secin.');
      return;
    }

    if (saleItems.length === 0) {
      Alert.alert('Hata', 'Lutfen en az bir urun ekleyin.');
      return;
    }

    if (!ensureCompany()) {
      return;
    }

    setSaving(true);
    try {
      const totalAmount = getTotalAmount();
      const saleNumber = `SAT-${Date.now()}`;
      const insufficientStockItem = saleItems.find(
        (item) => item.quantity > item.availableStock
      );

      if (insufficientStockItem) {
        throw new Error(
          `${insufficientStockItem.productName} icin yeterli stok bulunmuyor.`
        );
      }

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          company_id: company!.id,
          customer_id: selectedCustomer,
          sale_number: saleNumber,
          total_amount: totalAmount,
          paid_amount: 0,
          status: 'pending',
        })
        .select()
        .single();

      if (saleError) {
        throw saleError;
      }

      const { error: itemsError } = await supabase.from('sale_items').insert(
        saleItems.map((item) => ({
          sale_id: saleData.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.total,
        }))
      );

      if (itemsError) {
        throw itemsError;
      }

      for (const item of saleItems) {
        const { error: stockError } = await supabase.rpc('decrement_stock', {
          product_id: item.productId,
          qty: item.quantity,
        });

        if (stockError) {
          throw stockError;
        }

        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            company_id: company!.id,
            product_id: item.productId,
            movement_type: 'out',
            quantity: item.quantity,
            reference_id: saleData.id,
            notes: `Satis: ${saleNumber}`,
          });

        if (movementError) {
          throw movementError;
        }
      }

      setSelectedCustomer('');
      setSaleItems([]);
      setModalVisible(false);
      await Promise.all([fetchSales(), fetchProducts(), fetchCustomers()]);
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Satis olusturulamadi.'
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

      const { data: storedItems, error: itemsFetchError } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', sale.id);

      if (itemsFetchError) {
        throw itemsFetchError;
      }

      for (const item of (storedItems as StoredSaleItem[]) ?? []) {
        const { error: stockError } = await supabase.rpc('increment_stock', {
          product_id: item.product_id,
          qty: item.quantity,
        });

        if (stockError) {
          throw stockError;
        }
      }

      const { error: movementDeleteError } = await supabase
        .from('stock_movements')
        .delete()
        .eq('reference_id', sale.id);

      if (movementDeleteError) {
        throw movementDeleteError;
      }

      const { error: saleDeleteError } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id)
        .eq('company_id', company.id);

      if (saleDeleteError) {
        throw saleDeleteError;
      }

      await Promise.all([fetchSales(), fetchProducts(), fetchCustomers()]);
    } catch (error: unknown) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Satis silinemedi.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const getRelationItem = <T,>(value?: T | T[] | null): T | null => {
    if (!value) {
      return null;
    }

    return Array.isArray(value) ? value[0] || null : value;
  };

  const renderSale = ({ item }: { item: Sale }) => (
    <View style={styles.listItem}>
      <View style={styles.itemContent}>
        <Text style={styles.itemCustomerLarge}>
          {getRelationItem(item.customers)?.name || 'Musteri yok'}
        </Text>
        <Text style={styles.itemDate}>
          {new Date(item.sale_date).toLocaleDateString('tr-TR')}
        </Text>
        <Text style={styles.itemProductNames}>
          {item.sale_items
            ?.map((saleItem) => getRelationItem(saleItem.products)?.name)
            .filter(Boolean)
            .join(', ') || 'Urun yok'}
        </Text>
        <Text style={styles.itemDetails}>
          {item.sale_items
            ?.map((saleItem) => {
              const quantity = Number(saleItem.quantity || 0);
              const product = getRelationItem(saleItem.products);
              const unit = product?.unit
                ? ` ${product.unit}`
                : '';
              const unitPrice = Number(saleItem.unit_price || 0).toLocaleString('tr-TR');
              const totalPrice = Number(saleItem.total_price || 0).toLocaleString('tr-TR');
              return `${quantity}${unit} x ${unitPrice} = ${totalPrice}`;
            })
            .join(' | ') || 'Detay yok'}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemAmount}>
          TL {Number(item.total_amount).toLocaleString('tr-TR')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteSale(item)}
        disabled={deletingId === item.id}
        hitSlop={8}
      >
        <Trash2 size={18} color="#ef4444" />
        <Text style={styles.deleteText}>Sil</Text>
      </TouchableOpacity>
    </View>
  );

  const selectedCustomerName =
    customers.find((customer) => customer.id === selectedCustomer)?.name ||
    'Seciniz';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Satislar</Text>
        <TouchableOpacity
          onPress={() => {
            if (!ensureCompany()) {
              return;
            }
            setModalVisible(true);
          }}
          style={styles.addButton}
        >
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sales}
        renderItem={renderSale}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ShoppingCart size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Henuz satis yok</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Satis</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCustomerPicker(true)}
            >
              <Text style={styles.pickerLabel}>Musteri</Text>
              <Text style={styles.pickerValue}>{selectedCustomerName}</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Urunler</Text>
              {saleItems.map((item) => (
                <View key={item.productId} style={styles.saleItem}>
                  <View style={styles.saleItemContent}>
                    <Text style={styles.saleItemName}>{item.productName}</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        onPress={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        style={styles.quantityButton}
                      >
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        style={styles.quantityButton}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.saleItemPrice}>
                    TL {item.total.toLocaleString('tr-TR')}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => setShowProductPicker(true)}
              >
                <Plus size={20} color="#3b82f6" />
                <Text style={styles.addProductText}>Urun Ekle</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Toplam</Text>
              <Text style={styles.totalAmount}>
                TL {getTotalAmount().toLocaleString('tr-TR')}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.createButton, saving && styles.buttonDisabled]}
              onPress={handleCreateSale}
              disabled={saving}
            >
              <Text style={styles.createButtonText}>
                {saving ? 'Olusturuluyor...' : 'Satis Olustur'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showCustomerPicker} animationType="slide" transparent>
          <View style={styles.pickerModal}>
            <View style={styles.pickerContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Musteri Secin</Text>
                <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={customers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedCustomer(item.id);
                      setShowCustomerPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                    {selectedCustomer === item.id ? (
                      <Check size={20} color="#3b82f6" />
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal visible={showProductPicker} animationType="slide" transparent>
          <View style={styles.pickerModal}>
            <View style={styles.pickerContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Urun Secin</Text>
                <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={products}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => addProduct(item)}
                  >
                    <View>
                      <Text style={styles.pickerItemText}>{item.name}</Text>
                      <Text style={styles.pickerItemDetail}>
                        Stok: {item.stock_quantity} {item.unit}
                      </Text>
                    </View>
                    <Text style={styles.pickerItemPrice}>
                      TL {Number(item.sale_price).toLocaleString('tr-TR')}
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
  list: {
    padding: 16,
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemContent: {
    flex: 1,
  },
  itemCustomerLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  itemDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
  },
  itemProductNames: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: '#64748b',
  },
  itemRight: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  itemAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  pickerButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  pickerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  pickerValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  saleItemContent: {
    flex: 1,
  },
  saleItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    minWidth: 30,
    textAlign: 'center',
  },
  saleItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    borderStyle: 'dashed',
    gap: 8,
  },
  addProductText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  pickerItemDetail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  pickerItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
});
