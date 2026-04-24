import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
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
  generatedAt: string;
  companyName?: string | null;
  reportSubtitle?: string;
  footerNote?: string;
  monthlyRows: MonthlyRow[];
  summaryRows: SummaryRow[];
};

const REPORT_BRAND = 'CepteCari';
const REPORT_PRIMARY = '#2563EB';
const REPORT_PRIMARY_DARK = '#0F172A';
const REPORT_MUTED = '#64748B';
const REPORT_BORDER = '#CBD5E1';
const REPORT_SURFACE = '#F8FAFC';
const REPORT_SUCCESS = '#16A34A';
const REPORT_DANGER = '#DC2626';
const REPORT_LOGO_MODULE = require('../assets/cepte-cari-logo-tight.png');
const REPORT_LOGO_FALLBACK = Asset.fromModule(REPORT_LOGO_MODULE).uri ?? '';

const tr = {
  company: 'Firma',
  reportDate: 'Rapor Tarihi',
  period: 'Donem',
  monthlyAnalysis: 'Donemsel Finansal Analiz',
  summary: 'Rapor Ozeti',
  month: 'Ay',
  sales: 'Satis',
  income: 'Tahsilat',
  expense: 'Odeme',
  title: 'Baslik',
  value: 'Deger',
  reportNote: 'Bu rapor CepteCari uygulamasi tarafindan duzenlenmistir.',
};

const sanitizeExportText = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/İ/g, 'I')
    .replace(/I/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c');

const formatExportCurrency = (value: number | string) => {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  return `${sign}${absolute} TL`;
};

const formatSummaryValue = (value: number | string) =>
  typeof value === 'number' ? formatExportCurrency(value) : String(value);

const escapeHtml = (value: string) =>
  sanitizeExportText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

const loadImageAsDataUrl = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Logo verisi okunamadi.'));
    reader.readAsDataURL(blob);
  });
};

const loadReportLogoDataUrl = async () => {
  try {
    const asset = Asset.fromModule(REPORT_LOGO_MODULE);
    if (!asset.localUri && !asset.uri) {
      await asset.downloadAsync();
    }
    const resolvedUri = asset.localUri ?? asset.uri ?? REPORT_LOGO_FALLBACK;
    if (!resolvedUri) {
      throw new Error('Logo kaynagi bulunamadi.');
    }
    return await loadImageAsDataUrl(resolvedUri);
  } catch {
    if (!REPORT_LOGO_FALLBACK) {
      throw new Error('Logo kaynagi bulunamadi.');
    }
    return await loadImageAsDataUrl(REPORT_LOGO_FALLBACK);
  }
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

const buildSummaryCardsHtml = (rows: SummaryRow[]) =>
  rows
    .map((row) => {
      const normalized = String(row.label).toLowerCase();
      const tone = normalized.includes('borc') || normalized.includes('risk')
        ? REPORT_DANGER
        : normalized.includes('nakit')
          ? REPORT_PRIMARY
          : REPORT_SUCCESS;

      return `
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(row.label)}</div>
          <div class="summary-value" style="color:${tone}">${escapeHtml(formatSummaryValue(row.value))}</div>
        </div>
      `;
    })
    .join('');

const buildMonthlyTableRowsHtml = (rows: MonthlyRow[]) =>
  rows
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.month)}</td>
          <td class="number">${escapeHtml(formatExportCurrency(item.sales))}</td>
          <td class="number">${escapeHtml(formatExportCurrency(item.income))}</td>
          <td class="number">${escapeHtml(formatExportCurrency(item.expense))}</td>
        </tr>
      `
    )
    .join('');

const drawPdfLogo = (doc: {
  setFillColor: (...args: number[]) => void;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => void;
  circle: (x: number, y: number, r: number, style?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  setDrawColor: (...args: number[]) => void;
  setLineWidth: (width: number) => void;
  setTextColor: (...args: number[]) => void;
  setFontSize: (size: number) => void;
  text: (text: string, x: number, y: number) => void;
}) => {
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(48, 38, 54, 54, 16, 16, 'F');
  doc.setFillColor(124, 58, 237);
  doc.circle(70, 60, 16, 'F');
  doc.setFillColor(6, 182, 212);
  doc.circle(82, 72, 12, 'F');
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(62, 51, 24, 28, 8, 8, 'F');
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(2.4);
  doc.line(68, 58, 80, 56);
  doc.line(67, 66, 79, 64);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.8);
  doc.line(71, 54, 75, 76);
};

const buildWorkbook = (payload: StructuredReportPayload) => {
  const workbook = XLSX.utils.book_new();

  const coverSheetRows = [
    [REPORT_BRAND],
    [sanitizeExportText(payload.title)],
    [sanitizeExportText(payload.reportSubtitle ?? 'Profesyonel finansal rapor')],
    [],
    [tr.company, sanitizeExportText(payload.companyName ?? '-')],
    [tr.reportDate, sanitizeExportText(payload.generatedAt)],
    [tr.period, sanitizeExportText(payload.periodLabel)],
    [],
    [tr.summary],
    [tr.title, tr.value],
    ...payload.summaryRows.map((row) => [sanitizeExportText(row.label), formatSummaryValue(row.value)]),
    [],
    ['Not', sanitizeExportText(payload.footerNote ?? tr.reportNote)],
  ];

  const analysisSheetRows = [
    [REPORT_BRAND],
    [tr.monthlyAnalysis],
    [tr.company, sanitizeExportText(payload.companyName ?? '-')],
    [tr.reportDate, sanitizeExportText(payload.generatedAt)],
    [tr.period, sanitizeExportText(payload.periodLabel)],
    [],
    [tr.month, tr.sales, tr.income, tr.expense],
    ...payload.monthlyRows.map((row) => [
      sanitizeExportText(row.month),
      formatExportCurrency(row.sales),
      formatExportCurrency(row.income),
      formatExportCurrency(row.expense),
    ]),
  ];

  const coverSheet = XLSX.utils.aoa_to_sheet(coverSheetRows);
  const analysisSheet = XLSX.utils.aoa_to_sheet(analysisSheetRows);

  coverSheet['!cols'] = [{ wch: 28 }, { wch: 34 }];
  analysisSheet['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  coverSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
  ];
  analysisSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
  ];

  XLSX.utils.book_append_sheet(workbook, coverSheet, 'Rapor');
  XLSX.utils.book_append_sheet(workbook, analysisSheet, 'Analiz');
  return workbook;
};

export const exportReportXlsx = async (payload: StructuredReportPayload) => {
  const workbook = buildWorkbook(payload);
  const fileName = `${payload.baseFileName}.xlsx`;

  if (Platform.OS === 'web') {
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx', compression: true });
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
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 24px;
          color: ${REPORT_PRIMARY_DARK};
        }
        .report-shell {
          border: 1px solid ${REPORT_BORDER};
          border-radius: 24px;
          overflow: hidden;
          background: #ffffff;
        }
        .hero {
          padding: 14px 24px;
          background: linear-gradient(135deg, ${REPORT_PRIMARY} 0%, #0EA5E9 100%);
          color: #ffffff;
        }
        .hero-table {
          width: 100%;
          border-collapse: collapse;
        }
        .logo-box {
          width: 140px;
          height: 148px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }
        .body {
          padding: 22px 24px;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
        }
        .meta-label {
          color: ${REPORT_MUTED};
          font-size: 12px;
          padding-bottom: 8px;
        }
        .meta-value {
          font-size: 15px;
          font-weight: 700;
        }
        .summary-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }
        .summary-card {
          min-width: 180px;
          flex: 1 1 180px;
          border: 1px solid ${REPORT_BORDER};
          background: ${REPORT_SURFACE};
          border-radius: 16px;
          padding: 12px 14px;
        }
        .summary-label {
          color: ${REPORT_MUTED};
          font-size: 11px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .summary-value {
          font-size: 20px;
          font-weight: 700;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid ${REPORT_BORDER};
          overflow: hidden;
          border-radius: 14px;
        }
        .data-table th {
          background: ${REPORT_SURFACE};
          text-align: left;
          border-bottom: 1px solid ${REPORT_BORDER};
          padding: 10px 12px;
        }
        .data-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #E2E8F0;
        }
        .number {
          text-align: right;
        }
        .footer {
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid ${REPORT_BORDER};
          color: ${REPORT_MUTED};
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="report-shell">
        <div class="hero">
          <table class="hero-table">
            <tr>
              <td style="width: 154px; vertical-align: top;">
                <div class="logo-box">
                  <img src="${REPORT_LOGO_FALLBACK}" alt="CepteCari logo" style="width:auto;height:146px;object-fit:contain;display:block;" />
                </div>
              </td>
              <td style="vertical-align: top;">
                <div style="font-size: 14px; letter-spacing: 2px; opacity: 0.85;">${REPORT_BRAND}</div>
                <div style="font-size: 28px; font-weight: 700; margin-top: 6px;">${escapeHtml(payload.title)}</div>
                <div style="font-size: 14px; opacity: 0.9; margin-top: 6px;">${escapeHtml(payload.reportSubtitle ?? 'Profesyonel finansal rapor ozeti')}</div>
              </td>
            </tr>
          </table>
        </div>
        <div class="body">
          <table class="meta-table">
            <tr>
              <td class="meta-label">${tr.company}</td>
              <td class="meta-label">${tr.reportDate}</td>
              <td class="meta-label">${tr.period}</td>
            </tr>
            <tr>
              <td class="meta-value">${escapeHtml(payload.companyName ?? '-')}</td>
              <td class="meta-value">${escapeHtml(payload.generatedAt)}</td>
              <td class="meta-value">${escapeHtml(payload.periodLabel)}</td>
            </tr>
          </table>

          <div class="summary-grid">
            ${buildSummaryCardsHtml(payload.summaryRows)}
          </div>

          <h2 style="font-size: 18px; margin: 8px 0 12px; color: ${REPORT_PRIMARY_DARK};">${tr.monthlyAnalysis}</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>${tr.month}</th>
                <th class="number">${tr.sales}</th>
                <th class="number">${tr.income}</th>
                <th class="number">${tr.expense}</th>
              </tr>
            </thead>
            <tbody>
              ${buildMonthlyTableRowsHtml(payload.monthlyRows)}
            </tbody>
          </table>

          <div class="footer">
            ${escapeHtml(payload.footerNote ?? tr.reportNote)}
          </div>
        </div>
      </div>
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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(32, 28, pageWidth - 64, 150, 18, 18, 'F');
    try {
      const logoDataUrl = await loadReportLogoDataUrl();
      doc.addImage(logoDataUrl, 'PNG', 30, 12, 132, 150);
    } catch {
      drawPdfLogo(doc);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(REPORT_BRAND.toUpperCase(), 162, 58);
    doc.setFontSize(22);
    doc.text(sanitizeExportText(payload.title), 162, 88, { maxWidth: pageWidth - 210 });
    doc.setFontSize(10);
    doc.text(sanitizeExportText(payload.reportSubtitle ?? 'Professional financial report summary'), 162, 110, {
      maxWidth: pageWidth - 210,
    });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`${tr.company}: ${sanitizeExportText(payload.companyName ?? '-')}`, 40, 198);
    doc.text(`${tr.reportDate}: ${sanitizeExportText(payload.generatedAt)}`, 40, 214);
    doc.text(`${tr.period}: ${sanitizeExportText(payload.periodLabel)}`, 40, 230, { maxWidth: pageWidth - 80 });

    let summaryX = 40;
    let summaryY = 248;
    payload.summaryRows.forEach((row) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(summaryX, summaryY, 118, 56, 12, 12, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(sanitizeExportText(row.label), summaryX + 10, summaryY + 16, { maxWidth: 98 });
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(formatSummaryValue(row.value), summaryX + 10, summaryY + 38, { maxWidth: 98 });
      summaryX += 128;
      if (summaryX + 118 > pageWidth - 30) {
        summaryX = 40;
        summaryY += 68;
      }
    });

    autoTable(doc, {
      startY: summaryY + 82,
      head: [[tr.month, tr.sales, tr.income, tr.expense]],
      body: payload.monthlyRows.map((row) => [
        sanitizeExportText(row.month),
        formatExportCurrency(row.sales),
        formatExportCurrency(row.income),
        formatExportCurrency(row.expense),
      ]),
      headStyles: {
        fillColor: [37, 99, 235],
      },
      styles: {
        fontSize: 10,
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });

    const lastAutoTable = doc as typeof doc & { lastAutoTable?: { finalY?: number } };

    autoTable(doc, {
      startY: (lastAutoTable.lastAutoTable?.finalY ?? 320) + 24,
      head: [[tr.title, tr.value]],
      body: payload.summaryRows.map((row) => [sanitizeExportText(row.label), formatSummaryValue(row.value)]),
      headStyles: {
        fillColor: [15, 23, 42],
      },
      styles: {
        fontSize: 10,
      },
      columnStyles: {
        1: { halign: 'right' },
      },
    });

    const finalTable = doc as typeof doc & { lastAutoTable?: { finalY?: number } };
    const footerY = Math.min((finalTable.lastAutoTable?.finalY ?? 720) + 28, pageHeight - 26);
    doc.setDrawColor(203, 213, 225);
    doc.line(40, footerY - 12, pageWidth - 40, footerY - 12);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(sanitizeExportText(payload.footerNote ?? tr.reportNote), 40, footerY, { maxWidth: pageWidth - 80 });

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
