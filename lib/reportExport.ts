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

export type AccountMovementExportRow = {
  date: string;
  type: string;
  title: string;
  subtitle: string;
  amount: number;
  runningBalance: number;
};

export type AccountMovementReportPayload = {
  baseFileName: string;
  title: string;
  reportSubtitle: string;
  generatedAt: string;
  companyName?: string | null;
  accountName: string;
  accountTypeLabel: string;
  currentBalance: number;
  filterLabel: string;
  footerNote?: string;
  summaryRows: SummaryRow[];
  movementRows: AccountMovementExportRow[];
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
  period: 'Dönem',
  date: 'Tarih',
  monthlyAnalysis: 'Dönemsel Finansal Analiz',
  summary: 'Rapor Özeti',
  month: 'Ay',
  sales: 'Satış',
  income: 'Tahsilat',
  expense: 'Ödeme',
  movementType: 'Hareket Türü',
  movementDetails: 'Detay',
  title: 'Başlık',
  value: 'Değer',
  runningBalance: 'Bakiye',
  reportNote: 'Bu rapor CepteCari uygulaması tarafından düzenlenmiştir.',
};

const sanitizeExportText = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/Ä°/g, 'İ')
    .replace(/Ä±/g, 'ı')
    .replace(/Å/g, 'Ş')
    .replace(/ÅŸ/g, 'ş')
    .replace(/Ä/g, 'Ğ')
    .replace(/ÄŸ/g, 'ğ')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ã§/g, 'ç')
    .replace(/â‚º/g, '₺');

const formatExportCurrency = (value: number | string) => {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  return `${sign}${absolute} ₺`;
};

const formatPdfCurrency = (value: number | string) =>
  formatExportCurrency(value).replace(/₺/g, 'TL');

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

const waitForNextFrame = () =>
  new Promise<void>((resolve) => {
    const requestFrame = (globalThis as { requestAnimationFrame?: (callback: () => void) => number })
      .requestAnimationFrame;

    if (requestFrame) {
      requestFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });

const exportHtmlCanvasPdfOnWeb = async (fileName: string, html: string) => {
  const documentRef = (globalThis as { document?: Document }).document;

  if (!documentRef?.body) {
    throw new Error('Web PDF ortamı bulunamadı.');
  }

  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const html2canvas = html2canvasModule.default;
  const container = documentRef.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.minHeight = '1123px';
  container.style.background = '#ffffff';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-1';
  container.innerHTML = html;
  documentRef.body.appendChild(container);

  try {
    const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.onload = () => resolve();
            image.onerror = () => resolve();
          })
      )
    );
    await waitForNextFrame();

    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      logging: false,
      scale: 2,
      useCORS: true,
      width: container.scrollWidth,
      height: container.scrollHeight,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('PDF görüntüsü oluşturulamadı.');
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imageData = canvas.toDataURL('image/png');
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    let offsetY = 0;
    let remainingHeight = imageHeight;

    doc.addImage(imageData, 'PNG', 0, offsetY, pageWidth, imageHeight);
    remainingHeight -= pageHeight;

    while (remainingHeight > 0) {
      offsetY -= pageHeight;
      doc.addPage();
      doc.addImage(imageData, 'PNG', 0, offsetY, pageWidth, imageHeight);
      remainingHeight -= pageHeight;
    }

    downloadOnWeb(fileName, doc.output('blob'), 'application/pdf');
  } finally {
    container.remove();
  }
};

const loadImageAsDataUrl = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Logo verisi okunamadı.'));
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
      throw new Error('Logo kaynağı bulunamadı.');
    }
    return await loadImageAsDataUrl(resolvedUri);
  } catch {
    if (!REPORT_LOGO_FALLBACK) {
      throw new Error('Logo kaynağı bulunamadı.');
    }
    return await loadImageAsDataUrl(REPORT_LOGO_FALLBACK);
  }
};

const drawPdfLogo = (doc: {
  setFillColor: (...args: number[]) => void;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => void;
  circle: (x: number, y: number, r: number, style?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  setDrawColor: (...args: number[]) => void;
  setLineWidth: (width: number) => void;
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

  coverSheet['!cols'] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 44 },
    { wch: 18 },
    { wch: 18 },
  ];
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

const buildMovementWorkbook = (payload: AccountMovementReportPayload) => {
  const workbook = XLSX.utils.book_new();
  const movementTableRows = [
    [
      tr.date,
      sanitizeExportText(payload.accountTypeLabel),
      tr.movementType,
      tr.movementDetails,
      tr.value,
      tr.runningBalance,
    ],
    ...payload.movementRows.map((row) => [
      sanitizeExportText(row.date),
      sanitizeExportText(payload.accountName),
      sanitizeExportText(row.type),
      sanitizeExportText(`${row.title} - ${row.subtitle}`),
      formatExportCurrency(row.amount),
      formatExportCurrency(row.runningBalance),
    ]),
  ];

  const coverSheetRows = [
    [REPORT_BRAND],
    [sanitizeExportText(payload.title)],
    [sanitizeExportText(payload.reportSubtitle)],
    [],
    [tr.company, sanitizeExportText(payload.companyName ?? '-')],
    [sanitizeExportText(payload.accountTypeLabel), sanitizeExportText(payload.accountName)],
    [tr.reportDate, sanitizeExportText(payload.generatedAt)],
    [tr.period, sanitizeExportText(payload.filterLabel)],
    [],
    [tr.summary],
    [tr.title, tr.value],
    ...payload.summaryRows.map((row) => [sanitizeExportText(row.label), formatSummaryValue(row.value)]),
    [],
    [tr.movementDetails],
    ...movementTableRows,
    [],
    ['Not', sanitizeExportText(payload.footerNote ?? tr.reportNote)],
  ];

  const movementSheetRows = [
    [REPORT_BRAND],
    [sanitizeExportText(payload.title)],
    [sanitizeExportText(payload.accountName)],
    [],
    [
      tr.reportDate,
      sanitizeExportText(payload.generatedAt),
      tr.period,
      sanitizeExportText(payload.filterLabel),
    ],
    [],
    ...movementTableRows,
  ];

  const coverSheet = XLSX.utils.aoa_to_sheet(coverSheetRows);
  const movementSheet = XLSX.utils.aoa_to_sheet(movementSheetRows);

  coverSheet['!cols'] = [{ wch: 28 }, { wch: 34 }];
  movementSheet['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 44 },
    { wch: 18 },
    { wch: 18 },
  ];
  coverSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
  ];
  movementSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(workbook, movementSheet, 'Hareketler');
  XLSX.utils.book_append_sheet(workbook, coverSheet, 'Özet');
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

export const exportAccountMovementsXlsx = async (payload: AccountMovementReportPayload) => {
  const workbook = buildMovementWorkbook(payload);
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
          padding: 22px 24px;
          background: linear-gradient(135deg, ${REPORT_PRIMARY} 0%, #0EA5E9 100%);
          color: #ffffff;
          overflow: hidden;
        }
        .hero-table {
          width: 100%;
          border-collapse: collapse;
        }
        .logo-box {
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
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
              <td style="width: 112px; vertical-align: middle;">
                <div class="logo-box">
                  <img src="${REPORT_LOGO_FALLBACK}" alt="CepteCari logo" style="width:auto;height:84px;object-fit:contain;display:block;" />
                </div>
              </td>
              <td style="vertical-align: middle; padding-left: 10px;">
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

const buildAccountMovementHtml = (payload: AccountMovementReportPayload) => `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: ${REPORT_PRIMARY_DARK}; }
        .report-shell { border: 1px solid ${REPORT_BORDER}; border-radius: 24px; overflow: hidden; background: #ffffff; }
        .hero { padding: 22px 24px; background: linear-gradient(135deg, ${REPORT_PRIMARY} 0%, #0EA5E9 100%); color: #ffffff; overflow: hidden; }
        .hero-table { width: 100%; border-collapse: collapse; }
        .logo-box { width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 24px; background: rgba(255,255,255,0.08); }
        .body { padding: 22px 24px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
        .meta-card { border: 1px solid ${REPORT_BORDER}; border-radius: 16px; padding: 12px 14px; background: ${REPORT_SURFACE}; }
        .meta-label { color: ${REPORT_MUTED}; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.8px; }
        .meta-value { font-size: 16px; font-weight: 700; }
        .summary-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
        .summary-card { min-width: 180px; flex: 1 1 180px; border: 1px solid ${REPORT_BORDER}; background: ${REPORT_SURFACE}; border-radius: 16px; padding: 12px 14px; }
        .summary-label { color: ${REPORT_MUTED}; font-size: 11px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px; }
        .summary-value { font-size: 20px; font-weight: 700; }
        .data-table { width: 100%; border-collapse: collapse; border: 1px solid ${REPORT_BORDER}; overflow: hidden; border-radius: 14px; }
        .data-table th { background: ${REPORT_SURFACE}; text-align: left; border-bottom: 1px solid ${REPORT_BORDER}; padding: 10px 12px; }
        .data-table td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
        .number { text-align: right; }
        .footer { margin-top: 20px; padding-top: 14px; border-top: 1px solid ${REPORT_BORDER}; color: ${REPORT_MUTED}; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="report-shell">
        <div class="hero">
          <table class="hero-table">
            <tr>
              <td style="width: 112px; vertical-align: middle;">
                <div class="logo-box">
                  <img src="${REPORT_LOGO_FALLBACK}" alt="CepteCari logo" style="width:auto;height:84px;object-fit:contain;display:block;" />
                </div>
              </td>
              <td style="vertical-align: middle; padding-left: 10px;">
                <div style="font-size: 14px; letter-spacing: 2px; opacity: 0.85;">${REPORT_BRAND}</div>
                <div style="font-size: 28px; font-weight: 700; margin-top: 6px;">${escapeHtml(payload.title)}</div>
                <div style="font-size: 14px; opacity: 0.9; margin-top: 6px;">${escapeHtml(payload.reportSubtitle)}</div>
              </td>
            </tr>
          </table>
        </div>
        <div class="body">
          <div class="meta-grid">
            <div class="meta-card"><div class="meta-label">${tr.company}</div><div class="meta-value">${escapeHtml(payload.companyName ?? '-')}</div></div>
            <div class="meta-card"><div class="meta-label">${tr.reportDate}</div><div class="meta-value">${escapeHtml(payload.generatedAt)}</div></div>
            <div class="meta-card"><div class="meta-label">${escapeHtml(payload.accountTypeLabel)}</div><div class="meta-value">${escapeHtml(payload.accountName)}</div></div>
            <div class="meta-card"><div class="meta-label">${tr.period}</div><div class="meta-value">${escapeHtml(payload.filterLabel)}</div></div>
          </div>

          <div class="summary-grid">
            ${buildSummaryCardsHtml(payload.summaryRows)}
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>${tr.date}</th>
                <th>${tr.movementType}</th>
                <th>${tr.movementDetails}</th>
                <th class="number">${tr.value}</th>
                <th class="number">${tr.runningBalance}</th>
              </tr>
            </thead>
            <tbody>
              ${payload.movementRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.title)}<br /><span style="color:${REPORT_MUTED};font-size:12px;">${escapeHtml(row.subtitle)}</span></td>
                      <td class="number">${escapeHtml(formatExportCurrency(row.amount))}</td>
                      <td class="number">${escapeHtml(formatExportCurrency(row.runningBalance))}</td>
                    </tr>
                  `
                )
                .join('')}
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
    try {
      await exportHtmlCanvasPdfOnWeb(fileName, buildNativeHtml(payload));
      return;
    } catch {
      // Fall back to direct jsPDF drawing if browser canvas rendering is unavailable.
    }

    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(32, 28, pageWidth - 64, 126, 18, 18, 'F');
    doc.setFillColor(255, 255, 255);
    doc.setGState?.(new (doc as any).GState({ opacity: 0.08 }));
    doc.roundedRect(46, 44, 88, 88, 22, 22, 'F');
    if (doc.setGState) {
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }
    try {
      const logoDataUrl = await loadReportLogoDataUrl();
      doc.addImage(logoDataUrl, 'PNG', 54, 48, 74, 74);
    } catch {
      drawPdfLogo(doc);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(REPORT_BRAND.toUpperCase(), 148, 58);
    doc.setFontSize(22);
    doc.text(sanitizeExportText(payload.title), 148, 84, { maxWidth: pageWidth - 195 });
    doc.setFontSize(10);
    doc.text(sanitizeExportText(payload.reportSubtitle ?? 'Professional financial report summary'), 148, 104, {
      maxWidth: pageWidth - 195,
    });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`${tr.company}: ${sanitizeExportText(payload.companyName ?? '-')}`, 40, 170);
    doc.text(`${tr.reportDate}: ${sanitizeExportText(payload.generatedAt)}`, 40, 186);
    doc.text(`${tr.period}: ${sanitizeExportText(payload.periodLabel)}`, 40, 202, { maxWidth: pageWidth - 80 });

    let summaryX = 40;
    let summaryY = 220;
    payload.summaryRows.forEach((row) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(summaryX, summaryY, 118, 56, 12, 12, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(sanitizeExportText(row.label), summaryX + 10, summaryY + 16, { maxWidth: 98 });
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(formatPdfCurrency(row.value), summaryX + 10, summaryY + 38, { maxWidth: 98 });
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
        formatPdfCurrency(row.sales),
        formatPdfCurrency(row.income),
        formatPdfCurrency(row.expense),
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
      body: payload.summaryRows.map((row) => [sanitizeExportText(row.label), formatPdfCurrency(row.value)]),
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

export const exportAccountMovementsPdf = async (payload: AccountMovementReportPayload) => {
  const fileName = `${payload.baseFileName}.pdf`;

  if (Platform.OS === 'web') {
    try {
      await exportHtmlCanvasPdfOnWeb(fileName, buildAccountMovementHtml(payload));
      return;
    } catch {
      // Fall back to direct jsPDF drawing if browser canvas rendering is unavailable.
    }

    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(32, 28, pageWidth - 64, 126, 18, 18, 'F');
    doc.setFillColor(255, 255, 255);
    doc.setGState?.(new (doc as any).GState({ opacity: 0.08 }));
    doc.roundedRect(46, 44, 88, 88, 22, 22, 'F');
    if (doc.setGState) {
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }
    try {
      const logoDataUrl = await loadReportLogoDataUrl();
      doc.addImage(logoDataUrl, 'PNG', 54, 48, 74, 74);
    } catch {
      drawPdfLogo(doc);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(REPORT_BRAND.toUpperCase(), 148, 58);
    doc.setFontSize(22);
    doc.text(sanitizeExportText(payload.title), 148, 84, { maxWidth: pageWidth - 195 });
    doc.setFontSize(10);
    doc.text(sanitizeExportText(payload.reportSubtitle), 148, 104, { maxWidth: pageWidth - 195 });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`${tr.company}: ${sanitizeExportText(payload.companyName ?? '-')}`, 40, 170);
    doc.text(`${payload.accountTypeLabel}: ${sanitizeExportText(payload.accountName)}`, 40, 186);
    doc.text(`${tr.reportDate}: ${sanitizeExportText(payload.generatedAt)}`, 40, 202);
    doc.text(`${tr.period}: ${sanitizeExportText(payload.filterLabel)}`, 40, 218, {
      maxWidth: pageWidth - 80,
    });

    let summaryX = 40;
    let summaryY = 238;
    payload.summaryRows.forEach((row) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(summaryX, summaryY, 118, 56, 12, 12, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(sanitizeExportText(row.label), summaryX + 10, summaryY + 16, { maxWidth: 98 });
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(formatPdfCurrency(row.value), summaryX + 10, summaryY + 38, { maxWidth: 98 });
      summaryX += 128;
      if (summaryX + 118 > pageWidth - 30) {
        summaryX = 40;
        summaryY += 68;
      }
    });

    autoTable(doc, {
      startY: summaryY + 82,
      head: [[tr.date, tr.movementType, tr.movementDetails, tr.value, tr.runningBalance]],
      body: payload.movementRows.map((row) => [
        sanitizeExportText(row.date),
        sanitizeExportText(row.type),
        `${sanitizeExportText(row.title)}\n${sanitizeExportText(row.subtitle).replace(/₺/g, 'TL')}`,
        formatPdfCurrency(row.amount),
        formatPdfCurrency(row.runningBalance),
      ]),
      headStyles: {
        fillColor: [37, 99, 235],
      },
      styles: {
        fontSize: 9,
        cellPadding: 8,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 64 },
        1: { cellWidth: 76 },
        2: { cellWidth: 180 },
        3: { halign: 'right', cellWidth: 78 },
        4: { halign: 'right', cellWidth: 82 },
      },
    });

    const finalTable = doc as typeof doc & { lastAutoTable?: { finalY?: number } };
    const footerY = Math.min((finalTable.lastAutoTable?.finalY ?? 720) + 28, pageHeight - 26);
    doc.setDrawColor(203, 213, 225);
    doc.line(40, footerY - 12, pageWidth - 40, footerY - 12);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(sanitizeExportText(payload.footerNote ?? tr.reportNote), 40, footerY, {
      maxWidth: pageWidth - 80,
    });

    downloadOnWeb(fileName, doc.output('blob'), 'application/pdf');
    return;
  }

  const { uri } = await Print.printToFileAsync({ html: buildAccountMovementHtml(payload) });
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
