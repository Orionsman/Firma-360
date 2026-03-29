import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PackagePlus, X, Package, TriangleAlert as AlertTriangle, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';

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
      Alert.alert(
        'Firma gerekli',
        'Once ana sayfadaki firma kurulum kartindan firmanizi olusturmaniz gerekiyor.'
      );
      return false;
    }

    return true;
  };

  const fetchProducts = async () => {
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
      Alert.alert('Hata', error.message);
      return;
    }

    setProducts(data ?? []);
  };

  useEffect(() => {
    fetchProducts();
  }, [company]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Hata', 'Lutfen urun adi girin.');
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
        'Hata',
        error instanceof Error ? error.message : 'Urun kaydedilemedi.'
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
        'Hata',
        error instanceof Error ? error.message : 'Urun silinemedi.'
      );
    } finally {
      setDeletingId(null);
    }
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
            <Text style={[styles.itemDetail, { color: theme.colors.textMuted }]}>Kod: {item.code}</Text>
          ) : null}
          <Text style={[styles.itemDetail, { color: theme.colors.textMuted }]}>
            Stok: {item.stock_quantity} {item.unit}
          </Text>
        </View>
        <View style={styles.itemPrice}>
          <Text style={[styles.priceText, { color: theme.colors.text }]}>
            TL {Number(item.sale_price).toLocaleString('tr-TR')}
          </Text>
          <Text style={[styles.unitText, { color: theme.colors.textMuted }]}>/{item.unit}</Text>
        </View>
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
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Stok Yonetimi</Text>
        <TouchableOpacity
          onPress={() => {
            if (!ensureCompany()) {
              return;
            }
            setModalVisible(true);
          }}
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        >
          <PackagePlus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

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
            <Text style={[styles.emptyText, { color: theme.colors.textSoft }]}>Henuz urun yok</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Yeni Urun</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Urun Adi *</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Urun adi"
                  placeholderTextColor={theme.colors.textSoft}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Urun Kodu</Text>
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
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>Birim</Text>
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
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>Stok Miktari</Text>
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
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>Alis Fiyati</Text>
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
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>Satis Fiyati</Text>
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
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>Min. Stok Seviyesi</Text>
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
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Text>
              </TouchableOpacity>
            </View>
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
  },
  itemPrice: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
  },
  unitText: {
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
  modalTitle: { fontSize: 20, fontWeight: '700' },
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
});
