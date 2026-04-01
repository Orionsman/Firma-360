import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

type MonthlyRow = {
  month: string;
  sales: number;
  income: number;
  expense: number;
};

type SummaryRow = {
  label: string;
  value: number | string;
};

export type StructuredReportPayload = {
  baseFileName: string;
  title: string;
  periodLabel: string;
  monthlyRows: MonthlyRow[];
  summaryRows: SummaryRow[];
};

const downloadOnWeb = (fileName: string, content: BlobPart, mimeType: string) => {
  const documentRef = (globalThis as { document?: Document }).document;

  if (!documentRef) {
    throw new Error('Web indirme ortami bulunamadi.');
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const writeAndShareBinary = async (fileName: string, base64Content: string, mimeType: string) => {
  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (!directory) {
    throw new Error('Dosya klasoru bulunamadi.');
  }

  const uri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64Content, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle: fileName,
      UTI: mimeType,
    });
    return;
  }

  throw new Error('Paylasim bu cihazda kullanilamiyor.');
};

const writeAndShareText = async (fileName: string, content: string, mimeType: string) => {
  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (!directory) {
    throw new Error('Dosya klasoru bulunamadi.');
  }

  const uri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle: fileName,
      UTI: mimeType,
    });
    return;
  }

  throw new Error('Paylasim bu cihazda kullanilamiyor.');
};

const buildWorkbook = ({ periodLabel, monthlyRows, summaryRows }: StructuredReportPayload) => {
  const workbook = XLSX.utils.book_new();
  const monthlySheet = XLSX.utils.json_to_sheet(
    monthlyRows.map((row) => ({
      Ay: row.month,
      Satis: row.sales,
      Tahsilat: row.income,
      Odeme: row.expense,
    }))
  );
  const summarySheet = XLSX.utils.json_to_sheet(
    summaryRows.map((row) => ({
      Baslik: row.label,
      Deger: row.value,
      Donem: periodLabel,
    }))
  );

  XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Donemsel Analiz');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ozet');
  return workbook;
};

export const exportReportCsv = async (payload: StructuredReportPayload) => {
  const worksheet = XLSX.utils.json_to_sheet(
    payload.monthlyRows.map((row) => ({
      Ay: row.month,
      Satis: row.sales,
      Tahsilat: row.income,
      Odeme: row.expense,
    }))
  );
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const fileName = `${payload.baseFileName}.csv`;

  if (Platform.OS === 'web') {
    downloadOnWeb(fileName, csv, 'text/csv;charset=utf-8');
    return;
  }

  await writeAndShareText(fileName, csv, 'text/csv');
};

export const exportReportXlsx = async (payload: StructuredReportPayload) => {
  const workbook = buildWorkbook(payload);
  const fileName = `${payload.baseFileName}.xlsx`;

  if (Platform.OS === 'web') {
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
    return;
  }

  const base64 = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'base64',
    compression: true,
  });
  await writeAndShareBinary(
    fileName,
    base64,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
};

const buildNativeHtml = (payload: StructuredReportPayload) => `
  <html>
    <body style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">
      <h1>${payload.title}</h1>
      <p>${payload.periodLabel}</p>
      <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #cbd5e1; padding:8px;">Ay</th>
            <th style="text-align:right; border-bottom:1px solid #cbd5e1; padding:8px;">Satis</th>
            <th style="text-align:right; border-bottom:1px solid #cbd5e1; padding:8px;">Tahsilat</th>
            <th style="text-align:right; border-bottom:1px solid #cbd5e1; padding:8px;">Odeme</th>
          </tr>
        </thead>
        <tbody>
          ${payload.monthlyRows
            .map(
              (item) => `
                <tr>
                  <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${item.month}</td>
                  <td style="padding:8px; text-align:right; border-bottom:1px solid #e2e8f0;">${item.sales}</td>
                  <td style="padding:8px; text-align:right; border-bottom:1px solid #e2e8f0;">${item.income}</td>
                  <td style="padding:8px; text-align:right; border-bottom:1px solid #e2e8f0;">${item.expense}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
      <h2 style="margin-top:24px;">Ozet</h2>
      ${payload.summaryRows.map((row) => `<p>${row.label}: ${row.value}</p>`).join('')}
    </body>
  </html>
`;

export const exportReportPdf = async (payload: StructuredReportPayload) => {
  const fileName = `${payload.baseFileName}.pdf`;

  if (Platform.OS === 'web') {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    doc.setFontSize(18);
    doc.text(payload.title, 40, 42);
    doc.setFontSize(11);
    doc.text(payload.periodLabel, 40, 62);

    autoTable(doc, {
      startY: 82,
      head: [['Ay', 'Satis', 'Tahsilat', 'Odeme']],
      body: payload.monthlyRows.map((row) => [
        row.month,
        String(row.sales),
        String(row.income),
        String(row.expense),
      ]),
      styles: {
        fontSize: 10,
      },
    });

    const lastAutoTable = doc as typeof doc & { lastAutoTable?: { finalY?: number } };

    autoTable(doc, {
      startY: lastAutoTable.lastAutoTable?.finalY
        ? (lastAutoTable.lastAutoTable.finalY ?? 110) + 24
        : 320,
      head: [['Ozet', 'Deger']],
      body: payload.summaryRows.map((row) => [row.label, String(row.value)]),
      styles: {
        fontSize: 10,
      },
    });

    downloadOnWeb(fileName, doc.output('blob'), 'application/pdf');
    return;
  }

  const { uri } = await Print.printToFileAsync({ html: buildNativeHtml(payload) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: fileName,
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  throw new Error('PDF paylasimi bu cihazda kullanilamiyor.');
};
