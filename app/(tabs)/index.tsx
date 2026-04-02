import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Layers3, Package, Plus, Users } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FirmaLogo } from '@/components/FirmaLogo';
import { UserPanelModal } from '@/components/UserPanelModal';
import { formatSignedTRY, formatTRY } from '@/lib/format';
import { t } from '@/lib/i18n';
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
  tone: 'income' | 'expense';
  kind: 'sale' | 'income' | 'expense';
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
  const [showAllRecentActivity, setShowAllRecentActivity] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
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
      setLoadingDashboard(false);
      return;
    }

    setLoadingDashboard(true);

    const getRelationName = (value: RelationRecord) => {
      if (!value) {
        return undefined;
      }

      return Array.isArray(value) ? value[0]?.name : value.name;
    };

    try {
      const [
        salesTotalsResult,
        paymentsTotalsResult,
        salesActivityResult,
        paymentsActivityResult,
        customersResult,
        productsResult,
      ] = await Promise.all([
        supabase.from('sales').select('total_amount').eq('company_id', company.id),
        supabase
          .from('payments')
          .select('amount, payment_type')
          .eq('company_id', company.id),
        supabase
          .from('sales')
          .select('id, total_amount, sale_date, created_at, customers(name)')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select(
            'id, amount, payment_date, payment_type, description, created_at, customers(name), suppliers(name)'
          )
          .eq('company_id', company.id)
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('id').eq('company_id', company.id),
        supabase.from('products').select('id').eq('company_id', company.id),
      ]);

      if (
        salesTotalsResult.error ||
        paymentsTotalsResult.error ||
        salesActivityResult.error ||
        paymentsActivityResult.error ||
        customersResult.error ||
        productsResult.error
      ) {
        Alert.alert(
          t.common.error,
          salesTotalsResult.error?.message ||
            paymentsTotalsResult.error?.message ||
            salesActivityResult.error?.message ||
            paymentsActivityResult.error?.message ||
            customersResult.error?.message ||
            productsResult.error?.message ||
            t.dashboard.errors.loadFailed
        );
        return;
      }

      const salesTotals = salesTotalsResult.data ?? [];
      const paymentTotals = paymentsTotalsResult.data ?? [];
      const salesActivity = salesActivityResult.data ?? [];
      const paymentsActivity = paymentsActivityResult.data ?? [];

      const totalSales = salesTotals.reduce(
        (sum, sale) => sum + Number(sale.total_amount || 0),
        0
      );
      const totalIncome = paymentTotals
        .filter((payment) => payment.payment_type === 'income')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const totalExpense = paymentTotals
        .filter((payment) => payment.payment_type === 'expense')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const activities: ActivityItem[] = [
        ...salesActivity.map((sale) => ({
          id: `sale-${sale.id}`,
          title:
            getRelationName(sale.customers as RelationRecord) ||
            t.dashboard.activity.customerSale,
          subtitle: new Date(sale.sale_date).toLocaleDateString('tr-TR'),
          amount: Number(sale.total_amount || 0),
          tone: 'income' as const,
          kind: 'sale' as const,
          timestamp: new Date(sale.created_at || sale.sale_date).getTime(),
        })),
        ...paymentsActivity.map((payment) => ({
          id: `payment-${payment.id}`,
          title:
            payment.payment_type === 'income'
              ? getRelationName(payment.customers as RelationRecord) ||
                t.dashboard.activity.collection
              : getRelationName(payment.suppliers as RelationRecord) ||
                t.dashboard.activity.payment,
          subtitle:
            payment.description ||
            new Date(payment.payment_date).toLocaleDateString('tr-TR'),
          amount: Number(payment.amount || 0),
          tone:
            payment.payment_type === 'income'
              ? ('income' as const)
              : ('expense' as const),
          kind:
            payment.payment_type === 'income'
              ? ('income' as const)
              : ('expense' as const),
          timestamp: new Date(payment.created_at || payment.payment_date).getTime(),
        })),
      ].sort((a, b) => b.timestamp - a.timestamp);

      setStats({
        totalReceivables: Math.max(totalSales - totalIncome, 0),
        totalPayables: totalExpense,
        cashBalance: totalIncome - totalExpense,
        totalCustomers: customersResult.data?.length || 0,
        totalProducts: productsResult.data?.length || 0,
        totalSales,
      });
      setRecentActivity(activities);
    } finally {
      setLoadingDashboard(false);
    }
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
        label: t.dashboard.quickActions.customers,
        icon: Users,
        onPress: () => router.push('/(tabs)/customers'),
      },
      {
        key: 'new-action',
        label: t.dashboard.quickActions.newAction,
        icon: Plus,
        onPress: () =>
          Alert.alert(
            t.dashboard.quickActions.newAction,
            t.dashboard.quickActions.prompt,
            [
              { text: t.common.cancel, style: 'cancel' },
              {
                text: t.dashboard.quickActions.sales,
                onPress: () => router.push('/(tabs)/sales'),
              },
              {
                text: t.dashboard.quickActions.payments,
                onPress: () => router.push('/(tabs)/payments'),
              },
            ]
          ),
      },
      {
        key: 'products',
        label: t.dashboard.quickActions.products,
        icon: Package,
        onPress: () => router.push('/(tabs)/products'),
      },
      {
        key: 'reports',
        label: t.dashboard.quickActions.reports,
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

  const visibleRecentActivity = useMemo(
    () => (showAllRecentActivity ? recentActivity : recentActivity.slice(0, 5)),
    [recentActivity, showAllRecentActivity]
  );

  const summaryCards = useMemo(
    () => [
      {
        key: 'receivables',
        label: t.dashboard.summary.receivables,
        value: formatTRY(stats.totalReceivables),
        backgroundColor: mode === 'dark' ? '#3B2630' : '#FFF0F1',
        borderColor: mode === 'dark' ? '#5E3643' : '#FFD6DA',
        valueColor: mode === 'dark' ? '#FFD5DA' : '#B64051',
      },
      {
        key: 'payables',
        label: t.dashboard.summary.payables,
        value: formatTRY(stats.totalPayables),
        backgroundColor: mode === 'dark' ? '#1F334D' : '#EEF5FF',
        borderColor: mode === 'dark' ? '#30537F' : '#D4E5FF',
        valueColor: mode === 'dark' ? '#D8E8FF' : '#2356A8',
      },
      {
        key: 'cash-balance',
        label: t.dashboard.summary.cashBalance,
        value: formatTRY(stats.cashBalance),
        backgroundColor: mode === 'dark' ? '#1E3A33' : '#EEF9F2',
        borderColor: mode === 'dark' ? '#2D6155' : '#D2EFDD',
        valueColor: mode === 'dark' ? '#D7F7E2' : '#1E7A52',
        wide: true,
      },
    ],
    [mode, stats.cashBalance, stats.totalPayables, stats.totalReceivables]
  );

  const getActivityBadge = (kind: ActivityItem['kind']) => {
    if (kind === 'sale') {
      return {
        label: t.dashboard.activity.saleBadge,
        backgroundColor: '#DBEAFE',
        color: '#1D4ED8',
      };
    }

    if (kind === 'income') {
      return {
        label: t.dashboard.activity.collectionBadge,
        backgroundColor: '#DCFCE7',
        color: '#166534',
      };
    }

    return {
      label: t.dashboard.activity.paymentBadge,
      backgroundColor: '#FEE2E2',
      color: '#B91C1C',
    };
  };

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
                  <Text style={styles.brandKicker}>{t.dashboard.hero.kicker}</Text>
                  <Text style={styles.brandSubtitle}>{t.dashboard.hero.subtitle}</Text>
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

          <Text style={styles.heroGreeting}>
            {t.dashboard.hero.greetingPrefix} {company?.name || 'CepteCari'}!
          </Text>
          <Text style={styles.heroSubtitle}>{t.dashboard.hero.summary}</Text>

          <View style={styles.summaryStack}>
            {summaryCards.map((card) => (
              <View
                key={card.key}
                style={[
                  card.wide ? styles.summaryCardWide : styles.summaryCard,
                  {
                    backgroundColor: card.backgroundColor,
                    borderColor: card.borderColor,
                  },
                ]}
              >
                <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
                  {card.label}
                </Text>
                <Text style={[styles.summaryValue, { color: card.valueColor }]}>{card.value}</Text>
              </View>
            ))}
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
              {t.dashboard.setup.title}
            </Text>
            <Text style={[styles.setupText, { color: theme.colors.textMuted }]}>
              {t.dashboard.setup.text}
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
              placeholder={t.dashboard.setup.placeholder}
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
                  Alert.alert(t.common.error, t.dashboard.errors.companyNameRequired);
                  return;
                }

                setCreatingCompany(true);
                try {
                  await createCompanyProfile(companyName);
                  setCompanyName('');
                  Alert.alert(t.common.success, t.dashboard.setup.created);
                } catch (error: unknown) {
                  Alert.alert(
                    t.common.error,
                    error instanceof Error
                      ? error.message
                      : t.dashboard.errors.companyCreateFailed
                  );
                } finally {
                  setCreatingCompany(false);
                }
              }}
            >
              <Text style={styles.setupButtonText}>
                {creatingCompany ? t.dashboard.setup.creating : t.dashboard.setup.button}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t.dashboard.quickActions.title}
            </Text>
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t.dashboard.activity.title}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAllRecentActivity((current) => !current)}
              disabled={recentActivity.length <= 5}
            >
              <Text
                style={[
                  styles.seeAll,
                  {
                    color:
                      recentActivity.length <= 5
                        ? theme.colors.textSoft
                        : theme.colors.primary,
                  },
                ]}
              >
                {recentActivity.length <= 5
                  ? t.dashboard.activity.allListed
                  : showAllRecentActivity
                    ? t.dashboard.activity.showLess
                    : t.dashboard.activity.showAll}
              </Text>
            </TouchableOpacity>
          </View>

          {loadingDashboard ? (
            <Text style={[styles.emptyState, { color: theme.colors.textSoft }]}>
              {t.dashboard.activity.loading}
            </Text>
          ) : recentActivity.length === 0 ? (
            <Text style={[styles.emptyState, { color: theme.colors.textSoft }]}>
              {t.dashboard.activity.empty}
            </Text>
          ) : (
            visibleRecentActivity.map((item) => {
              const badge = getActivityBadge(item.kind);

              return (
                <View
                  key={item.id}
                  style={[styles.activityRow, { borderBottomColor: theme.colors.border }]}
                >
                  <View
                    style={[
                      styles.activityAvatar,
                      { backgroundColor: mode === 'dark' ? theme.colors.primarySoft : '#EAF1FF' },
                    ]}
                  >
                    <Text style={[styles.activityAvatarText, { color: theme.colors.primary }]}>
                      {item.title.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.activityText}>
                    <View style={styles.activityTitleRow}>
                      <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
                        {item.title}
                      </Text>
                      <View
                        style={[
                          styles.activityBadge,
                          { backgroundColor: badge.backgroundColor },
                        ]}
                      >
                        <Text
                          style={[
                            styles.activityBadgeText,
                            { color: badge.color },
                          ]}
                        >
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.activitySubtitle, { color: theme.colors.textMuted }]}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.activityAmount,
                      {
                        color:
                          item.tone === 'income' ? theme.colors.success : theme.colors.danger,
                      },
                    ]}
                  >
                    {formatSignedTRY(item.tone === 'income' ? item.amount : -item.amount)}
                  </Text>
                </View>
              );
            })
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
              {t.dashboard.meta.customerAccounts}
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
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>
              {t.dashboard.meta.stockItems}
            </Text>
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
            <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>
              {t.dashboard.meta.totalSales}
            </Text>
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
    paddingBottom: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroOrbOne: {
    position: 'absolute',
    top: -34,
    right: -26,
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroOrbTwo: {
    position: 'absolute',
    top: 124,
    left: -22,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(25,184,166,0.12)',
  },
  heroOrbThree: {
    position: 'absolute',
    bottom: -54,
    right: '24%',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(12, 23, 60, 0.16)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  brandCard: {
    position: 'relative',
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#100828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
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
    alignItems: 'flex-start',
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
    flexShrink: 0,
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
    justifyContent: 'center',
    flexShrink: 1,
    paddingRight: 2,
  },
  brandKicker: {
    ...typography.label,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
    flexShrink: 1,
  },
  brandTitle: {
    ...typography.hero,
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 21,
    marginBottom: 1,
    flexShrink: 1,
    includeFontPadding: false,
  },
  brandSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    flexShrink: 1,
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
    flexShrink: 0,
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
    fontSize: 28,
    marginTop: 8,
    lineHeight: 33,
    maxWidth: '88%',
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
    maxWidth: '82%',
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
    borderWidth: 1,
  },
  summaryCardWide: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  summaryLabel: {
    ...typography.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    ...typography.hero,
    fontSize: 21,
    marginTop: 6,
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
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
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityAvatarText: {
    ...typography.heading,
    fontSize: 15,
  },
  activityText: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  activityTitle: {
    ...typography.heading,
    fontSize: 15,
  },
  activityBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityBadgeText: {
    ...typography.label,
    fontSize: 10,
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
