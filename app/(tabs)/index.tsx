import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Layers3,
  Package,
  Plus,
  Users,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FirmaLogo } from '@/components/FirmaLogo';
import { UserPanelModal } from '@/components/UserPanelModal';
import { formatSignedTRY, formatTRY } from '@/lib/format';
import { typography } from '@/lib/typography';

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
  timestamp: number;
}

type RelationRecord = { name?: string } | { name?: string }[] | null | undefined;

export default function Dashboard() {
  const { company, createCompanyProfile, user } = useAuth();
  const { theme, mode } = useAppTheme();
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
  const [userPanelVisible, setUserPanelVisible] = useState(false);

  const fetchDashboard = useCallback(async () => {
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
          .select('id, total_amount, sale_date, created_at, customers(name)')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('payments')
          .select(
            'id, amount, payment_date, payment_type, description, created_at, customers(name), suppliers(name)'
          )
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(20),
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
          'Veriler yüklenemedi.'
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
      ...sales.map((sale) => ({
        id: `sale-${sale.id}`,
        title: getRelationName(sale.customers as RelationRecord) || 'Müşteri satışı',
        subtitle: new Date(sale.sale_date).toLocaleDateString('tr-TR'),
        amount: Number(sale.total_amount || 0),
        tone: 'positive' as const,
        timestamp: new Date(sale.created_at || sale.sale_date).getTime(),
      })),
      ...payments.map((payment) => ({
        id: `payment-${payment.id}`,
        title:
          payment.payment_type === 'income'
            ? getRelationName(payment.customers as RelationRecord) || 'Tahsilat'
            : getRelationName(payment.suppliers as RelationRecord) || 'Ödeme',
        subtitle:
          payment.description ||
          new Date(payment.payment_date).toLocaleDateString('tr-TR'),
        amount: Number(payment.amount || 0),
        tone: payment.payment_type === 'income' ? ('positive' as const) : ('negative' as const),
        timestamp: new Date(payment.created_at || payment.payment_date).getTime(),
      })),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
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
  }, [company]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useFocusEffect(
    useCallback(() => {
      void fetchDashboard();
    }, [fetchDashboard])
  );

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
        key: 'new-action',
        label: 'Yeni İşlem',
        icon: Plus,
        onPress: () =>
          Alert.alert('Yeni İşlem', 'Eklemek istediğiniz işlem türünü seçin.', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Satış', onPress: () => router.push('/(tabs)/sales') },
            { text: 'Ödeme', onPress: () => router.push('/(tabs)/payments') },
          ]),
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
        icon: Layers3,
        onPress: () => router.push('/reports'),
      },
    ],
    []
  );

  const profileInitial = useMemo(() => {
    const source = company?.name || user?.email || 'CepteCari';
    return source.trim().charAt(0).toUpperCase();
  }, [company?.name, user?.email]);

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
          <View style={styles.heroGrid} />
          <View style={styles.heroOrbOne} />
          <View style={styles.heroOrbTwo} />
          <View style={styles.heroOrbThree} />

          <View style={styles.heroTop}>
            <View style={styles.brandCard}>
              <View style={styles.brandHalo} />
              <View style={styles.brandRow}>
                <View style={styles.brandLogoShell}>
                  <View style={styles.brandLogoAura} />
                  <View style={styles.brandLogoWrap}>
                    <FirmaLogo size="md" showWordmark={false} logoScale={1.08} />
                  </View>
                </View>
                <View style={styles.brandText}>
                  <Text style={styles.brandTitle}>CepteCari</Text>
                  <Text style={styles.brandKicker}>AKILLI CARİ YÖNETİMİ</Text>
                  <Text style={styles.brandSubtitle}>Cari takibin cebinde</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.profileDot}
              onPress={() => setUserPanelVisible(true)}
              activeOpacity={0.86}
            >
              <View style={styles.profileDotRing}>
                <Text style={styles.profileDotText}>{profileInitial}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroGreeting}>Merhaba, {company?.name || 'CepteCari'}!</Text>
          <Text style={styles.heroSubtitle}>
            Tahsilat, satış ve bakiye hareketlerini aynı yerde net bir görünümle izleyin.
          </Text>

          <View style={styles.summaryStack}>
            <View style={[styles.summaryCard, styles.summaryRed]}>
              <Text style={styles.summaryLabel}>Alacaklar</Text>
              <Text style={styles.summaryValue}>
                {formatTRY(stats.totalReceivables)}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryBlue]}>
              <Text style={styles.summaryLabel}>Borçlar</Text>
              <Text style={styles.summaryValue}>
                {formatTRY(stats.totalPayables)}
              </Text>
            </View>
            <View style={[styles.summaryCardWide, styles.summaryGreen]}>
              <Text style={styles.summaryLabel}>Kasa Bakiyesi</Text>
              <Text style={styles.summaryValue}>
                {formatTRY(stats.cashBalance)}
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
              İlk firma kaydını oluşturun
            </Text>
            <Text style={[styles.setupText, { color: theme.colors.textMuted }]}>
              Cari, borç ve alacak takibini başlatmak için firma adınızı girin.
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
              placeholder="Firma adı"
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
                  Alert.alert('Hata', 'Lütfen firma adı girin.');
                  return;
                }

                setCreatingCompany(true);
                try {
                  await createCompanyProfile(companyName);
                  setCompanyName('');
                  Alert.alert('Başarılı', 'Firma oluşturuldu.');
                } catch (error: unknown) {
                  Alert.alert(
                    'Hata',
                    error instanceof Error ? error.message : 'Firma oluşturulamadı.'
                  );
                } finally {
                  setCreatingCompany(false);
                }
              }}
            >
              <Text style={styles.setupButtonText}>
                {creatingCompany ? 'Oluşturuluyor...' : 'Firma Oluştur'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Hızlı İşlemler</Text>
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
              <Text style={[styles.seeAll, { color: theme.colors.primary }]}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length === 0 ? (
            <Text style={[styles.emptyState, { color: theme.colors.textSoft }]}>
              Henüz hareket bulunmuyor.
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
                  {formatSignedTRY(item.tone === 'positive' ? item.amount : -item.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.metaGrid}>
          <View
            style={[
              styles.metaCard,
              mode === 'dark'
                ? { backgroundColor: theme.colors.surfaceMuted }
                : {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.shadow,
                  },
            ]}
          >
            <Text style={[styles.metaValue, { color: theme.colors.text }]}>
              {stats.totalCustomers}
            </Text>
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>
              Cari Hesap
            </Text>
          </View>
          <View
            style={[
              styles.metaCard,
              mode === 'dark'
                ? { backgroundColor: theme.colors.surfaceMuted }
                : {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.shadow,
                  },
            ]}
          >
            <Text style={[styles.metaValue, { color: theme.colors.text }]}>
              {stats.totalProducts}
            </Text>
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Stok Kalemi</Text>
          </View>
          <View
            style={[
              styles.metaCardWide,
              mode === 'dark'
                ? { backgroundColor: theme.colors.surfaceMuted }
                : {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.shadow,
                  },
            ]}
          >
            <Text style={[styles.metaValue, { color: theme.colors.text }]}>
              {formatTRY(stats.totalSales)}
            </Text>
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>Toplam Satış</Text>
          </View>
        </View>
      </ScrollView>
      <UserPanelModal
        visible={userPanelVisible}
        onClose={() => setUserPanelVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingBottom: 28 },
  hero: {
    paddingTop: 46,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    transform: [{ scale: 1.18 }, { rotate: '-9deg' }],
  },
  heroOrbOne: {
    position: 'absolute',
    top: -40,
    right: -18,
    width: 158,
    height: 158,
    borderRadius: 79,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  heroOrbTwo: {
    position: 'absolute',
    top: 102,
    left: -28,
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: 'rgba(34,228,214,0.12)',
  },
  heroOrbThree: {
    position: 'absolute',
    bottom: -62,
    right: '26%',
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: 'rgba(17, 12, 56, 0.16)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandCard: {
    position: 'relative',
    flex: 1,
    maxWidth: '84%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#100828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  brandHalo: {
    position: 'absolute',
    right: -16,
    top: -20,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(86, 213, 255, 0.14)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  brandLogoShell: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoAura: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(34,228,214,0.18)',
  },
  brandLogoWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    flex: 1,
    minHeight: 58,
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  brandKicker: {
    ...typography.label,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  brandTitle: {
    ...typography.hero,
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 1,
  },
  brandSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 2,
  },
  profileDot: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
  },
  profileDotRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDotText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  heroGreeting: {
    ...typography.hero,
    color: '#FFFFFF',
    fontSize: 26,
    marginTop: 2,
    lineHeight: 31,
    maxWidth: '92%',
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
    maxWidth: '90%',
  },
  summaryStack: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    padding: 12,
  },
  summaryCardWide: {
    width: '100%',
    borderRadius: 14,
    padding: 12,
  },
  summaryRed: { backgroundColor: '#FF626B' },
  summaryBlue: { backgroundColor: '#2F80ED' },
  summaryGreen: { backgroundColor: '#38C977' },
  summaryLabel: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.92,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: {
    ...typography.hero,
    color: '#FFFFFF',
    fontSize: 20,
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
    ...typography.title,
    fontSize: 18,
  },
  setupText: {
    ...typography.body,
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
    ...typography.heading,
    color: '#FFF',
    fontSize: 15,
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
    ...typography.title,
    fontSize: 22,
  },
  seeAll: {
    ...typography.label,
    fontSize: 13,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  quickAction: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
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
    ...typography.label,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
    ...typography.heading,
    color: '#3156F5',
    fontSize: 15,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    ...typography.heading,
    fontSize: 15,
  },
  activitySubtitle: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 3,
  },
  activityAmount: {
    ...typography.heading,
    fontSize: 18,
  },
  metaGrid: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaCard: {
    width: '48.4%',
    minWidth: 146,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  metaCardWide: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  metaValue: {
    ...typography.heading,
    fontSize: 17,
  },
  metaLabel: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 4,
  },
});
