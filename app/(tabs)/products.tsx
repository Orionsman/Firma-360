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
import { Plus, X, Package, TriangleAlert as AlertTriangle, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { formatTRY } from '@/lib/format';
import { t } from '@/lib/i18n';
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

export default function Products() {
  const { company } = useAuth();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const modalBottomSpacing =
    Math.max(insets.bottom, Platform.OS === 'android' ? 34 : 20) + 24;
  const [products, setProducts] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    unit: 'adet',
    salePrice: '',
    purchasePrice: '',
    stockQuantity: '',
    minStockLevel: '',
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
      Alert.alert(t.common.error, error.message);
      return;
    }

    setProducts(data ?? []);
  }, [company]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t.common.error, t.products.nameRequired);
      return;
    }

    if (!ensureCompany()) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert({
        company_id: company!.id,
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        unit: formData.unit.trim() || 'adet',
        sale_price: parseFloat(formData.salePrice) || 0,
        purchase_price: parseFloat(formData.purchasePrice) || 0,
        stock_quantity: parseFloat(formData.stockQuantity) || 0,
        min_stock_level: parseFloat(formData.minStockLevel) || 0,
      });

      if (error) {
        throw error;
      }

      setFormData({
        name: '',
        code: '',
        unit: 'adet',
        salePrice: '',
        purchasePrice: '',
        stockQuantity: '',
        minStockLevel: '',
      });
      setModalVisible(false);
      await fetchProducts();
    } catch (error: unknown) {
      Alert.alert(
        t.common.error,
        error instanceof Error ? error.message : t.products.saveFailed
      );
    } finally {
      setSaving(false);
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
    } catch (error: unknown) {
      Alert.alert(
        t.common.error,
        error instanceof Error ? error.message : t.products.deleteFailed
      );
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
      <View
        style={[
          styles.listItem,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
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
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BrandHeroHeader
        kicker={t.products.kicker}
        brandSubtitle={t.products.heroSubtitle}
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
            <View style={styles.addProductIcon}>
              <Package size={20} color="#ffffff" />
              <View style={styles.addBadge}>
                <Plus size={12} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
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
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t.products.newProduct}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                onPress={handleAdd}
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
