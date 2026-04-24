export type SupportedCurrency = 'TRY' | 'USD' | 'EUR' | 'GBP';

let activeLocale = 'tr-TR';
let activeCurrency: SupportedCurrency = 'TRY';

export const CURRENCY_OPTIONS: Array<{
  code: SupportedCurrency;
  label: string;
}> = [
  { code: 'TRY', label: 'Turkish Lira' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
];

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  TRY: '\u20BA',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
};

export function setFormattingLocale(locale: string) {
  activeLocale = locale;
}

export function setFormattingCurrency(currency: SupportedCurrency) {
  activeCurrency = currency;
}

export function getFormattingCurrency() {
  return activeCurrency;
}

export function getFormattingLocale() {
  return activeLocale;
}

export function formatAppDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(activeLocale).format(date);
}

export function formatTRY(amount: number | string) {
  const numericAmount = Number(amount || 0);
  const formattedNumber = new Intl.NumberFormat(activeLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);

  return `${formattedNumber} ${CURRENCY_SYMBOLS[activeCurrency]}`;
}

export function formatSignedTRY(amount: number | string) {
  const numericAmount = Number(amount || 0);
  const sign = numericAmount >= 0 ? '+' : '-';

  return `${sign}${formatTRY(Math.abs(numericAmount))}`;
}
