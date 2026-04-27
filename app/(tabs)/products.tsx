import { useCallback, useEffect, useState } from 'react';
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
import { Plus, X, Package, TriangleAlert as AlertTriangle, Trash2, Truck } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { DateField } from '@/components/DateField';
import { formatTRY } from '@/lib/format';
import { t } from '@/lib/i18n';
import { readOfflineCache, writeOfflineCache } from '@/lib/offlineCache';
import { createLocalId, enqueueOfflineMutation } from '@/lib/offlineWriteQueue';
import { typography } from '@/lib/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Product {
  id: string;
  name: string;
  code?: string;
  unit: string;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
  min_stock_level: number;
}

interface Supplier {
  id: string;
  name: string;
}

export default function Products() {
  const { company } = useAuth();
  const { theme } = useAppTheme();
  const isTr = t.locale() === 'tr';
  const insets = useSafeAreaInsets();
  const modalBottomSpacing =
    Math.max(insets.bottom, Platform.OS === 'android' ? 34 : 20) + 24;
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    unit: 'adet',
    salePrice: '',
    purchasePrice: '',
    stockQuantity: '',
    minStockLevel: '',
  });
  const [purchaseData, setPurchaseData] = useState({
    supplierId: '',
    productId: '',
    quantity: '',
    unitPrice: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    description: '',
  });

  const ensureCompany = () => {
    if (!company) {
      Alert.alert(t.common.companyRequiredTitle, t.common.companyRequiredText);
      return false;
    }

    return true;
  };

  const fetchProducts = useCallback(async () => {
    if (!company) {
      setProducts([]);
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      const cached = await readOfflineCache<Product[]>('products-list', company.id);
      if (cached?.data) {
        setProducts(cached.data);
        return;
      }
      Alert.alert(t.common.error, error.message);
      return;
    }

    const nextProducts = data ?? [];
    setProducts(nextProducts);
    await writeOfflineCache('products-list', company.id, nextProducts);
  }, [company]);

  const fetchSuppliers = useCallback(async () => {
    if (!company) {
      setSuppliers([]);
      return;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', company.id)
      .order('name', { ascending: true });

    if (error) {
      const cached = await readOfflineCache<Supplier[]>('product-suppliers', company.id);
      if (cached?.data) {
        setSuppliers(cached.data);
      }
      return;
    }

    const nextSuppliers = (data as Supplier[]) ?? [];
    setSuppliers(nextSuppliers);
    await writeOfflineCache('product-suppliers', company.id, nextSuppliers);
  }, [company]);

  useEffect(() => {
    void Promise.all([fetchProducts(), fetchSuppliers()]);
  }, [fetchProducts, fetchSuppliers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchSuppliers()]);
    setRefreshing(false);
  };

  const resetProductForm = () => {
    setFormData({
      name: '',
      code: '',
      unit: 'adet',
      salePrice: '',
      purchasePrice: '',
      stockQuantity: '',
      minStockLevel: '',
    });
    setEditingProduct(null);
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t.common.error, t.products.nameRequired);
      return;
    }

    if (!ensureCompany()) {
      return;
    }

    const payload = {
      company_id: company!.id,
      name: formData.name.trim(),
      code: formData.code.trim() || null,
      unit: formData.unit.trim() || 'adet',
      sale_price: parseFloat(formData.salePrice) || 0,
      purchase_price: parseFloat(formData.purchasePrice) || 0,
      stock_quantity: parseFloat(formData.stockQuantity) || 0,
      min_stock_level: parseFloat(formData.minStockLevel) || 0,
    };

    setSaving(true);
    try {
      const { error } = editingProduct
        ? await supabase
            .from('products')
            .update(payload)
            .eq('id', editingProduct.id)
            .eq('company_id', company!.id)
        : await supabase.from('products').insert(payload);

      if (error) {
        throw error;
      }

      resetProductForm();
      setModalVisible(false);
      await fetchProducts();
    } catch {
      const recordId = editingProduct?.id || createLocalId();
      const localProduct: Product = {
        id: recordId,
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        unit: formData.unit.trim() || 'adet',
        sale_price: parseFloat(formData.salePrice) || 0,
        purchase_price: parseFloat(formData.purchasePrice) || 0,
        stock_quantity: parseFloat(formData.stockQuantity) || 0,
        min_stock_level: parseFloat(formData.minStockLevel) || 0,
      };
      const nextProducts = editingProduct
        ? products.map((item) => (item.id === editingProduct.id ? localProduct : item))
        : [localProduct, ...products];
      setProducts(nextProducts);
      await writeOfflineCache('products-list', company!.id, nextProducts);
      await enqueueOfflineMutation({
        kind: 'upsert',
        mode: editingProduct ? 'update' : 'insert',
        table: 'products',
        companyId: company!.id,
        recordId,
        payload,
      });

      resetProductForm();
      setModalVisible(false);
      Alert.alert(
        t.common.error,
        t.locale() === 'tr'
          ? 'Baðlantý yok. Ürün cihazda saklandý ve sonra senkronlanacak.'
          : 'No connection. The product was saved on this device and will sync later.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      code: product.code || '',
      unit: product.unit || 'adet',
      salePrice: String(product.sale_price ?? ''),
      purchasePrice: String(product.purchase_price ?? ''),
      stockQuantity: String(product.stock_quantity ?? ''),
      minStockLevel: String(product.min_stock_level ?? ''),
    });
    setModalVisible(true);
  };

  const selectedPurchaseSupplierName =
    suppliers.find((supplier) => supplier.id === purchaseData.supplierId)?.name ||
    t.common.selectPlaceholder;
  const selectedPurchaseProductName =
    products.find((product) => product.id === purchaseData.productId)?.name ||
    t.common.selectPlaceholder;

  const methodOptions = [
    { value: 'cash', label: isTr ? 'Nakit' : 'Cash' },
    { value: 'bank_transfer', label: isTr ? 'Banka transferi' : 'Bank transfer' },
    { value: 'credit_card', label: isTr ? 'Kredi kartý' : 'Credit card' },
    { value: 'check', label: isTr ? 'Çek' : 'Check' },
  ];

  const selectedPurchaseMethod =
    methodOptions.find((method) => method.value === purchaseData.paymentMethod)?.label ||
    methodOptions[0].label;

  const handleCreatePurchase = async () => {
    if (!purchaseData.supplierId || !purchaseData.productId) {
      Alert.alert(
        t.common.error,
        isTr ? 'TedarikÃ§i ve Ã¼rÃ¼n seÃ§in.' : 'Select a supplier and product.'
      );
      return;
    }

    const quantity = parseFloat(purchaseData.quantity);
    const unitPrice = parseFloat(purchaseData.unitPrice);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      Alert.alert(
        t.common.error,
        isTr
          ? 'GeÃ§erli miktar ve alÄ±ÅŸ fiyatÄ± girin.'
          : 'Enter a valid quantity and purchase price.'
      );
      return;
    }

    setPurchaseSaving(true);
    try {
      const { error } = await supabase.rpc('create_supplier_purchase', {
        target_supplier_id: purchaseData.supplierId,
        target_product_id: purchaseData.productId,
        target_quantity: quantity,
        target_unit_price: unitPrice,
        target_payment_date: purchaseData.paymentDate,
        target_payment_method: purchaseData.paymentMethod,
        target_description: purchaseData.description.trim() || null,
      });

      if (error) {
        throw error;
      }

      setPurchaseData({
        supplierId: '',
        productId: '',
        quantity: '',
        unitPrice: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: '',
      });
      setPurchaseModalVisible(false);
      await Promise.all([fetchProducts(), fetchSuppliers()]);
    } catch {
      const selectedProduct = products.find(
        (product) => product.id === purchaseData.productId
      );
      const selectedSupplier = suppliers.find(
        (supplier) => supplier.id === purchaseData.supplierId
      );
      const amount = quantity * unitPrice;

      const nextProducts = products.map((product) =>
        product.id === purchaseData.productId
          ? {
              ...product,
              stock_quantity: Number(product.stock_quantity || 0) + quantity,
              purchase_price: unitPrice,
            }
          : product
      );
      setProducts(nextProducts);
      await writeOfflineCache('products-list', company!.id, nextProducts);

      const cachedPayments =
        await readOfflineCache<Record<string, unknown>[]>(
          'payments-list',
          company!.id
        );
      const nextPayments = [
        {
          id: createLocalId(),
          amount,
          payment_date: purchaseData.paymentDate,
          payment_type: 'expense',
          payment_method: purchaseData.paymentMethod,
          description:
            purchaseData.description.trim() ||
            `${selectedProduct?.name || t.common.entities.product} alim kaydi`,
          supplier_id: purchaseData.supplierId,
          suppliers: { name: selectedSupplier?.name || '' },
        },
        ...((cachedPayments?.data as Record<string, unknown>[]) || []),
      ];
      await writeOfflineCache('payments-list', company!.id, nextPayments);

      await enqueueOfflineMutation({
        kind: 'rpc',
        action: 'supplier_purchase',
        companyId: company!.id,
        recordId: createLocalId(),
        payload: {
          supplierId: purchaseData.supplierId,
          productId: purchaseData.productId,
          quantity,
          unitPrice,
          paymentDate: purchaseData.paymentDate,
          paymentMethod: purchaseData.paymentMethod,
          description: purchaseData.description.trim() || null,
        },
      });

      setPurchaseData({
        supplierId: '',
        productId: '',
        quantity: '',
        unitPrice: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: '',
      });
      setPurchaseModalVisible(false);
      Alert.alert(
        t.common.error,
        isTr
          ? 'BaÄŸlantÄ± yok. Mal alÄ±mÄ± cihazda saklandÄ± ve sonra senkronlanacak.'
          : 'No connection. The purchase was saved on this device and will sync later.'
      );
    } finally {
      setPurchaseSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!company) {
      return;
    }

    try {
      setDeletingId(product.id);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
        .eq('company_id', company.id);

      if (error) {
        throw error;
      }

      await fetchProducts();
    } catch {
      const nextProducts = products.filter((item) => item.id !== product.id);
      setProducts(nextProducts);
      await writeOfflineCache('products-list', company.id, nextProducts);
      await enqueueOfflineMutation({
        kind: 'delete',
        table: 'products',
        companyId: company.id,
        recordId: product.id,
      });
      Alert.alert(t.common.error, t.locale() === 'tr' ? 'Baðlantý yok. Silme iþlemi sýraya alýndý.' : 'No connection. Delete was queued.');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (product: Product) => {
    Alert.alert(t.products.deleteConfirmTitle, t.products.deleteConfirmText, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          void handleDelete(product);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Product }) => {
    const isLowStock = item.stock_quantity <= item.min_stock_level;

    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
        activeOpacity={0.86}
        onPress={() => openEditProduct(item)}
      >
        <View
          style={[
            styles.itemIcon,
            {
              backgroundColor: isLowStock
                ? theme.colors.dangerSoft
                : theme.colors.primarySoft,
            },
          ]}
        >
          {isLowStock ? (
            <AlertTriangle size={24} color={theme.colors.danger} />
          ) : (
            <Package size={24} color={theme.colors.primary} />
          )}
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, { color: theme.colors.text }]}>{item.name}</Text>
          {item.code ? (
            <Text style={[styles.itemDetail, { color: theme.colors.textMuted }]}>
              {t.products.codeLabel}: {item.code}
            </Text>
          ) : null}
            <Text style={[styles.itemDetail, { color: theme.colors.textMuted }]}>
              {t.common.entities.stock}: {item.stock_quantity} {item.unit}
            </Text>
        </View>
        <View style={styles.itemPrice}>
          <Text style={[styles.priceText, { color: theme.colors.text }]}>
            {formatTRY(item.sale_price)}
          </Text>
          <Text style={[styles.unitText, { color: theme.colors.textMuted }]}>/{item.unit}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmDelete(item)}
          disabled={deletingId === item.id}
          hitSlop={8}
        >
          <Trash2 size={18} color="#ef4444" />
          <Text style={styles.deleteText}>{t.common.delete}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BrandHeroHeader
        kicker={t.products.kicker}
        brandSubtitle={t.products.heroSubtitle}
        rightAccessory={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => {
                if (!ensureCompany()) {
                  return;
                }
                setPurchaseModalVisible(true);
              }}
              style={[styles.secondaryHeaderButton, { backgroundColor: theme.colors.surface }]}
            >
              <Truck size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!ensureCompany()) {
                  return;
                }
                resetProductForm();
                setModalVisible(true);
              }}
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            >
              <View style={styles.addProductIcon}>
                <Package size={20} color="#ffffff" />
                <View style={styles.addBadge}>
                  <Plus size={12} color={theme.colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        }
      />

      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color={theme.colors.textSoft} />
            <Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>{t.products.empty}</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingProduct ? (isTr ? 'Ürünü Düzenle' : 'Edit Product') : t.products.newProduct}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetProductForm(); }}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={[styles.form, { paddingBottom: modalBottomSpacing }]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.products.productName} *</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder={t.products.productName}
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.products.productCode}</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="SKU"
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.code}
                  onChangeText={(text) => setFormData({ ...formData, code: text })}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfInputLeft]}>
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.products.unit}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surfaceMuted,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    placeholder="adet"
                    placeholderTextColor={theme.colors.textSoft}
                    value={formData.unit}
                    onChangeText={(text) => setFormData({ ...formData, unit: text })}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInputRight]}>
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.products.stockQuantity}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surfaceMuted,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSoft}
                    value={formData.stockQuantity}
                    onChangeText={(text) =>
                      setFormData({ ...formData, stockQuantity: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfInputLeft]}>
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.products.purchasePrice}</Text>
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
                    value={formData.purchasePrice}
                    onChangeText={(text) =>
                      setFormData({ ...formData, purchasePrice: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInputRight]}>
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.products.salePrice}</Text>
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
                    value={formData.salePrice}
                    onChangeText={(text) =>
                      setFormData({ ...formData, salePrice: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.products.minStockLevel}</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.minStockLevel}
                  onChangeText={(text) =>
                    setFormData({ ...formData, minStockLevel: text })
                  }
                  keyboardType="decimal-pad"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: theme.colors.primary },
                  saving && styles.buttonDisabled,
                ]}
                onPress={handleSaveProduct}
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

      <Modal visible={purchaseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {isTr ? 'Tedarikçiden Mal Al' : 'Record Supplier Purchase'}
              </Text>
              <TouchableOpacity onPress={() => setPurchaseModalVisible(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={[styles.form, { paddingBottom: modalBottomSpacing }]}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
                onPress={() => setShowSupplierPicker(true)}
              >
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.entities.supplier}</Text>
                <Text style={[styles.pickerValue, { color: theme.colors.text }]}>{selectedPurchaseSupplierName}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
                onPress={() => setShowProductPicker(true)}
              >
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.common.entities.product}</Text>
                <Text style={[styles.pickerValue, { color: theme.colors.text }]}>{selectedPurchaseProductName}</Text>
              </TouchableOpacity>

              <DateField
                label={t.common.fields.date}
                value={purchaseData.paymentDate}
                onChange={(paymentDate) => setPurchaseData((current) => ({ ...current, paymentDate }))}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textMuted}
                backgroundColor={theme.colors.surfaceMuted}
                borderColor={theme.colors.border}
                accentColor={theme.colors.primary}
              />

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfInputLeft]}>
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>{isTr ? 'Miktar' : 'Quantity'}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={purchaseData.quantity}
                    onChangeText={(quantity) => setPurchaseData((current) => ({ ...current, quantity }))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSoft}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInputRight]}>
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.products.purchasePrice}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={purchaseData.unitPrice}
                    onChangeText={(unitPrice) => setPurchaseData((current) => ({ ...current, unitPrice }))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textSoft}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.payments.paymentMethod}</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
                  onPress={() =>
                    Alert.alert(
                      t.payments.paymentMethod,
                      isTr ? 'Yöntem seçin' : 'Select a method',
                      methodOptions.map((method) => ({
                        text: method.label,
                        onPress: () =>
                          setPurchaseData((current) => ({
                            ...current,
                            paymentMethod: method.value,
                          })),
                      }))
                    )
                  }
                >
                  <Text style={[styles.pickerValue, { color: theme.colors.text }]}>{selectedPurchaseMethod}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t.payments.description}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={purchaseData.description}
                  onChangeText={(description) => setPurchaseData((current) => ({ ...current, description }))}
                  placeholder={isTr ? 'Açýklama' : 'Description'}
                  placeholderTextColor={theme.colors.textSoft}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.colors.primary }, purchaseSaving && styles.buttonDisabled]}
                onPress={handleCreatePurchase}
                disabled={purchaseSaving}
              >
                <Text style={styles.submitButtonText}>
                  {purchaseSaving ? t.common.saving : isTr ? 'Mal Giriþini Kaydet' : 'Save Purchase Entry'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showSupplierPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t.common.entities.supplier}</Text>
              <TouchableOpacity onPress={() => setShowSupplierPicker(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={suppliers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setPurchaseData((current) => ({ ...current, supplierId: item.id }));
                    setShowSupplierPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showProductPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t.common.entities.product}</Text>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setPurchaseData((current) => ({
                      ...current,
                      productId: item.id,
                      unitPrice: current.unitPrice || String(item.purchase_price || ''),
                    }));
                    setShowProductPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>{item.name}</Text>
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryHeaderButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  addProductIcon: {
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
  },
  listItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
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
    ...typography.heading,
    fontSize: 16,
    marginBottom: 4,
  },
  itemDetail: {
    ...typography.caption,
    fontSize: 14,
  },
  itemPrice: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  priceText: {
    ...typography.heading,
    fontSize: 18,
  },
  unitText: {
    ...typography.caption,
    fontSize: 12,
  },
  deleteButton: {
    minWidth: 52,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteText: {
    ...typography.label,
    fontSize: 12,
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    ...typography.body,
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
  pickerModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    maxHeight: '75%',
    minHeight: '50%',
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
  modalTitle: { ...typography.title, fontSize: 20 },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 20,
  },
  halfInputLeft: {
    flex: 1,
    marginRight: 8,
  },
  halfInputRight: {
    flex: 1,
    marginLeft: 8,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pickerValue: {
    ...typography.heading,
    fontSize: 16,
  },
  pickerItem: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    ...typography.heading,
    fontSize: 16,
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
    ...typography.heading,
    color: '#ffffff',
    fontSize: 16,
  },
});







