import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/contexts/ThemeContext';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { formatTRY } from '@/lib/format';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

type MonthlyChartDatum = {
  label: string;
  income: number;
  expense: number;
  sales: number;
};

type DistributionDatum = {
  label: string;
  value: number;
  color: string;
};

function monthLabel(date: Date) {
  return date.toLocaleDateString('tr-TR', { month: 'short' });
}

function buildMonthWindow() {
  const months: { key: string; label: string }[] = [];
  const now = new Date();

  for (let offset = 3; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: monthLabel(date) });
  }

  return months;
}

function buildDonutSlices(data: DistributionDatum[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    return [];
  }

  const circumference = 2 * Math.PI * 44;
  let offset = 0;

  return data.map((item) => {
    const slice = {
      ...item,
      circumference,
      strokeDasharray: `${(item.value / total) * circumference} ${circumference}`,
      strokeDashoffset: -offset,
      percentage: Math.round((item.value / total) * 100),
    };

    offset += (item.value / total) * circumference;
    return slice;
  });
}

export default function ReportsScreen() {
  const { company } = useAuth();
  const { theme } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyChartDatum[]>([]);
  const [receivables, setReceivables] = useState(0);
  const [payables, setPayables] = useState(0);
  const [customerDistribution, setCustomerDistribution] = useState<DistributionDatum[]>([]);
  const [supplierDistribution, setSupplierDistribution] = useState<DistributionDatum[]>([]);

  const fetchReportData = useCallback(async () => {
    if (!company) {
      setMonthlyData([]);
      setReceivables(0);
      setPayables(0);
      setCustomerDistribution([]);
      setSupplierDistribution([]);
      return;
    }

    const [salesResult, paymentsResult, customersResult, suppliersResult] =
      await Promise.all([
        supabase
          .from('sales')
          .select('customer_id, total_amount, sale_date, customers(name)')
          .eq('company_id', company.id),
        supabase
          .from('payments')
          .select(
            'amount, payment_date, payment_type, customer_id, supplier_id, customers(name), suppliers(name)'
          )
          .eq('company_id', company.id),
        supabase.from('customers').select('id, name').eq('company_id', company.id),
        supabase.from('suppliers').select('id, name').eq('company_id', company.id),
      ]);

    if (salesResult.error || paymentsResult.error || customersResult.error || suppliersResult.error) {
      return;
    }

    const sales = salesResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const monthWindow = buildMonthWindow();
    const monthMap = new Map(
      monthWindow.map((month) => [
        month.key,
        { label: month.label, income: 0, expense: 0, sales: 0 },
      ])
    );

    sales.forEach((sale) => {
      const date = new Date(sale.sale_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const target = monthMap.get(key);
      if (target) {
        target.sales += Number(sale.total_amount || 0);
      }
    });

    payments.forEach((payment) => {
      const date = new Date(payment.payment_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const target = monthMap.get(key);
      if (!target) {
        return;
      }

      if (payment.payment_type === 'income') {
        target.income += Number(payment.amount || 0);
      } else {
        target.expense += Number(payment.amount || 0);
      }
    });

    const salesByCustomer = new Map<string, number>();
    const incomeByCustomer = new Map<string, number>();
    const expenseBySupplier = new Map<string, number>();

    sales.forEach((sale) => {
      if (!sale.customer_id) {
        return;
      }
      salesByCustomer.set(
        sale.customer_id,
        (salesByCustomer.get(sale.customer_id) || 0) + Number(sale.total_amount || 0)
      );
    });

    payments.forEach((payment) => {
      if (payment.payment_type === 'income' && payment.customer_id) {
        incomeByCustomer.set(
          payment.customer_id,
          (incomeByCustomer.get(payment.customer_id) || 0) + Number(payment.amount || 0)
        );
      }

      if (payment.payment_type === 'expense' && payment.supplier_id) {
        expenseBySupplier.set(
          payment.supplier_id,
          (expenseBySupplier.get(payment.supplier_id) || 0) + Number(payment.amount || 0)
        );
      }
    });

    const customerBalances = (customersResult.data ?? [])
      .map((customer) => ({
        label: customer.name,
        value:
          (salesByCustomer.get(customer.id) || 0) - (incomeByCustomer.get(customer.id) || 0),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const supplierBalances = (suppliersResult.data ?? [])
      .map((supplier) => ({
        label: supplier.name,
        value: expenseBySupplier.get(supplier.id) || 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const receivableTotal = customerBalances.reduce((sum, item) => sum + item.value, 0);
    const payableTotal = supplierBalances.reduce((sum, item) => sum + item.value, 0);

    const makeDistribution = (
      items: { label: string; value: number }[],
      palette: string[]
    ) => {
      const topItems = items.slice(0, 3);
      const otherTotal = items.slice(3).reduce((sum, item) => sum + item.value, 0);
      const merged = otherTotal ? [...topItems, { label: t.reports.other, value: otherTotal }] : topItems;
      return merged.map((item, index) => ({
        ...item,
        color: palette[index % palette.length],
      }));
    };

    setMonthlyData(Array.from(monthMap.values()));
    setReceivables(receivableTotal);
    setPayables(payableTotal);
    setCustomerDistribution(
      makeDistribution(customerBalances, ['#53C95A', '#258DE9', '#18B8D8', '#8A4DFF'])
    );
    setSupplierDistribution(
      makeDistribution(supplierBalances, ['#FF6B63', '#F0494E', '#2460D4', '#8A4DFF'])
    );
  }, [company]);

  useEffect(() => {
    void fetchReportData();
  }, [fetchReportData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
  };

  const chartMax = useMemo(() => {
    const values = monthlyData.flatMap((item) => [item.sales, item.income, item.expense]);
    return Math.max(...values, 100);
  }, [monthlyData]);

  const receivableSlices = useMemo(
    () => buildDonutSlices(customerDistribution),
    [customerDistribution]
  );
  const payableSlices = useMemo(
    () => buildDonutSlices(supplierDistribution),
    [supplierDistribution]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <BrandHeroHeader
          kicker={t.reports.kicker}
          title={t.reports.title}
          subtitle={t.reports.subtitle}
          rightAccessory={
            <TouchableOpacity style={styles.heroBack} onPress={() => router.back()}>
              <ArrowLeft size={18} color="#fff" />
            </TouchableOpacity>
          }
        />

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryHeading, { color: theme.colors.text }]}>{t.reports.totalReceivables}:</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatTRY(receivables)}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryHeading, { color: theme.colors.text }]}>{t.reports.totalPayables}:</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>{formatTRY(payables)}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t.reports.monthlyIncomeExpense}</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#3CB7FF' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>{t.reports.sales}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#59C356' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>{t.reports.collections}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#FF6468' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>{t.reports.payments}</Text>
            </View>
          </View>

          <View style={styles.chartArea}>
            {[0.25, 0.5, 0.75, 1].map((marker) => (
              <View
                key={marker}
                style={[
                  styles.chartGuide,
                  {
                    borderColor: theme.colors.border,
                    bottom: `${marker * 100 - 5}%`,
                  },
                ]}
              />
            ))}

            <View style={styles.chartColumns}>
              {monthlyData.map((item) => (
                <View key={item.label} style={styles.monthColumn}>
                  <View style={styles.barGroup}>
                    <View
                      style={[
                        styles.bar,
                        styles.salesBar,
                        { height: `${(item.sales / chartMax) * 100}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        styles.incomeBar,
                        { height: `${(item.income / chartMax) * 100}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        styles.expenseBar,
                        { height: `${(item.expense / chartMax) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={[styles.monthLabel, { color: theme.colors.textMuted }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.distributionRow}>
          <View style={[styles.distributionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t.reports.receivableDistribution}</Text>
            <View style={styles.donutWrap}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                <Circle cx="60" cy="60" r="44" stroke={theme.colors.border} strokeWidth="22" fill="none" />
                {receivableSlices.map((slice) => (
                  <Circle
                    key={slice.label}
                    cx="60"
                    cy="60"
                    r="44"
                    stroke={slice.color}
                    strokeWidth="22"
                    fill="none"
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    rotation="-90"
                    origin="60, 60"
                    strokeLinecap="butt"
                  />
                ))}
              </Svg>
              <View style={styles.legendStack}>
                {customerDistribution.map((item) => (
                  <View key={item.label} style={styles.stackItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                    <Text style={[styles.stackLabel, { color: theme.colors.textMuted }]}>
                      {item.label} %{receivableSlices.find((slice) => slice.label === item.label)?.percentage || 0}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.distributionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t.reports.payableDistribution}</Text>
            <View style={styles.donutWrap}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                <Circle cx="60" cy="60" r="44" stroke={theme.colors.border} strokeWidth="22" fill="none" />
                {payableSlices.map((slice) => (
                  <Circle
                    key={slice.label}
                    cx="60"
                    cy="60"
                    r="44"
                    stroke={slice.color}
                    strokeWidth="22"
                    fill="none"
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    rotation="-90"
                    origin="60, 60"
                    strokeLinecap="butt"
                  />
                ))}
              </Svg>
              <View style={styles.legendStack}>
                {supplierDistribution.map((item) => (
                  <View key={item.label} style={styles.stackItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                    <Text style={[styles.stackLabel, { color: theme.colors.textMuted }]}>
                      {item.label} %{payableSlices.find((slice) => slice.label === item.label)?.percentage || 0}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.footerNote, { backgroundColor: theme.colors.surfaceMuted }]}>
          <TrendingUp size={18} color={theme.colors.success} />
          <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
            {t.reports.footerSales}
          </Text>
        </View>
        <View style={[styles.footerNote, { backgroundColor: theme.colors.surfaceMuted }]}>
          <TrendingDown size={18} color={theme.colors.danger} />
          <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
            {t.reports.footerDistribution}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  hero: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  heroTitle: {
    ...typography.hero,
    color: '#fff',
    fontSize: 24,
  },
  heroSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryHeading: {
    ...typography.heading,
    fontSize: 18,
  },
  summaryValue: {
    ...typography.hero,
    fontSize: 24,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 14,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 20,
    marginBottom: 14,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.caption,
    fontSize: 12,
  },
  chartArea: {
    height: 220,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  chartGuide: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  chartColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 10,
  },
  monthColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barGroup: {
    height: 150,
    width: 50,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
  },
  bar: {
    width: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 6,
  },
  salesBar: {
    backgroundColor: '#3CB7FF',
  },
  incomeBar: {
    backgroundColor: '#59C356',
  },
  expenseBar: {
    backgroundColor: '#FF6468',
  },
  monthLabel: {
    ...typography.caption,
    marginTop: 10,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  distributionRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  distributionCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  donutWrap: {
    alignItems: 'center',
  },
  legendStack: {
    marginTop: 10,
    width: '100%',
    gap: 6,
  },
  stackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stackLabel: {
    ...typography.caption,
    fontSize: 12,
  },
  footerNote: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerText: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
