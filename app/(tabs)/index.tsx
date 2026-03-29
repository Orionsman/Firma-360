import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3,
  CreditCard,
  Package,
  Plus,
  ShoppingCart,
  Users,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FirmaLogo } from '@/components/FirmaLogo';

interface DashboardStats {
  totalReceivables: number;
  totalPayables: number;
  cashBalance: number;
  totalCustomers: number;
  totalProducts: number;
  totalSales: number;
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  tone: 'positive' | 'negative';
}

type RelationRecord = { name?: string } | { name?: string }[] | null | undefined;

export default function Dashboard() {
  const { company, createCompanyProfile } = useAuth();
  const { theme } = useAppTheme();
  const [stats, setStats] = useState<DashboardStats>({
    totalReceivables: 0,
    totalPayables: 0,
    cashBalance: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalSales: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);

  const fetchDashboard = async () => {
    if (!company) {
      setStats({
        totalReceivables: 0,
        totalPayables: 0,
        cashBalance: 0,
        totalCustomers: 0,
        totalProducts: 0,
        totalSales: 0,
      });
      setRecentActivity([]);
      return;
    }

    const [salesResult, paymentsResult, customersResult, productsResult] =
      await Promise.all([
        supabase
          .from('sales')
          .select('id, total_amount, sale_date, customers(name)')
          .eq('company_id', company.id)
          .order('sale_date', { ascending: false }),
        supabase
          .from('payments')
          .select(
            'id, amount, payment_date, payment_type, customers(name), suppliers(name), description'
          )
          .eq('company_id', company.id)
          .order('payment_date', { ascending: false }),
        supabase.from('customers').select('id').eq('company_id', company.id),
        supabase.from('products').select('id').eq('company_id', company.id),
      ]);

    if (salesResult.error || paymentsResult.error || customersResult.error || productsResult.error) {
      Alert.alert(
        'Hata',
        salesResult.error?.message ||
          paymentsResult.error?.message ||
          customersResult.error?.message ||
          productsResult.error?.message ||
          'Veriler yuklenemedi.'
      );
      return;
    }

    const sales = salesResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const totalSales = sales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    );
    const totalIncome = payments
      .filter((payment) => payment.payment_type === 'income')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const totalExpense = payments
      .filter((payment) => payment.payment_type === 'expense')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const getRelationName = (value: RelationRecord) => {
      if (!value) {
        return undefined;
      }

      return Array.isArray(value) ? value[0]?.name : value.name;
    };

    const activities: ActivityItem[] = [
      ...sales.slice(0, 6).map((sale) => ({
        id: `sale-${sale.id}`,
        title: getRelationName(sale.customers as RelationRecord) || 'Musteri satisi',
        subtitle: new Date(sale.sale_date).toLocaleDateString('tr-TR'),
        amount: Number(sale.total_amount || 0),
        tone: 'positive' as const,
      })),
      ...payments.slice(0, 6).map((payment) => ({
        id: `payment-${payment.id}`,
        title:
          payment.payment_type === 'income'
            ? getRelationName(payment.customers as RelationRecord) || 'Tahsilat'
            : getRelationName(payment.suppliers as RelationRecord) || 'Odeme',
        subtitle:
          payment.description ||
          new Date(payment.payment_date).toLocaleDateString('tr-TR'),
        amount: Number(payment.amount || 0),
        tone: payment.payment_type === 'income' ? ('positive' as const) : ('negative' as const),
      })),
    ]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 5);

    setStats({
      totalReceivables: Math.max(totalSales - totalIncome, 0),
      totalPayables: totalExpense,
      cashBalance: totalIncome - totalExpense,
      totalCustomers: customersResult.data?.length || 0,
      totalProducts: productsResult.data?.length || 0,
      totalSales,
    });
    setRecentActivity(activities);
  };

  useEffect(() => {
    void fetchDashboard();
  }, [company]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const quickActions = useMemo(
    () => [
      {
        key: 'customers',
        label: 'Cari Hesaplar',
        icon: Users,
        onPress: () => router.push('/(tabs)/customers'),
      },
      {
        key: 'sales',
        label: 'Yeni Islem',
        icon: Plus,
        onPress: () => router.push('/(tabs)/sales'),
      },
      {
        key: 'payments',
        label: 'Hareketler',
        icon: CreditCard,
        onPress: () => router.push('/(tabs)/payments'),
      },
      {
        key: 'products',
        label: 'Stoklar',
        icon: Package,
        onPress: () => router.push('/(tabs)/products'),
      },
      {
        key: 'reports',
        label: 'Raporlar',
        icon: BarChart3,
        onPress: () => router.push('/(tabs)/payments'),
      },
      {
        key: 'sales-list',
        label: 'Satislar',
        icon: ShoppingCart,
        onPress: () => router.push('/(tabs)/sales'),
      },
    ],
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient
          colors={[theme.colors.primaryStrong, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <FirmaLogo size="sm" />
            <View style={styles.profileDot}>
              <Text style={styles.profileDotText}>C</Text>
            </View>
          </View>

          <Text style={styles.heroGreeting}>Merhaba, {company?.name || 'CepteCari'}!</Text>
          <Text style={styles.heroSubtitle}>Cari takibin cebinde</Text>

          <View style={styles.summaryStack}>
            <View style={[styles.summaryCard, styles.summaryRed]}>
              <Text style={styles.summaryLabel}>Alacaklar</Text>
              <Text style={styles.summaryValue}>
                {stats.totalReceivables.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryBlue]}>
              <Text style={styles.summaryLabel}>Borclar</Text>
              <Text style={styles.summaryValue}>
                {stats.totalPayables.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
            <View style={[styles.summaryCardWide, styles.summaryGreen]}>
              <Text style={styles.summaryLabel}>Kasa Bakiyesi</Text>
              <Text style={styles.summaryValue}>
                {stats.cashBalance.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
          </View>
        </LinearGradient>

        {!company ? (
          <View
            style={[
              styles.setupCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.setupTitle, { color: theme.colors.text }]}>
              Ilk firma kaydini olusturun
            </Text>
            <Text style={[styles.setupText, { color: theme.colors.textMuted }]}>
              Cari, borc ve alacak takibini baslatmak icin firma adinizi girin.
            </Text>

            <TextInput
              style={[
                styles.setupInput,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Firma adi"
              placeholderTextColor={theme.colors.textSoft}
              value={companyName}
              onChangeText={setCompanyName}
            />

            <TouchableOpacity
              style={[
                styles.setupButton,
                { backgroundColor: theme.colors.primary },
                creatingCompany && styles.buttonDisabled,
              ]}
              disabled={creatingCompany}
              onPress={async () => {
                if (!companyName.trim()) {
                  Alert.alert('Hata', 'Lutfen firma adi girin.');
                  return;
                }

                setCreatingCompany(true);
                try {
                  await createCompanyProfile(companyName);
                  setCompanyName('');
                  Alert.alert('Basarili', 'Firma olusturuldu.');
                } catch (error: unknown) {
                  Alert.alert(
                    'Hata',
                    error instanceof Error ? error.message : 'Firma olusturulamadi.'
                  );
                } finally {
                  setCreatingCompany(false);
                }
              }}
            >
              <Text style={styles.setupButtonText}>
                {creatingCompany ? 'Olusturuluyor...' : 'Firma Olustur'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Hizli Islemler</Text>
          </View>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <TouchableOpacity
                  key={action.key}
                  style={[styles.quickAction, { backgroundColor: theme.colors.surfaceMuted }]}
                  onPress={action.onPress}
                >
                  <View
                    style={[
                      styles.quickIconWrap,
                      { backgroundColor: theme.colors.primarySoft },
                    ]}
                  >
                    <Icon size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.quickLabel, { color: theme.colors.text }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Son Hareketler</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/payments')}>
              <Text style={[styles.seeAll, { color: theme.colors.primary }]}>Tumunu Gor</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length === 0 ? (
            <Text style={[styles.emptyState, { color: theme.colors.textSoft }]}>
              Henuz hareket bulunmuyor.
            </Text>
          ) : (
            recentActivity.map((item) => (
              <View
                key={item.id}
                style={[styles.activityRow, { borderBottomColor: theme.colors.border }]}
              >
                <View style={styles.activityAvatar}>
                  <Text style={styles.activityAvatarText}>
                    {item.title.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.activityText}>
                  <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.activitySubtitle, { color: theme.colors.textMuted }]}>
                    {item.subtitle}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.activityAmount,
                    {
                      color:
                        item.tone === 'positive' ? theme.colors.success : theme.colors.danger,
                    },
                  ]}
                >
                  {item.tone === 'positive' ? '+' : '-'}
                  {item.amount.toLocaleString('tr-TR')} ₺
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.metaRow, { backgroundColor: theme.colors.surfaceMuted }]}>
          <View style={styles.metaBox}>
            <Text style={[styles.metaValue, { color: theme.colors.text }]}>
              {stats.totalCustomers}
            </Text>
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>
              Cari Hesap
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaBox}>
            <Text style={[styles.metaValue, { color: theme.colors.text }]}>
              {stats.totalProducts}
            </Text>
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Stok Kalemi</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaBox}>
            <Text style={[styles.metaValue, { color: theme.colors.text }]}>
              {stats.totalSales.toLocaleString('tr-TR')} ₺
            </Text>
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Toplam Satis</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingBottom: 28 },
  hero: {
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  profileDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDotText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  summaryStack: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 16,
    padding: 14,
  },
  summaryCardWide: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
  },
  summaryRed: { backgroundColor: '#FF626B' },
  summaryBlue: { backgroundColor: '#2F80ED' },
  summaryGreen: { backgroundColor: '#38C977' },
  summaryLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.92,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  setupCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  setupText: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 14,
  },
  setupInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 12,
  },
  setupButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  setupButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: { opacity: 0.6 },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAction: {
    width: '31%',
    minWidth: 100,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  quickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyState: {
    fontSize: 14,
    paddingBottom: 6,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityAvatarText: {
    color: '#3156F5',
    fontWeight: '800',
    fontSize: 15,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  activitySubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  activityAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  metaRow: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaBox: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(108, 120, 160, 0.25)',
  },
  metaValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  metaLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
