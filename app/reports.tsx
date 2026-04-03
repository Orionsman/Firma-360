import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Download, FileSpreadsheet, TrendingDown, TrendingUp } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { formatTRY } from '@/lib/format';
import { exportReportCsv, exportReportPdf, exportReportXlsx } from '@/lib/reportExport';
import { supabase } from '@/lib/supabase';
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

type SaleRow = {
  customer_id?: string | null;
  total_amount?: number | null;
  sale_date: string;
  customers?: { name?: string } | null;
  sale_items?: {
    product_id?: string | null;
    quantity?: number | null;
    total_price?: number | null;
    products?: { name?: string } | null;
  }[];
};

type PaymentRow = {
  amount?: number | null;
  payment_date: string;
  payment_type: 'income' | 'expense';
  customer_id?: string | null;
  supplier_id?: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
};

type SupplierRow = {
  id: string;
  name: string;
};

type ReminderRow = {
  id: string;
  due_date: string;
  status: 'pending' | 'completed' | 'dismissed';
  amount?: number | null;
};

function monthLabel(date: Date) {
  return date.toLocaleDateString('tr-TR', { month: 'short' });
}

function buildMonthWindow(monthCount: number) {
  const months: { key: string; label: string }[] = [];
  const now = new Date();

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
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
  const isTr = t.locale() === 'tr';
  const [refreshing, setRefreshing] = useState(false);
  const [monthCount, setMonthCount] = useState<3 | 6 | 12>(6);
  const [monthlyData, setMonthlyData] = useState<MonthlyChartDatum[]>([]);
  const [receivables, setReceivables] = useState(0);
  const [payables, setPayables] = useState(0);
  const [cashFlow, setCashFlow] = useState(0);
  const [averageSale, setAverageSale] = useState(0);
  const [topCustomers, setTopCustomers] = useState<DistributionDatum[]>([]);
  const [topProducts, setTopProducts] = useState<DistributionDatum[]>([]);
  const [supplierDistribution, setSupplierDistribution] = useState<DistributionDatum[]>([]);
  const [dueReminders, setDueReminders] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);

  const fetchReportData = useCallback(async () => {
    if (!company) {
      setMonthlyData([]);
      setReceivables(0);
      setPayables(0);
      setCashFlow(0);
      setAverageSale(0);
      setTopCustomers([]);
      setTopProducts([]);
      setSupplierDistribution([]);
      setDueReminders(0);
      setOverdueAmount(0);
      return;
    }

    const [salesResult, paymentsResult, customersResult, suppliersResult, remindersResult] =
      await Promise.all([
        supabase
          .from('sales')
          .select('customer_id, total_amount, sale_date, customers(name), sale_items(product_id, quantity, total_price, products(name))')
          .eq('company_id', company.id),
        supabase
          .from('payments')
          .select('amount, payment_date, payment_type, customer_id, supplier_id')
          .eq('company_id', company.id),
        supabase.from('customers').select('id, name').eq('company_id', company.id),
        supabase.from('suppliers').select('id, name').eq('company_id', company.id),
        supabase
          .from('collection_reminders')
          .select('id, due_date, status, amount')
          .eq('company_id', company.id),
      ]);

    if (
      salesResult.error ||
      paymentsResult.error ||
      customersResult.error ||
      suppliersResult.error ||
      remindersResult.error
    ) {
      throw new Error(
        salesResult.error?.message ||
          paymentsResult.error?.message ||
          customersResult.error?.message ||
          suppliersResult.error?.message ||
          remindersResult.error?.message ||
          isTr ? 'Rapor verileri yüklenemedi.' : 'Report data could not be loaded.'
      );
    }

    const sales = (salesResult.data as SaleRow[]) ?? [];
    const payments = (paymentsResult.data as PaymentRow[]) ?? [];
    const customers = (customersResult.data as CustomerRow[]) ?? [];
    const suppliers = (suppliersResult.data as SupplierRow[]) ?? [];
    const reminders = (remindersResult.data as ReminderRow[]) ?? [];
    const monthWindow = buildMonthWindow(monthCount);
    const monthMap = new Map(
      monthWindow.map((month) => [
        month.key,
        { label: month.label, income: 0, expense: 0, sales: 0 },
      ])
    );

    const salesByCustomer = new Map<string, number>();
    const incomeByCustomer = new Map<string, number>();
    const expenseBySupplier = new Map<string, number>();
    const productTotals = new Map<string, number>();

    sales.forEach((sale) => {
      const date = new Date(sale.sale_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const target = monthMap.get(key);
      const total = Number(sale.total_amount || 0);
      if (target) {
        target.sales += total;
      }
      if (sale.customer_id) {
        salesByCustomer.set(sale.customer_id, (salesByCustomer.get(sale.customer_id) || 0) + total);
      }

      (sale.sale_items ?? []).forEach((item) => {
        const productName = item.products?.name || (isTr ? 'Ürün' : 'Product');
        productTotals.set(productName, (productTotals.get(productName) || 0) + Number(item.total_price || 0));
      });
    });

    payments.forEach((payment) => {
      const date = new Date(payment.payment_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const target = monthMap.get(key);
      const amount = Number(payment.amount || 0);
      if (target) {
        if (payment.payment_type === 'income') {
          target.income += amount;
        } else {
          target.expense += amount;
        }
      }

      if (payment.payment_type === 'income' && payment.customer_id) {
        incomeByCustomer.set(payment.customer_id, (incomeByCustomer.get(payment.customer_id) || 0) + amount);
      }

      if (payment.payment_type === 'expense' && payment.supplier_id) {
        expenseBySupplier.set(payment.supplier_id, (expenseBySupplier.get(payment.supplier_id) || 0) + amount);
      }
    });

    const makeDistribution = (
      items: { label: string; value: number }[],
      palette: string[]
    ) =>
      items
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
        .map((item, index) => ({
          ...item,
          color: palette[index % palette.length],
        }));

    const customerBalances = customers.map((customer) => ({
      label: customer.name,
      value: (salesByCustomer.get(customer.id) || 0) - (incomeByCustomer.get(customer.id) || 0),
    }));

    const supplierBalances = suppliers.map((supplier) => ({
      label: supplier.name,
      value: expenseBySupplier.get(supplier.id) || 0,
    }));

    const today = new Date().toISOString().split('T')[0];
    const pendingReminders = reminders.filter((reminder) => reminder.status === 'pending');

    setMonthlyData(Array.from(monthMap.values()));
    setReceivables(customerBalances.reduce((sum, item) => sum + Math.max(item.value, 0), 0));
    setPayables(supplierBalances.reduce((sum, item) => sum + Math.max(item.value, 0), 0));
    setCashFlow(
      payments
        .reduce(
          (sum, payment) =>
            sum +
            (payment.payment_type === 'income'
              ? Number(payment.amount || 0)
              : -Number(payment.amount || 0)),
          0
        )
    );
    setAverageSale(
      sales.length
        ? sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) / sales.length
        : 0
    );
    setTopCustomers(
      makeDistribution(customerBalances, ['#53C95A', '#258DE9', '#18B8D8', '#8A4DFF'])
    );
    setTopProducts(
      makeDistribution(
        Array.from(productTotals.entries()).map(([label, value]) => ({ label, value })),
        ['#F59E0B', '#F97316', '#2563EB', '#14B8A6']
      )
    );
    setSupplierDistribution(
      makeDistribution(supplierBalances, ['#FF6B63', '#F0494E', '#2460D4', '#8A4DFF'])
    );
    setDueReminders(pendingReminders.filter((reminder) => reminder.due_date <= today).length);
    setOverdueAmount(
      pendingReminders
        .filter((reminder) => reminder.due_date <= today)
        .reduce((sum, reminder) => sum + Number(reminder.amount || 0), 0)
    );
  }, [company, isTr, monthCount]);

  useEffect(() => {
    void fetchReportData().catch((error: unknown) => {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        error instanceof Error
          ? error.message
          : isTr
            ? 'Rapor verileri yüklenemedi.'
            : 'Report data could not be loaded.'
      );
    });
  }, [fetchReportData, isTr]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchReportData();
    } catch (error: unknown) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        error instanceof Error
          ? error.message
          : isTr
            ? 'Rapor verileri yenilenemedi.'
            : 'Report data could not be refreshed.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const chartMax = useMemo(() => {
    const values = monthlyData.flatMap((item) => [item.sales, item.income, item.expense]);
    return Math.max(...values, 100);
  }, [monthlyData]);

  const customerSlices = useMemo(() => buildDonutSlices(topCustomers), [topCustomers]);
  const productSlices = useMemo(() => buildDonutSlices(topProducts), [topProducts]);

  const exportPayload = useMemo(
    () => ({
      baseFileName: `cepte-cari-rapor-${Date.now()}`,
      title: isTr ? 'CepteCari Gelişmiş Rapor' : 'CepteCari Advanced Report',
      periodLabel: isTr ? `Periyot: Son ${monthCount} ay` : `Period: Last ${monthCount} months`,
      monthlyRows: monthlyData.map((item) => ({
        month: item.label,
        sales: item.sales,
        income: item.income,
        expense: item.expense,
      })),
      summaryRows: [
        { label: isTr ? 'Toplam Alacak' : 'Total Receivables', value: formatTRY(receivables) },
        { label: isTr ? 'Toplam Borç' : 'Total Payables', value: formatTRY(payables) },
        { label: isTr ? 'Net Nakit Akışı' : 'Net Cash Flow', value: formatTRY(cashFlow) },
        { label: isTr ? 'Ortalama Satış' : 'Average Sale', value: formatTRY(averageSale) },
        { label: isTr ? 'Geciken Tahsilat Tutarı' : 'Overdue Collection Amount', value: formatTRY(overdueAmount) },
      ],
    }),
    [averageSale, cashFlow, isTr, monthCount, monthlyData, overdueAmount, payables, receivables]
  );

  const handleExportCsv = async () => {
    try {
      await exportReportCsv(exportPayload);
    } catch (error: unknown) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        error instanceof Error ? error.message : isTr ? 'CSV dışa aktarma başarısız.' : 'CSV export failed.'
      );
    }
  };

  const handleExportPdf = async () => {
    try {
      await exportReportPdf(exportPayload);
    } catch (error: unknown) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        error instanceof Error ? error.message : isTr ? 'PDF dışa aktarma başarısız.' : 'PDF export failed.'
      );
    }
  };

  const handleExportXlsx = async () => {
    try {
      await exportReportXlsx(exportPayload);
    } catch (error: unknown) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        error instanceof Error ? error.message : isTr ? 'XLSX dışa aktarma başarısız.' : 'XLSX export failed.'
      );
    }
  };

  const kpiCards = [
    { label: isTr ? 'Toplam Alacak' : 'Total Receivables', value: formatTRY(receivables), tone: theme.colors.text },
    { label: isTr ? 'Toplam Borç' : 'Total Payables', value: formatTRY(payables), tone: theme.colors.danger },
    { label: isTr ? 'Net Nakit Akışı' : 'Net Cash Flow', value: formatTRY(cashFlow), tone: cashFlow >= 0 ? theme.colors.success : theme.colors.danger },
    { label: isTr ? 'Ortalama Satış' : 'Average Sale', value: formatTRY(averageSale), tone: theme.colors.primary },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <BrandHeroHeader
          kicker={isTr ? 'ANALİTİK ÖZET' : 'ANALYTICS'}
          title={isTr ? 'Gelişmiş Raporlar' : 'Advanced Reports'}
          subtitle={
            isTr
              ? 'Dönemsel analiz, kritik tahsilatlar ve dışa aktarma araçları tek ekranda.'
              : 'Period analysis, critical collections, and export tools on one screen.'
          }
          rightAccessory={
            <TouchableOpacity style={styles.heroBack} onPress={() => router.back()}>
              <ArrowLeft size={18} color="#fff" />
            </TouchableOpacity>
          }
        />

        <View style={styles.chipRow}>
          {[3, 6, 12].map((count) => {
            const active = monthCount === count;
            return (
              <TouchableOpacity
                key={count}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setMonthCount(count as 3 | 6 | 12)}
              >
                <Text style={[styles.filterChipText, { color: active ? theme.colors.primary : theme.colors.textMuted }]}>
                  {isTr ? `Son ${count} ay` : `Last ${count} months`}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => void handleExportXlsx()}
          >
            <FileSpreadsheet size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => void handleExportCsv()}
          >
            <Text style={[styles.csvLabel, { color: theme.colors.primary }]}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => void handleExportPdf()}
          >
            <Download size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.kpiGrid}>
          {kpiCards.map((card) => (
            <View
              key={card.label}
              style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>{card.label}</Text>
              <Text style={[styles.kpiValue, { color: card.tone }]}>{card.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            {isTr ? 'Aylık dönemsel analiz' : 'Monthly period analysis'}
          </Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#3CB7FF' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>{isTr ? 'Satış' : 'Sales'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#59C356' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>{isTr ? 'Tahsilat' : 'Collections'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#FF6468' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>{isTr ? 'Ödeme' : 'Payments'}</Text>
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
                    <View style={[styles.bar, styles.salesBar, { height: `${(item.sales / chartMax) * 100}%` }]} />
                    <View style={[styles.bar, styles.incomeBar, { height: `${(item.income / chartMax) * 100}%` }]} />
                    <View style={[styles.bar, styles.expenseBar, { height: `${(item.expense / chartMax) * 100}%` }]} />
                  </View>
                  <Text style={[styles.monthLabel, { color: theme.colors.textMuted }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.distributionRow}>
          <View style={[styles.distributionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {isTr ? 'En çok borçlu müşteriler' : 'Most indebted customers'}
            </Text>
            <View style={styles.donutWrap}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                <Circle cx="60" cy="60" r="44" stroke={theme.colors.border} strokeWidth="22" fill="none" />
                {customerSlices.map((slice) => (
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
                  />
                ))}
              </Svg>
              <View style={styles.legendStack}>
                {topCustomers.map((item) => (
                  <View key={item.label} style={styles.stackItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                    <Text style={[styles.stackLabel, { color: theme.colors.textMuted }]}>
                      {item.label} • {formatTRY(item.value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.distributionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {isTr ? 'En çok gelir üreten ürünler' : 'Top revenue products'}
            </Text>
            <View style={styles.donutWrap}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                <Circle cx="60" cy="60" r="44" stroke={theme.colors.border} strokeWidth="22" fill="none" />
                {productSlices.map((slice) => (
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
                  />
                ))}
              </Svg>
              <View style={styles.legendStack}>
                {topProducts.map((item) => (
                  <View key={item.label} style={styles.stackItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                    <Text style={[styles.stackLabel, { color: theme.colors.textMuted }]}>
                      {item.label} • {formatTRY(item.value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            {isTr ? 'Tahsilat hatırlatma görünümü' : 'Collection reminder overview'}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryHeading, { color: theme.colors.text }]}>
              {isTr ? 'Bugün veya geçmiş vade:' : 'Due today or earlier:'}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>{dueReminders}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryHeading, { color: theme.colors.text }]}>
              {isTr ? 'Risk altındaki tutar:' : 'Amount at risk:'}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatTRY(overdueAmount)}</Text>
          </View>
          <View style={[styles.footerNote, { backgroundColor: theme.colors.surfaceMuted }]}>
            <TrendingUp size={18} color={theme.colors.success} />
            <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
              {isTr
                ? 'Dışa aktarma ile CSV ve PDF özetlerini paylaşabilir, dönemsel grafikten satış ve nakit hareketini takip edebilirsiniz.'
                : 'You can share CSV and PDF summaries and track sales and cash movement from the period chart.'}
            </Text>
          </View>
          <View style={[styles.footerNote, { backgroundColor: theme.colors.surfaceMuted }]}>
            <TrendingDown size={18} color={theme.colors.danger} />
            <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
              {isTr
                ? 'Geciken tahsilat tutarı ve müşteri dağılımı, hangi hesaplara daha hızlı aksiyon almanız gerektiğini gösterir.'
                : 'Overdue collection totals and customer distribution show which accounts need faster action.'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            {isTr ? 'Tedarikçi ödeme dağılımı' : 'Supplier payment distribution'}
          </Text>
          {supplierDistribution.map((item) => (
            <View key={item.label} style={[styles.listRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={[styles.legendText, { color: theme.colors.text }]}>{item.label}</Text>
              </View>
              <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>{formatTRY(item.value)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 28 },
  heroBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  chipRow: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipText: {
    ...typography.label,
    fontSize: 13,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  csvLabel: {
    ...typography.label,
    fontSize: 12,
  },
  kpiGrid: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  kpiLabel: {
    ...typography.label,
    fontSize: 12,
  },
  kpiValue: {
    ...typography.hero,
    fontSize: 22,
    marginTop: 6,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 19,
    marginBottom: 14,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
    flexWrap: 'wrap',
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
  salesBar: { backgroundColor: '#3CB7FF' },
  incomeBar: { backgroundColor: '#59C356' },
  expenseBar: { backgroundColor: '#FF6468' },
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
  donutWrap: { alignItems: 'center' },
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryHeading: {
    ...typography.heading,
    fontSize: 16,
  },
  summaryValue: {
    ...typography.hero,
    fontSize: 22,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 14,
  },
  footerNote: {
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
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});
