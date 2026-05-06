import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Share2, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { DateField } from '@/components/DateField';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { formatAppDate, formatTRY } from '@/lib/format';
import { exportReportPdf, exportReportXlsx } from '@/lib/reportExport';
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

type ReportMovementRow = {
  id: string;
  date: string;
  accountName: string;
  movementLabel: string;
  amount: number;
};

type AccountOption = {
  id: string;
  name: string;
  type: 'customer' | 'supplier';
};

function monthLabel(date: Date) {
  return date.toLocaleDateString('tr-TR', { month: 'short' });
}

function buildMonthWindowFromDates(dates: string[]) {
  const months: { key: string; label: string }[] = [];
  const normalizedDates = dates
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (!normalizedDates.length) {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return [{ key, label: monthLabel(now) }];
  }

  const start = new Date(normalizedDates[0].getFullYear(), normalizedDates[0].getMonth(), 1);
  const end = new Date(
    normalizedDates[normalizedDates.length - 1].getFullYear(),
    normalizedDates[normalizedDates.length - 1].getMonth(),
    1
  );

  for (
    let date = new Date(start);
    date <= end;
    date = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  ) {
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
  const [filterVisible, setFilterVisible] = useState(false);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [movementTypeMenuVisible, setMovementTypeMenuVisible] = useState(false);
  const [accountFieldFocused, setAccountFieldFocused] = useState(false);
  const [accountSearchInput, setAccountSearchInput] = useState('');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportMovementType, setReportMovementType] = useState<'all' | 'sale' | 'payment' | 'collection'>('all');
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [reportMovements, setReportMovements] = useState<ReportMovementRow[]>([]);
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

    const customers = (customersResult.data as CustomerRow[]) ?? [];
    const suppliers = (suppliersResult.data as SupplierRow[]) ?? [];
    const reminders = (remindersResult.data as ReminderRow[]) ?? [];
    setAccountOptions([
      ...customers.map((customer) => ({ id: customer.id, name: customer.name, type: 'customer' as const })),
      ...suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name, type: 'supplier' as const })),
    ]);
    const customerNameById = new Map(customers.map((customer) => [customer.id, customer.name]));
    const supplierNameById = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
    const normalizedSearch = reportSearchQuery.trim().toLocaleLowerCase('tr-TR');
    const saleMatchesType = reportMovementType === 'all' || reportMovementType === 'sale';
    const incomeMatchesType = reportMovementType === 'all' || reportMovementType === 'collection';
    const expenseMatchesType = reportMovementType === 'all' || reportMovementType === 'payment';
    const isWithinRange = (dateValue: string) =>
      (!reportDateFrom || dateValue >= reportDateFrom) && (!reportDateTo || dateValue <= reportDateTo);
    const matchesSearch = (value: string | null | undefined) =>
      !normalizedSearch || String(value || '').toLocaleLowerCase('tr-TR').includes(normalizedSearch);
    const sales = ((salesResult.data as SaleRow[]) ?? []).filter((sale) => {
      const customerName = sale.customer_id ? customerNameById.get(sale.customer_id) : sale.customers?.name;
      return saleMatchesType && isWithinRange(sale.sale_date) && matchesSearch(customerName);
    });
    const payments = ((paymentsResult.data as PaymentRow[]) ?? []).filter((payment) => {
      const accountName =
        payment.payment_type === 'income'
          ? (payment.customer_id ? customerNameById.get(payment.customer_id) : '')
          : (payment.supplier_id ? supplierNameById.get(payment.supplier_id) : '');
      const matchesType =
        (payment.payment_type === 'income' && incomeMatchesType) ||
        (payment.payment_type === 'expense' && expenseMatchesType);
      return matchesType && isWithinRange(payment.payment_date) && matchesSearch(accountName);
    });
    const filteredReminderDates = reminders
      .map((reminder) => reminder.due_date)
      .filter((date) => isWithinRange(date));
    const monthWindow = buildMonthWindowFromDates([
      ...sales.map((sale) => sale.sale_date),
      ...payments.map((payment) => payment.payment_date),
      ...filteredReminderDates,
    ]);
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
        const productName = item.products?.name || (isTr ? 'ÃœrÃ¼n' : 'Product');
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
    const pendingReminders = reminders.filter(
      (reminder) => reminder.status === 'pending' && isWithinRange(reminder.due_date)
    );
    const nextReportMovements: ReportMovementRow[] = [
      ...sales.map((sale) => ({
        id: `sale-${sale.customer_id || sale.sale_date}-${sale.total_amount || 0}`,
        date: sale.sale_date,
        accountName:
          (sale.customer_id ? customerNameById.get(sale.customer_id) : sale.customers?.name) ||
          (isTr ? 'Müþteri' : 'Customer'),
        movementLabel: isTr ? 'Satýþ' : 'Sale',
        amount: Number(sale.total_amount || 0),
      })),
      ...payments.map((payment) => ({
        id: `payment-${payment.customer_id || payment.supplier_id || payment.payment_date}-${payment.amount || 0}-${payment.payment_type}`,
        date: payment.payment_date,
        accountName:
          payment.payment_type === 'income'
            ? ((payment.customer_id ? customerNameById.get(payment.customer_id) : '') || (isTr ? 'Müþteri' : 'Customer'))
            : ((payment.supplier_id ? supplierNameById.get(payment.supplier_id) : '') || (isTr ? 'Tedarikçi' : 'Supplier')),
        movementLabel:
          payment.payment_type === 'income'
            ? (isTr ? 'Tahsilat' : 'Collection')
            : (isTr ? 'Ödeme' : 'Payment'),
        amount: Number(payment.amount || 0) * (payment.payment_type === 'income' ? 1 : -1),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setMonthlyData(Array.from(monthMap.values()));
    setReportMovements(nextReportMovements);
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
  }, [company, isTr, reportDateFrom, reportDateTo, reportMovementType, reportSearchQuery]);

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
      reportSubtitle: isTr
        ? 'Firma performansý, nakit akýþý ve dönemsel analiz özeti'
        : 'Company performance, cash flow, and period analysis summary',
      companyName: company?.name ?? null,
      generatedAt: formatAppDate(new Date()),
      footerNote: isTr
        ? 'Bu rapor CepteCari uygulamasý tarafýndan düzenlenmiþtir.'
        : 'This report was generated by the CepteCari application.',
      title: isTr ? 'CepteCari Finansal Rapor' : 'CepteCari Financial Report',
      periodLabel: [
        reportMovementType === 'all'
          ? (isTr ? 'Hareket: Tümü' : 'Movement: All')
          : reportMovementType === 'sale'
            ? (isTr ? 'Hareket: Satýþlar' : 'Movement: Sales')
            : reportMovementType === 'payment'
              ? (isTr ? 'Hareket: Ödemeler' : 'Movement: Payments')
              : (isTr ? 'Hareket: Tahsilatlar' : 'Movement: Collections'),
        reportDateFrom ? `${isTr ? 'Baþlangýç' : 'From'}: ${formatAppDate(reportDateFrom)}` : null,
        reportDateTo ? `${isTr ? 'Bitiþ' : 'To'}: ${formatAppDate(reportDateTo)}` : null,
        reportSearchQuery.trim() ? `${isTr ? 'Cari' : 'Account'}: ${reportSearchQuery.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' • '),
      monthlyRows: monthlyData.map((item) => ({
        month: item.label,
        sales: item.sales,
        income: item.income,
        expense: item.expense,
      })),
      summaryRows: [
        { label: isTr ? 'Toplam Alacak' : 'Total Receivables', value: receivables },
        { label: isTr ? 'Toplam Borç' : 'Total Payables', value: payables },
        { label: isTr ? 'Net Nakit Akýþý' : 'Net Cash Flow', value: cashFlow },
        { label: isTr ? 'Ortalama Satýþ' : 'Average Sale', value: averageSale },
        { label: isTr ? 'Geciken Tahsilat Tutarý' : 'Overdue Collection Amount', value: overdueAmount },
      ],
    }),
    [
      averageSale,
      cashFlow,
      company?.name,
      isTr,
      monthlyData,
      overdueAmount,
      payables,
      receivables,
      reportDateFrom,
      reportDateTo,
      reportMovementType,
      reportSearchQuery,
    ]
  );


  const handleExportPdf = async () => {
    setExportMenuVisible(false);
    try {
      await exportReportPdf(exportPayload);
    } catch (error: unknown) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        error instanceof Error ? error.message : isTr ? 'PDF dýþa aktarma baþarýsýz.' : 'PDF export failed.'
      );
    }
  };

  const handleExportXlsx = async () => {
    setExportMenuVisible(false);
    try {
      await exportReportXlsx(exportPayload);
    } catch (error: unknown) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        error instanceof Error ? error.message : isTr ? 'XLSX dýþa aktarma baþarýsýz.' : 'XLSX export failed.'
      );
    }
  };

  const kpiCards = [
    { label: isTr ? 'Toplam Alacak' : 'Total Receivables', value: formatTRY(receivables), tone: theme.colors.text },
    { label: isTr ? 'Toplam Borç' : 'Total Payables', value: formatTRY(payables), tone: theme.colors.danger },
    { label: isTr ? 'Net Nakit Akýþý' : 'Net Cash Flow', value: formatTRY(cashFlow), tone: cashFlow >= 0 ? theme.colors.success : theme.colors.danger },
    { label: isTr ? 'Ortalama Satýþ' : 'Average Sale', value: formatTRY(averageSale), tone: theme.colors.primary },
  ];
  const visibleAccountOptions = useMemo(() => {
    const normalized = reportSearchQuery.trim().toLocaleLowerCase('tr-TR');
    return accountOptions
      .filter((item) => !normalized || item.name.toLocaleLowerCase('tr-TR').includes(normalized))
      .slice(0, 8);
  }, [accountOptions, reportSearchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <BrandHeroHeader
          kicker={isTr ? 'ANALÝTÝK ÖZET' : 'ANALYTICS'}
          title={isTr ? 'Geliþmiþ Raporlar' : 'Advanced Reports'}
          subtitle={
            isTr
              ? 'Dönemsel analiz, kritik tahsilatlar ve dýþa aktarma araçlarý tek ekranda.'
              : 'Period analysis, critical collections, and export tools on one screen.'
          }
          rightAccessory={
            <TouchableOpacity style={styles.heroBack} onPress={() => router.back()}>
              <ArrowLeft size={18} color="#fff" />
            </TouchableOpacity>
          }
        />

        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setFilterVisible(true)}
          >
            <SlidersHorizontal size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setExportMenuVisible(true)}
          >
            <Share2 size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.filterSummaryText, { color: theme.colors.textMuted }]}>
          {[
            reportMovementType === 'all'
              ? (isTr ? 'Tüm hareketler' : 'All movements')
              : reportMovementType === 'sale'
                ? (isTr ? 'Satýþlar' : 'Sales')
                : reportMovementType === 'payment'
                  ? (isTr ? 'Ödemeler' : 'Payments')
                  : (isTr ? 'Tahsilatlar' : 'Collections'),
            reportDateFrom ? `${isTr ? 'Baþlangýç' : 'From'} ${formatAppDate(reportDateFrom)}` : null,
            reportDateTo ? `${isTr ? 'Bitiþ' : 'To'} ${formatAppDate(reportDateTo)}` : null,
            reportSearchQuery.trim() ? `${isTr ? 'Cari' : 'Account'}: ${reportSearchQuery.trim()}` : null,
          ].filter(Boolean).join(' • ')}
        </Text>

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
            {isTr ? 'Aylýk dönemsel analiz' : 'Monthly period analysis'}
          </Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#3CB7FF' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>{isTr ? 'Satýþ' : 'Sales'}</Text>
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
              {isTr ? 'En çok borçlu müþteriler' : 'Most indebted customers'}
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
            {isTr ? 'Tahsilat hatýrlatma görünümü' : 'Collection reminder overview'}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryHeading, { color: theme.colors.text }]}>
              {isTr ? 'Bugün veya geçmiþ vade:' : 'Due today or earlier:'}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>{dueReminders}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryHeading, { color: theme.colors.text }]}>
              {isTr ? 'Risk altýndaki tutar:' : 'Amount at risk:'}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatTRY(overdueAmount)}</Text>
          </View>
          <View style={[styles.footerNote, { backgroundColor: theme.colors.surfaceMuted }]}>
            <TrendingUp size={18} color={theme.colors.success} />
            <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
              {isTr
                ? 'Dýþa aktarma ile Excel ve PDF özetlerini paylaþabilir, dönemsel grafikten satýþ ve nakit hareketini takip edebilirsiniz.'
                : 'You can share CSV and PDF summaries and track sales and cash movement from the period chart.'}
            </Text>
          </View>
          <View style={[styles.footerNote, { backgroundColor: theme.colors.surfaceMuted }]}>
            <TrendingDown size={18} color={theme.colors.danger} />
            <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
              {isTr
                ? 'Geciken tahsilat tutarý ve müþteri daðýlýmý, hangi hesaplara daha hýzlý aksiyon almanýz gerektiðini gösterir.'
                : 'Overdue collection totals and customer distribution show which accounts need faster action.'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            {isTr ? 'Tedarikçi ödeme daðýlýmý' : 'Supplier payment distribution'}
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

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            {isTr ? 'Cari Hareketleri' : 'Account Movements'}
          </Text>
          {reportMovements.length === 0 ? (
            <Text style={[styles.emptyMovementText, { color: theme.colors.textMuted }]}>
              {isTr ? 'Bu filtre için hareket bulunamadý.' : 'No movements found for this filter.'}
            </Text>
          ) : reportMovements.map((movement) => (
            <View key={movement.id} style={[styles.reportMovementItem, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.reportMovementText}>
                <Text style={[styles.reportMovementTitle, { color: theme.colors.text }]}>{movement.accountName}</Text>
                <Text style={[styles.reportMovementMeta, { color: theme.colors.textMuted }]}>
                  {movement.movementLabel} • {formatAppDate(movement.date)}
                </Text>
              </View>
              <Text style={[styles.reportMovementAmount, { color: movement.amount >= 0 ? theme.colors.success : theme.colors.danger }]}>
                {formatTRY(Math.abs(movement.amount))}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterVisible(false)}>
          <Pressable
            style={[styles.filterModalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.filterModalTitle, { color: theme.colors.text }]}>
              {isTr ? 'Rapor Filtresi' : 'Report Filter'}
            </Text>
            <TouchableOpacity
              style={[styles.selectTrigger, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
              onPress={() => setMovementTypeMenuVisible((current) => !current)}
            >
              <Text style={[styles.selectTriggerText, { color: theme.colors.text }]}>
                {reportMovementType === 'all'
                  ? (isTr ? 'TÃ¼mÃ¼' : 'All')
                  : reportMovementType === 'sale'
                    ? (isTr ? 'Satýþ' : 'Sale')
                    : reportMovementType === 'payment'
                      ? (isTr ? 'Ödemeler' : 'Payments')
                      : (isTr ? 'Tahsilat' : 'Collections')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectTrigger, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
              onPress={() => {
                setAccountSearchInput('');
                setAccountFieldFocused((current) => !current);
              }}
            >
              <Text style={[styles.selectTriggerText, { color: reportSearchQuery ? theme.colors.text : theme.colors.textMuted }]}>
                {reportSearchQuery || (isTr ? 'Cari seÃ§iniz' : 'Select account')}
              </Text>
            </TouchableOpacity>
            {accountFieldFocused ? (
              <View style={[styles.selectMenu, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
                <TextInput
                  style={[styles.filterInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, marginHorizontal: 8, marginBottom: 8 }]}
                  placeholder={isTr ? 'Cari arayÄ±nÄ±z' : 'Search account'}
                  placeholderTextColor={theme.colors.textMuted}
                  value={accountSearchInput}
                  onChangeText={setAccountSearchInput}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.selectOption}
                  onPress={() => {
                    setReportSearchQuery('');
                    setAccountSearchInput('');
                    setAccountFieldFocused(false);
                  }}
                >
                  <Text style={[styles.selectOptionText, { color: theme.colors.text }]}>
                    {isTr ? 'TÃ¼m cariler' : 'All accounts'}
                  </Text>
                </TouchableOpacity>
                {visibleAccountOptions.length ? visibleAccountOptions.map((item) => (
                  <TouchableOpacity
                    key={`${item.type}-${item.id}`}
                    style={styles.selectOption}
                    onPress={() => {
                      setReportSearchQuery(item.name);
                      setAccountSearchInput('');
                      setAccountFieldFocused(false);
                    }}
                  >
                    <Text style={[styles.selectOptionText, { color: theme.colors.text }]}>{item.name}</Text>
                  </TouchableOpacity>
                )) : (
                  <Text style={[styles.emptyOptionText, { color: theme.colors.textMuted }]}>
                    {isTr ? 'Liste yok.' : 'No accounts found.'}
                  </Text>
                )}
              </View>
            ) : null}
            <View style={styles.dateFieldColumn}>
              <DateField
                label={isTr ? 'Baþlangýç Tarihi' : 'Start Date'}
                placeholder={isTr ? 'Baþlangýç tarihi seÃ§' : 'Select start date'}
                value={reportDateFrom}
                onChange={setReportDateFrom}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textMuted}
                backgroundColor={theme.colors.surfaceMuted}
                borderColor={theme.colors.border}
                accentColor={theme.colors.primary}
              />
              <DateField
                label={isTr ? 'Bitiþ Tarihi' : 'End Date'}
                placeholder={isTr ? 'Bitiþ tarihi seÃ§' : 'Select end date'}
                value={reportDateTo}
                onChange={setReportDateTo}
                textColor={theme.colors.text}
                mutedColor={theme.colors.textMuted}
                backgroundColor={theme.colors.surfaceMuted}
                borderColor={theme.colors.border}
                accentColor={theme.colors.primary}
              />
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
              onPress={() => {
                setReportDateFrom('');
                setReportDateTo('');
                setReportSearchQuery('');
                setAccountFieldFocused(false);
                setReportMovementType('all');
              }}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                {isTr ? 'Filtreleri Temizle' : 'Clear Filters'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary }]}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>
                {isTr ? 'Uygula' : 'Apply'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={movementTypeMenuVisible} transparent animationType="fade" onRequestClose={() => setMovementTypeMenuVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMovementTypeMenuVisible(false)}>
          <Pressable
            style={[styles.selectionModalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.selectionModalTitle, { color: theme.colors.text }]}>
              {isTr ? 'Cari Hareket TÃ¼rÃ¼' : 'Movement Type'}
            </Text>
            {[
              { key: 'all', label: isTr ? 'TÃ¼mÃ¼' : 'All' },
              { key: 'sale', label: isTr ? 'Satýþ' : 'Sale' },
              { key: 'payment', label: isTr ? 'Ödemeler' : 'Payments' },
              { key: 'collection', label: isTr ? 'Tahsilat' : 'Collections' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.selectionOption, { borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  setReportMovementType(item.key as 'all' | 'sale' | 'payment' | 'collection');
                  setMovementTypeMenuVisible(false);
                }}
              >
                <Text style={[styles.selectionOptionText, { color: theme.colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={exportMenuVisible} transparent animationType="fade" onRequestClose={() => setExportMenuVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setExportMenuVisible(false)}>
          <Pressable
            style={[styles.filterModalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.filterModalTitle, { color: theme.colors.text }]}>
              {isTr ? 'Raporu DÄ±ÅŸa Aktar' : 'Export Report'}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary }]}
              onPress={() => void handleExportPdf()}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>
                {isTr ? 'PDF Al' : 'Export PDF'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
              onPress={() => void handleExportXlsx()}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                {isTr ? 'Excel Al' : 'Export Excel'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  filterSummaryText: {
    ...typography.caption,
    marginHorizontal: 16,
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.36)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  filterModalCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  filterModalTitle: {
    ...typography.title,
    fontSize: 18,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectTrigger: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: 'center',
  },
  selectTriggerText: {
    ...typography.body,
    fontSize: 14,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  selectMenu: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectOptionText: {
    ...typography.body,
    fontSize: 14,
  },
  emptyOptionText: {
    ...typography.caption,
    fontSize: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectionModalCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  selectionModalTitle: {
    ...typography.heading,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  selectionOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectionOptionText: {
    ...typography.body,
    fontSize: 14,
  },
  dateFieldColumn: {
    gap: 2,
  },
  modalButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    ...typography.heading,
    fontSize: 14,
  },
  accountSuggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountSuggestionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accountSuggestionText: {
    ...typography.label,
    fontSize: 12,
  },
  emptyMovementText: {
    ...typography.body,
    fontSize: 14,
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
  reportMovementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  reportMovementText: {
    flex: 1,
  },
  reportMovementTitle: {
    ...typography.heading,
    fontSize: 14,
    marginBottom: 4,
  },
  reportMovementMeta: {
    ...typography.caption,
    fontSize: 12,
  },
  reportMovementAmount: {
    ...typography.heading,
    fontSize: 14,
  },
});



