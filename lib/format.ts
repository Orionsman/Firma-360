export const TL_SYMBOL = '\u20BA';

export function formatTRY(amount: number | string) {
  const numericAmount = Number(amount || 0);
  return `${numericAmount.toLocaleString('tr-TR')} ${TL_SYMBOL}`;
}

export function formatSignedTRY(amount: number | string) {
  const numericAmount = Number(amount || 0);
  const sign = numericAmount >= 0 ? '+' : '-';
  return `${sign}${Math.abs(numericAmount).toLocaleString('tr-TR')} ${TL_SYMBOL}`;
}
