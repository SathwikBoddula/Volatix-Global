export function getCurrencyFromTicker(ticker: string): string {
  const t = ticker.toUpperCase();
  if (t.endsWith('.NS') || t.endsWith('.BO')) return 'INR';
  const indianTickers = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'TATAMOTORS', 'SBIN', 'WIPRO'];
  if (indianTickers.includes(t)) return 'INR';
  if (t.endsWith('.T')) return 'JPY';
  if (t.endsWith('.L')) return 'GBP';
  if (t.endsWith('.DE') || t.endsWith('.PA') || t.endsWith('.AS')) return 'EUR';
  if (t.endsWith('.HK')) return 'HKD';
  if (t.endsWith('.KS')) return 'KRW';
  if (t.endsWith('.SS') || t.endsWith('.SZ')) return 'CNY';
  return 'USD'; // default
}

export function formatPrice(value: number, ticker: string): string {
  const currency = getCurrencyFromTicker(ticker);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
