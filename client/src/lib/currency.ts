export type CurrencyCode = "CNY" | "USD" | "JPY";

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  CNY: "¥",
  USD: "$",
  JPY: "¥",
};

const CACHE_KEY = "vrcflow-exchangeRates";
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

interface CachedRates {
  timestamp: number;
  rates: Record<string, number>; // base USD
}

// Fallback rates if API is unavailable
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  CNY: 7.25,
  JPY: 149.5,
};

/** Get exchange rates (base USD). Uses cache + fallback. */
export async function getExchangeRates(): Promise<Record<string, number>> {
  // Check cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data: CachedRates = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_TTL) {
        return data.rates;
      }
    }
  } catch { /* ignore */ }

  // Fetch fresh rates
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      if (data.rates) {
        const rates: Record<string, number> = {
          USD: 1,
          CNY: data.rates.CNY ?? FALLBACK_RATES.CNY,
          JPY: data.rates.JPY ?? FALLBACK_RATES.JPY,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), rates }));
        return rates;
      }
    }
  } catch { /* ignore */ }

  return FALLBACK_RATES;
}

/** Get cached rates synchronously (for rendering). Returns fallback if no cache. */
export function getCachedRates(): Record<string, number> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data: CachedRates = JSON.parse(cached);
      return data.rates;
    }
  } catch { /* ignore */ }
  return FALLBACK_RATES;
}

/** Convert an amount from one currency to the display currency. */
export function convertCurrency(
  amount: number,
  from: "CNY" | "USD",
  to: CurrencyCode,
  rates: Record<string, number>
): number {
  if (from === to) return amount;
  // Convert to USD first, then to target
  const amountUsd = from === "USD" ? amount : amount / (rates[from] || 1);
  return to === "USD" ? amountUsd : amountUsd * (rates[to] || 1);
}

/**
 * Format currency amount with appropriate precision.
 * Small amounts (< 0.01) use more decimals to avoid showing 0.
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const abs = Math.abs(amount);

  if (abs === 0) return `${symbol}0`;
  if (abs < 0.0001) return `${symbol}${amount.toFixed(8)}`;
  if (abs < 0.01) return `${symbol}${amount.toFixed(6)}`;
  if (abs < 1) return `${symbol}${amount.toFixed(4)}`;
  return `${symbol}${amount.toFixed(2)}`;
}
