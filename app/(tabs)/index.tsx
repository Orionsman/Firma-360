import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
} from 'lucide-react-native';

interface Stats {
  totalSales: number;
  totalCustomers: number;
  totalProducts: number;
  totalPayments: number;
  lowStockProducts: number;
}

interface DetailItem {
  id: string;
  title: string;
  subtitle: string;
  value: string;
}

export default function Dashboard() {
  const { company } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
      totalCustomers: 0,
      totalProducts: 0,
      totalPayments: 0,
      lowStockProducts: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailItems, setDetailItems] = useState<DetailItem[]>([]);

  const fetchStats = async () => {
    if (!company) return;

    try {
      const [salesData, customersData, productsData, paymentsData] =
        await Promise.all([
          supabase
            .from('sales')
            .select('total_amount')
            .eq('company_id', company.id),
          supabase.from('customers').select('id').eq('company_id', company.id),
          supabase
            .from('products')
            .select('stock_quantity, min_stock_level')
            .eq('company_id', company.id),
          supabase
            .from('payments')
            .select('amount, payment_type')
            .eq('company_id', company.id),
        ]);

      const totalSales =
        salesData.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) ||
        0;

      const lowStockProducts =
        productsData.data?.filter(
          (p) => p.stock_quantity <= p.min_stock_level
        ).length || 0;

      const totalPayments =
        paymentsData.data?.reduce((sum, payment) => {
          const amount = Number(payment.amount);
          return payment.payment_type === 'income'
            ? sum + amount
            : sum - amount;
        }, 0) || 0;

      setStats({
        totalSales,
        totalCustomers: customersData.data?.length || 0,
        totalProducts: productsData.data?.length || 0,
        totalPayments,
        lowStockProducts,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [company]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const getRelationItem = <T,>(value?: T | T[] | null): T | null => {
    if (!value) {
      return null;
    }

    return Array.isArray(value) ? value[0] || null : value;
  };

  const openSalesDetails = async () => {
    if (!company) {
      return;
    }

    const { data, error } = await supabase
      .from('sales')
      .select('id, total_amount, sale_date, customers(name)')
      .eq('company_id', company.id)
      .order('sale_date', { ascending: false })
      .limit(20);

    if (error) {
      return;
    }

    setDetailTitle('Toplam Satis');
    setDetailItems(
      (data ?? []).map((sale) => ({
        id: sale.id,
        title: getRelationItem(sale.customers)?.name || 'Musteri yok',
        subtitle: new Date(sale.sale_date).toLocaleDateString('tr-TR'),
        value: `TL ${Number(sale.total_amount).toLocaleString('tr-TR')}`,
      }))
    );
    setDetailVisible(true);
  };

  const openPaymentDetails = async () => {
    if (!company) {
      return;
    }

    const { data, error } = await supabase
      .from('payments')
      .select('id, amount, payment_date, payment_type, customers(name), suppliers(name)')
      .eq('company_id', company.id)
      .order('payment_date', { ascending: false })
      .limit(20);

    if (error) {
      return;
    }

    setDetailTitle('Toplam Odeme');
    setDetailItems(
      (data ?? []).map((payment) => ({
        id: payment.id,
        title:
          payment.payment_type === 'income'
            ? getRelationItem(payment.customers)?.name || 'Musteri yok'
            : getRelationItem(payment.suppliers)?.name || 'Tedarikci yok',
        subtitle: new Date(payment.payment_date).toLocaleDateString('tr-TR'),
        value: `${payment.payment_type === 'income' ? '+' : '-'}TL ${Number(payment.amount).toLocaleString('tr-TR')}`,
      }))
    );
    setDetailVisible(true);
  };

  const openCustomerDetails = async () => {
    if (!company) {
      return;
    }

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, email')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return;
    }

    setDetailTitle('Musteriler');
    setDetailItems(
      (data ?? []).map((customer) => ({
        id: customer.id,
        title: customer.name,
        subtitle: customer.phone || customer.email || 'Detay yok',
        value: '',
      }))
    );
    setDetailVisible(true);
  };

  const openProductDetails = async () => {
    if (!company) {
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .select('id, name, stock_quantity, unit')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return;
    }

    setDetailTitle('Urunler');
    setDetailItems(
      (data ?? []).map((product) => ({
        id: product.id,
        title: product.name,
        subtitle: 'Stok',
        value: `${Number(product.stock_quantity).toLocaleString('tr-TR')} ${product.unit}`,
      }))
    );
    setDetailVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba!</Text>
          <Text style={styles.companyName}>{company?.name || 'Firma'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={openSalesDetails}>
            <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
              <ShoppingCart size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>
              TL {stats.totalSales.toLocaleString('tr-TR')}
            </Text>
            <Text style={styles.statLabel}>Toplam Satis</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={openPaymentDetails}>
            <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
              <DollarSign size={24} color="#22c55e" />
            </View>
            <Text style={styles.statValue}>
              TL {stats.totalPayments.toLocaleString('tr-TR')}
            </Text>
            <Text style={styles.statLabel}>Toplam Odeme</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={openCustomerDetails}>
            <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
              <Users size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{stats.totalCustomers}</Text>
            <Text style={styles.statLabel}>Musteriler</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={openProductDetails}>
            <View style={[styles.iconContainer, { backgroundColor: '#e0e7ff' }]}>
              <Package size={24} color="#6366f1" />
            </View>
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Urunler</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Bildirimler</Text>

          {stats.lowStockProducts > 0 && (
            <View style={[styles.alertCard, { borderLeftColor: '#ef4444' }]}>
              <TrendingDown size={20} color="#ef4444" />
              <Text style={styles.alertText}>
                {stats.lowStockProducts} urunun stok seviyesi dusuk
              </Text>
            </View>
          )}

          {stats.lowStockProducts === 0 && (
            <View style={styles.noAlerts}>
              <Text style={styles.noAlertsText}>
                Su anda bildirim bulunmuyor
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={detailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{detailTitle}</Text>
            <ScrollView contentContainerStyle={styles.detailList}>
              {detailItems.map((item) => (
                <View key={item.id} style={styles.detailCard}>
                  <View style={styles.detailText}>
                    <Text style={styles.detailTitle}>{item.title}</Text>
                    <Text style={styles.detailSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.value ? <Text style={styles.detailValue}>{item.value}</Text> : null}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailVisible(false)}
            >
              <Text style={styles.closeButtonText}>Kapat</Text>
            </TouchableOpacity>
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
  greeting: {
    fontSize: 16,
    color: '#64748b',
  },
  companyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '47%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  alertsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  alertText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  noAlerts: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noAlertsText: {
    fontSize: 14,
    color: '#94a3b8',
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
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  detailList: {
    paddingBottom: 16,
  },
  detailCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  detailSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
